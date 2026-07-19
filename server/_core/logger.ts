/**
 * Structured Logger
 *
 * Provides a consistent logging interface across the server.
 * - In production: emits newline-delimited JSON (compatible with Loki, Datadog, CloudWatch)
 * - In development: emits human-readable coloured output
 *
 * Usage:
 *   import { logger } from "./_core/logger";
 *   logger.info("User signed in", { userId: "abc123", method: "keycloak" });
 *   logger.error("Payment failed", { error: err.message, transactionId: "txn_1" });
 */

type LogLevel = "debug" | "info" | "warn" | "error";

interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  service: string;
  environment: string;
  [key: string]: unknown;
}

const IS_PRODUCTION = process.env.NODE_ENV === "production";
const SERVICE_NAME = process.env.SERVICE_NAME ?? "realestate-platform";
const LOG_LEVEL: LogLevel = (process.env.LOG_LEVEL as LogLevel) ?? (IS_PRODUCTION ? "info" : "debug");

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

const LEVEL_COLOURS: Record<LogLevel, string> = {
  debug: "\x1b[36m", // cyan
  info: "\x1b[32m",  // green
  warn: "\x1b[33m",  // yellow
  error: "\x1b[31m", // red
};
const RESET = "\x1b[0m";

function shouldLog(level: LogLevel): boolean {
  return LEVEL_ORDER[level] >= LEVEL_ORDER[LOG_LEVEL];
}

function formatDev(entry: LogEntry): string {
  const colour = LEVEL_COLOURS[entry.level];
  const { level, message, timestamp, service, environment, ...rest } = entry;
  const extras = Object.keys(rest).length > 0 ? " " + JSON.stringify(rest) : "";
  return `${colour}[${level.toUpperCase()}]${RESET} ${timestamp} ${message}${extras}`;
}

function emit(level: LogLevel, message: string, context?: Record<string, unknown>): void {
  if (!shouldLog(level)) return;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    service: SERVICE_NAME,
    environment: process.env.NODE_ENV ?? "development",
    ...context,
  };

  const output = IS_PRODUCTION ? JSON.stringify(entry) : formatDev(entry);

  if (level === "error") {
    console.error(output);
  } else if (level === "warn") {
    console.warn(output);
  } else {
    console.log(output);
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export const logger = {
  debug(message: string, context?: Record<string, unknown>): void {
    emit("debug", message, context);
  },
  info(message: string, context?: Record<string, unknown>): void {
    emit("info", message, context);
  },
  warn(message: string, context?: Record<string, unknown>): void {
    emit("warn", message, context);
  },
  error(message: string, context?: Record<string, unknown>): void {
    emit("error", message, context);
  },
  /**
   * Creates a child logger with pre-bound context fields.
   * @example
   * const log = logger.child({ requestId: req.id, userId: user.openId });
   * log.info("Processing payment");
   */
  child(boundContext: Record<string, unknown>) {
    return {
      debug: (msg: string, ctx?: Record<string, unknown>) => emit("debug", msg, { ...boundContext, ...ctx }),
      info:  (msg: string, ctx?: Record<string, unknown>) => emit("info",  msg, { ...boundContext, ...ctx }),
      warn:  (msg: string, ctx?: Record<string, unknown>) => emit("warn",  msg, { ...boundContext, ...ctx }),
      error: (msg: string, ctx?: Record<string, unknown>) => emit("error", msg, { ...boundContext, ...ctx }),
    };
  },
};

// ── HTTP Request Logger Middleware ───────────────────────────────────────────

import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

/**
 * Express middleware that logs every HTTP request with timing and status code.
 * Attaches a unique `requestId` to each request for distributed tracing.
 */
export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const requestId = (req.headers["x-request-id"] as string) ?? randomUUID();
  const startTime = Date.now();

  // Attach requestId to request for downstream use
  (req as Request & { requestId: string }).requestId = requestId;
  res.setHeader("X-Request-ID", requestId);

  res.on("finish", () => {
    const duration = Date.now() - startTime;
    const level: LogLevel = res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info";

    emit(level, "HTTP request", {
      requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      durationMs: duration,
      userAgent: req.headers["user-agent"],
      ip: req.ip ?? req.socket.remoteAddress,
    });
  });

  next();
}
