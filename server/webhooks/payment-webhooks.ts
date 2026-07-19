import { Router } from "express";
import Stripe from "stripe";
import crypto from "crypto";
import { getDb } from "../db";
import { transactions, payments, projectMilestones, builderProjects } from "../../drizzle/schema";
import { eq, and } from "drizzle-orm";

const router = Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2025-10-29.clover",
});

/**
 * Stripe Webhook Handler
 * Handles payment events from Stripe
 */
router.post("/stripe", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  
  if (!sig) {
    return res.status(400).send("No signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET || ""
    );
  } catch (err: any) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).send("Database unavailable");
  }

  try {
    switch (event.type) {
      case "payment_intent.succeeded": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const transactionId = paymentIntent.metadata.transactionId;
        
        if (transactionId) {
          // Update payment status
          await db
            .update(payments)
            .set({
              status: "completed",
              gatewayTransactionId: paymentIntent.id,
            })
            .where(eq(payments.transactionId, Number(transactionId)));

          // Update transaction status
          await db
            .update(transactions)
            .set({ status: "completed" })
            .where(eq(transactions.id, Number(transactionId)));

          console.log(`Payment completed for transaction ${transactionId}`);
        }
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        const transactionId = paymentIntent.metadata.transactionId;
        
        if (transactionId) {
          await db
            .update(payments)
            .set({ status: "failed" })
            .where(eq(payments.transactionId, Number(transactionId)));

          console.log(`Payment failed for transaction ${transactionId}`);
        }
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const transactionId = charge.metadata.transactionId;
        
        if (transactionId) {
          await db
            .update(payments)
            .set({ status: "refunded" })
            .where(eq(payments.transactionId, Number(transactionId)));

          console.log(`Payment refunded for transaction ${transactionId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled Stripe event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error("Error processing Stripe webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
});

/**
 * Flutterwave Webhook Handler
 * Handles payment events from Flutterwave
 */
router.post("/flutterwave", async (req, res) => {
  const secretHash = process.env.FLUTTERWAVE_SECRET_HASH;
  const signature = req.headers["verif-hash"];

  if (!signature || signature !== secretHash) {
    return res.status(401).send("Invalid signature");
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).send("Database unavailable");
  }

  try {
    const payload = req.body;
    const { event, data } = payload;

    switch (event) {
      case "charge.completed": {
        const transactionId = data.tx_ref; // Transaction reference should contain transactionId
        
        if (transactionId && data.status === "successful") {
          await db
            .update(payments)
            .set({
              status: "completed",
              gatewayTransactionId: data.id.toString(),
            })
            .where(eq(payments.transactionId, Number(transactionId)));

          await db
            .update(transactions)
            .set({ status: "completed" })
            .where(eq(transactions.id, Number(transactionId)));

          console.log(`Flutterwave payment completed for transaction ${transactionId}`);
        }
        break;
      }

      case "charge.failed": {
        const transactionId = data.tx_ref;
        
        if (transactionId) {
          await db
            .update(payments)
            .set({ status: "failed" })
            .where(eq(payments.transactionId, Number(transactionId)));

          console.log(`Flutterwave payment failed for transaction ${transactionId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled Flutterwave event type: ${event}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Flutterwave webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
});

/**
 * Paystack Webhook Handler
 * Handles payment events from Paystack
 */
router.post("/paystack", async (req, res) => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_SECRET_KEY || "")
    .update(JSON.stringify(req.body))
    .digest("hex");

  if (hash !== req.headers["x-paystack-signature"]) {
    return res.status(401).send("Invalid signature");
  }

  const db = await getDb();
  if (!db) {
    return res.status(500).send("Database unavailable");
  }

  try {
    const { event, data } = req.body;

    switch (event) {
      case "charge.success": {
        const transactionId = data.metadata.transactionId;
        
        if (transactionId) {
          await db
            .update(payments)
            .set({
              status: "completed",
              gatewayTransactionId: data.reference,
            })
            .where(eq(payments.transactionId, Number(transactionId)));

          await db
            .update(transactions)
            .set({ status: "completed" })
            .where(eq(transactions.id, Number(transactionId)));

          console.log(`Paystack payment completed for transaction ${transactionId}`);
        }
        break;
      }

      case "charge.failed": {
        const transactionId = data.metadata.transactionId;
        
        if (transactionId) {
          await db
            .update(payments)
            .set({ status: "failed" })
            .where(eq(payments.transactionId, Number(transactionId)));

          console.log(`Paystack payment failed for transaction ${transactionId}`);
        }
        break;
      }

      case "refund.processed": {
        const transactionId = data.metadata.transactionId;
        
        if (transactionId) {
          await db
            .update(payments)
            .set({ status: "refunded" })
            .where(eq(payments.transactionId, Number(transactionId)));

          console.log(`Paystack payment refunded for transaction ${transactionId}`);
        }
        break;
      }

      default:
        console.log(`Unhandled Paystack event type: ${event}`);
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error processing Paystack webhook:", error);
    res.status(500).send("Webhook processing failed");
  }
});

/**
 * Milestone Verification Handler
 * Releases escrow funds when milestone is verified
 */
export async function releaseMilestonePayment(milestoneId: number) {
  const db = await getDb();
  if (!db) {
    throw new Error("Database unavailable");
  }

  // Get milestone details
  const [milestone] = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.id, milestoneId));

  if (!milestone || milestone.status !== "completed") {
    throw new Error("Milestone not completed or not found");
  }

  // Find associated transaction and payment
  const [transaction] = await db
    .select()
    .from(transactions)
    .where(eq(transactions.propertyId, milestone.projectId));

  if (!transaction) {
    throw new Error("Transaction not found for this project");
  }

  // Get payment details
  const [payment] = await db
    .select()
    .from(payments)
    .where(
      and(
        eq(payments.transactionId, transaction.id),
        eq(payments.status, "escrow")
      )
    );

  if (!payment) {
    throw new Error("No escrow payment found");
  }

  // Calculate release amount based on milestone percentage
  const totalMilestones = await db
    .select()
    .from(projectMilestones)
    .where(eq(projectMilestones.projectId, milestone.projectId));

  const releasePercentage = 1 / totalMilestones.length;
  const releaseAmount = payment.amount * releasePercentage;

  // Update payment status
  await db
    .update(payments)
    .set({
      status: "released",
      releasedAt: new Date(),
    })
    .where(eq(payments.id, payment.id));

  console.log(`Released ${releaseAmount} for milestone ${milestoneId}`);

  return {
    milestoneId,
    releaseAmount,
    releasedAt: new Date(),
  };
}

export default router;
