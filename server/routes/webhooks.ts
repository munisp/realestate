/**
 * Webhook Routes
 * 
 * Handles incoming webhooks from external services
 */

import express from "express";
import { handleResendWebhook, testResendWebhook } from "../webhooks/resend";

const router = express.Router();

// Resend email webhooks
router.post("/resend", express.json(), handleResendWebhook);

// Test endpoint (development only)
router.post("/resend/test", express.json(), testResendWebhook);

export default router;
