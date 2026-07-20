import express from 'express';
import { handleStripeWebhook } from '../webhooks/stripe';
import { logger } from "./logger";

export function setupStripeWebhook(app: express.Application) {
  // Stripe webhook endpoint - must use raw body
  app.post(
    '/api/webhooks/stripe',
    express.raw({ type: 'application/json' }),
    handleStripeWebhook
  );

  logger.info('[Stripe] Webhook endpoint registered at /api/webhooks/stripe');
}
