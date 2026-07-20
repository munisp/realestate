import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// ── Per-IP in-memory rate limiter for public tRPC procedures ─────────────────
// Public procedures are unauthenticated and therefore higher risk for abuse.
// Limit: 60 calls/minute per IP (sliding window).
const publicRateLimitStore = new Map<string, { count: number; resetAt: number }>();

const publicRateLimit = t.middleware(async ({ ctx, next, path }) => {
  const ip = (ctx as any).req?.ip ?? (ctx as any).req?.socket?.remoteAddress ?? "unknown";
  const key = `${ip}:${path}`;
  const now = Date.now();
  const windowMs = 60_000;  // 1 minute
  const maxRequests = 60;

  const entry = publicRateLimitStore.get(key);
  if (!entry || entry.resetAt < now) {
    publicRateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
  } else {
    entry.count += 1;
    if (entry.count > maxRequests) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)}s.`,
      });
    }
  }

  // Prune old entries periodically (1% chance per call)
  if (Math.random() < 0.01) {
    const nowPrune = Date.now();
    for (const [k, v] of publicRateLimitStore.entries()) {
      if (v.resetAt < nowPrune) publicRateLimitStore.delete(k);
    }
  }

  return next();
});

/**
 * Rate-limited public procedure — use for all unauthenticated endpoints.
 * Allows 60 calls/minute per IP per procedure path.
 */
export const rateLimitedPublicProcedure = t.procedure.use(publicRateLimit);
