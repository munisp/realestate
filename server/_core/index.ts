import "dotenv/config";
import express from "express";
import { logger } from "./logger";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { requestLogger } from "./logger";
import { monitoring } from "./monitoring";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { serveStatic, setupVite } from "./vite";
import {
  applySecurityHeaders,
  applyCORS,
  apiRateLimit,
  authRateLimit,
  sanitizeRequest,
  registerHealthEndpoints,
  registerGracefulShutdown,
} from "./security";

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise(resolve => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ── Security middleware (must be first) ──────────────────────────────────
  app.use(applySecurityHeaders);
  app.use(applyCORS);
  app.use(sanitizeRequest);
  // ── Structured request logging ───────────────────────────────────────────
  app.use(requestLogger);

  // ── Health / readiness probes (before rate limiting so k8s probes pass) ──
  registerHealthEndpoints(app);

  // ── Rate limiting ────────────────────────────────────────────────────────
  app.use("/api/trpc", apiRateLimit);
  app.use("/api/oauth", authRateLimit);

  // CRITICAL: Stripe webhook MUST be registered BEFORE express.json()
  // Import and register webhook routes
  const { stripeWebhookRouter } = await import('../stripe-webhook');
  app.use(stripeWebhookRouter);
  
  // Payment gateway webhooks
  const paymentWebhooks = await import('../webhooks/payment-webhooks');
  app.use('/api/webhooks', paymentWebhooks.default);
  
  // Email service webhooks
  const emailWebhooks = await import('../routes/webhooks');
  app.use('/api/webhooks', emailWebhooks.default);
  
  // Configure body parser – 10 MB is sufficient for most payloads
  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ limit: "10mb", extended: true }));
  // OAuth callback under /api/oauth/callback
  registerOAuthRoutes(app);

  // ── Sentry / Monitoring (must be after routes, before error handler) ──────
  monitoring.initialize();
  if (monitoring.requestHandler) {
    app.use(monitoring.requestHandler());
  }

  // tRPC API
  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    })
  );
  // development mode uses Vite, production mode uses static files
  if (process.env.NODE_ENV === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    logger.info(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Initialize Socket.IO for real-time features
  const { initializeSocketIO } = await import('../realtime');
  initializeSocketIO(server);
  
  // Initialize Live Property Feed WebSocket service
  const { livePropertyFeedService } = await import('../services/livePropertyFeedService');
  livePropertyFeedService.initialize(server);
  
  // Start valuation monitoring scheduled job
  const { startValuationMonitoringSchedule } = await import('../jobs/valuationMonitoringJob');
  startValuationMonitoringSchedule();
  
  // Start valuation alert scheduler (daily at 9 AM)
  const { startValuationAlertScheduler } = await import('../jobs/valuationAlertScheduler');
  startValuationAlertScheduler();
  
  // Initialize monitoring scheduled jobs
  const { initializeScheduledJobs } = await import('../jobs/scheduledJobs');
  initializeScheduledJobs();
  
  // Start competitor tracking scheduler (daily price checks + weekly summaries)
  const { startCompetitorTrackingScheduler } = await import('../schedulers/competitorTrackingScheduler');
  startCompetitorTrackingScheduler();

  // ── Redis connection ──────────────────────────────────────────────────────
  try {
    const { redis } = await import('./../_core/redis');
    await redis.ping();
    logger.info('[Redis] Connected successfully');
  } catch (err) {
    logger.warn('[Redis] Not available — caching disabled', { error: String(err) });
  }

  // ── Kafka consumer group ──────────────────────────────────────────────────
  try {
    const { kafkaConsumer, registerDefaultKafkaHandlers } = await import('./../_core/kafkaConsumer');
    await registerDefaultKafkaHandlers();
    await kafkaConsumer.start();
  } catch (err) {
    logger.warn('[Kafka] Consumer startup failed — events will not be consumed', { error: String(err) });
  }

  // ── Fluvio consumer ───────────────────────────────────────────────────────
  try {
    const { fluvioConsumer, registerDefaultFluvioHandlers } = await import('../services/fluvioConsumer');
    await registerDefaultFluvioHandlers();
    await fluvioConsumer.start();
  } catch (err) {
    logger.warn('[Fluvio] Consumer startup failed — streaming events disabled', { error: String(err) });
  }

  // ── Mojaloop webhook receiver ─────────────────────────────────────────────
  app.post('/api/webhooks/mojaloop', (req, res) => {
    try {
      import('../payments/providers/MojalooProvider').then(({ handleMojaloopCallback }) => {
        handleMojaloopCallback(req.body as Record<string, unknown>);
        res.status(200).json({ received: true });
      }).catch((err: Error) => {
        logger.error('[Mojaloop] Webhook handler error', { error: String(err) });
        res.status(500).json({ error: 'Webhook processing failed' });
      });
    } catch (err) {
      logger.error('[Mojaloop] Webhook error', { error: String(err) });
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  });

  server.listen(port, () => {
    logger.info(`Server running on http://localhost:${port}/`);
  });

  // ── Global error handler (must be last middleware) ──────────────────────
  app.use(globalErrorHandler);

  // ── Graceful shutdown ────────────────────────────────────────────────────
  registerGracefulShutdown(server);
}

// ── Global Express error handler ─────────────────────────────────────────────
// Must be registered after all routes. Catches any unhandled errors thrown
// inside route handlers and returns a clean JSON response.
function globalErrorHandler(
  err: Error & { status?: number; statusCode?: number },
  _req: import("express").Request,
  res: import("express").Response,
  _next: import("express").NextFunction
): void {
  const status = err.status ?? err.statusCode ?? 500;
  const message =
    process.env.NODE_ENV === "production" && status === 500
      ? "Internal server error"
      : err.message ?? "Internal server error";
  logger.error("[Error]", { error: String(err) });
  res.status(status).json({ error: message });
}

startServer().catch(console.error);
