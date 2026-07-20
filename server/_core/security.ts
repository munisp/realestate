/**
 * Security Middleware
 * 
 * Provides HTTP security headers, CORS, rate limiting, and request sanitization.
 * This module MUST be imported and applied in index.ts before all other routes.
 */
import { Request, Response, NextFunction, Application } from "express";
import { ENV } from "./env";
import { logger } from "./logger";

// ─── Security Headers ────────────────────────────────────────────────────────

/**
 * Apply HTTP security headers to every response.
 * Replaces the `helmet` package with an inline implementation to avoid
 * adding a new dependency.
 */
export function applySecurityHeaders(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Prevent MIME-type sniffing
  res.setHeader("X-Content-Type-Options", "nosniff");
  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");
  // Enable XSS filter in older browsers
  res.setHeader("X-XSS-Protection", "1; mode=block");
  // Enforce HTTPS for 1 year (including subdomains)
  if (ENV.isProduction) {
    res.setHeader(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }
  // Content Security Policy
  const cspDirectives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://maps.googleapis.com",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.stripe.com https://maps.googleapis.com wss:",
    "frame-src https://js.stripe.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
  res.setHeader("Content-Security-Policy", cspDirectives);
  // Prevent referrer leakage
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // Restrict browser features
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(self), payment=(self)"
  );
  // Remove server fingerprint
  res.removeHeader("X-Powered-By");
  next();
}

// ─── CORS ────────────────────────────────────────────────────────────────────

const ALLOWED_ORIGINS_PROD = (process.env.ALLOWED_ORIGINS ?? "")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

const ALLOWED_ORIGINS_DEV = [
  "http://localhost:3000",
  "http://localhost:5173",
  "http://127.0.0.1:3000",
];

export function applyCORS(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const origin = req.headers.origin ?? "";
  const allowedOrigins = ENV.isProduction
    ? ALLOWED_ORIGINS_PROD
    : ALLOWED_ORIGINS_DEV;

  if (allowedOrigins.includes(origin) || !ENV.isProduction) {
    res.setHeader("Access-Control-Allow-Origin", origin || "*");
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader(
      "Access-Control-Allow-Methods",
      "GET,POST,PUT,PATCH,DELETE,OPTIONS"
    );
    res.setHeader(
      "Access-Control-Allow-Headers",
      "Content-Type,Authorization,X-Requested-With,X-CSRF-Token"
    );
    res.setHeader("Access-Control-Max-Age", "86400");
  }

  if (req.method === "OPTIONS") {
    res.sendStatus(204);
    return;
  }

  next();
}

// ─── Rate Limiting ───────────────────────────────────────────────────────────

interface RateLimitStore {
  [key: string]: { count: number; resetAt: number };
}

const rateLimitStore: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const key of Object.keys(rateLimitStore)) {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  }
}, 5 * 60 * 1000);

/**
 * General API rate limiter: 100 requests per minute per IP.
 */
export function apiRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const maxRequests = parseInt(process.env.RATE_LIMIT_REQUESTS ?? "100", 10);
  const windowMs = parseInt(process.env.RATE_LIMIT_WINDOW ?? "60", 10) * 1000;

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";

  const key = `api:${ip}`;
  const now = Date.now();

  if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
    rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
  } else {
    rateLimitStore[key].count += 1;
  }

  const { count, resetAt } = rateLimitStore[key];
  const remaining = Math.max(0, maxRequests - count);

  res.setHeader("X-RateLimit-Limit", maxRequests);
  res.setHeader("X-RateLimit-Remaining", remaining);
  res.setHeader("X-RateLimit-Reset", Math.ceil(resetAt / 1000));

  if (count > maxRequests) {
    res.status(429).json({
      error: "Too Many Requests",
      message: "Rate limit exceeded. Please try again later.",
      retryAfter: Math.ceil((resetAt - now) / 1000),
    });
    return;
  }

  next();
}

/**
 * Strict rate limiter for auth endpoints: 10 requests per minute per IP.
 */
export function authRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const maxRequests = 10;
  const windowMs = 60 * 1000;

  const ip =
    (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
    req.socket.remoteAddress ??
    "unknown";

  const key = `auth:${ip}`;
  const now = Date.now();

  if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
    rateLimitStore[key] = { count: 1, resetAt: now + windowMs };
  } else {
    rateLimitStore[key].count += 1;
  }

  if (rateLimitStore[key].count > maxRequests) {
    res.status(429).json({
      error: "Too Many Requests",
      message: "Too many authentication attempts. Please try again in 1 minute.",
    });
    return;
  }

  next();
}

// ─── Request Sanitization ────────────────────────────────────────────────────

/**
 * Strip null bytes and excessively long header values to prevent header injection.
 */
export function sanitizeRequest(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  // Remove null bytes from query strings
  for (const key of Object.keys(req.query)) {
    const val = req.query[key];
    if (typeof val === "string") {
      req.query[key] = val.replace(/\0/g, "");
    }
  }
  next();
}

// ─── Health Check ────────────────────────────────────────────────────────────

/**
 * Register /health and /ready endpoints on the Express app.
 * These are used by Kubernetes liveness and readiness probes.
 */
export function registerHealthEndpoints(app: Application): void {
  app.get("/health", (_req: Request, res: Response) => {
    res.status(200).json({
      status: "healthy",
      service: "realestate-platform",
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION ?? "unknown",
    });
  });

  app.get("/ready", async (_req: Request, res: Response) => {
    try {
      // Import lazily to avoid circular deps
      const { getDb } = await import("../db");
      const db = await getDb();
      if (!db) {
        res.status(503).json({ status: "not ready", reason: "database unavailable" });
        return;
      }
      res.status(200).json({ status: "ready", timestamp: new Date().toISOString() });
    } catch {
      res.status(503).json({ status: "not ready", reason: "internal error" });
    }
  });

  // Prometheus-compatible /metrics endpoint (process metrics)
  app.get("/metrics", (_req: Request, res: Response) => {
    const mem = process.memoryUsage();
    const uptime = process.uptime();
    const metrics = [
      `# HELP process_uptime_seconds Process uptime in seconds`,
      `# TYPE process_uptime_seconds gauge`,
      `process_uptime_seconds ${uptime.toFixed(3)}`,
      `# HELP process_heap_used_bytes Heap memory used`,
      `# TYPE process_heap_used_bytes gauge`,
      `process_heap_used_bytes ${mem.heapUsed}`,
      `# HELP process_heap_total_bytes Total heap memory`,
      `# TYPE process_heap_total_bytes gauge`,
      `process_heap_total_bytes ${mem.heapTotal}`,
      `# HELP process_rss_bytes Resident set size`,
      `# TYPE process_rss_bytes gauge`,
      `process_rss_bytes ${mem.rss}`,
      `# HELP process_external_bytes External memory`,
      `# TYPE process_external_bytes gauge`,
      `process_external_bytes ${mem.external}`,
    ].join("\n");
    res.setHeader("Content-Type", "text/plain; version=0.0.4");
    res.status(200).send(metrics + "\n");
  });
}

// ─── Graceful Shutdown ───────────────────────────────────────────────────────

export function registerGracefulShutdown(
  server: import("http").Server
): void {
  let isShuttingDown = false;

  const shutdown = (signal: string) => {
    if (isShuttingDown) return;
    isShuttingDown = true;

    logger.info(`[Server] ${signal} received – starting graceful shutdown`);

    server.close(async () => {
      logger.info("[Server] HTTP server closed");
      try {
        const { getDb } = await import("../db");
        const db = await getDb();
        if (db) {
          // Drizzle does not expose a close method; the underlying pg Pool does.
          // @ts-ignore – access the internal pool if available
          await (db as any).$client?.end?.();
          logger.info("[Server] Database pool closed");
        }
      } catch (err) {
        logger.error("[Server] Error during shutdown:", { error: String(err) });
      }
      process.exit(0);
    });

    // Force exit after 30 s if graceful shutdown stalls
    setTimeout(() => {
      logger.error("[Server] Graceful shutdown timed out – forcing exit");
      process.exit(1);
    }, 30_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("[Server] Uncaught exception:", { error: String(err) });
    shutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("[Server] Unhandled rejection:", { error: String(reason) });
    shutdown("unhandledRejection");
  });
}
