/**
 * Unified Payment Gateway Integration
 * Supports: Stripe, Flutterwave, Paystack, Mojaloop, TigerBeetle
 */

import Stripe from "stripe";
import { ENV } from "../_core/env";

// Payment gateway types
export type PaymentGateway = "stripe" | "flutterwave" | "paystack" | "mojaloop" | "tigerbeetle";

export type PaymentMethod = "card" | "bank_transfer" | "ussd" | "mobile_money" | "crypto";

export interface PaymentIntent {
  id: string;
  amount: number;
  currency: string;
  status: "pending" | "processing" | "succeeded" | "failed" | "canceled";
  gateway: PaymentGateway;
  metadata?: Record<string, any>;
  clientSecret?: string;
}

export interface EscrowPayment {
  id: string;
  amount: number;
  currency: string;
  status: "held" | "released" | "refunded";
  milestoneId?: number;
  releaseDate?: Date;
  gateway: PaymentGateway;
}

// ============================================================================
// Stripe Integration
// ============================================================================

let stripeClient: Stripe | null = null;

function getStripeClient(): Stripe {
  if (!stripeClient && process.env.STRIPE_SECRET_KEY) {
    stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2025-10-29.clover",
    });
  }
  if (!stripeClient) {
    throw new Error("Stripe is not configured");
  }
  return stripeClient;
}

export async function createStripePaymentIntent(params: {
  amount: number;
  currency: string;
  metadata?: Record<string, any>;
}): Promise<PaymentIntent> {
  const stripe = getStripeClient();
  
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(params.amount * 100), // Convert to cents
    currency: params.currency.toLowerCase(),
    metadata: params.metadata || {},
    automatic_payment_methods: {
      enabled: true,
    },
  });

  return {
    id: paymentIntent.id,
    amount: params.amount,
    currency: params.currency,
    status: paymentIntent.status === "succeeded" ? "succeeded" : "pending",
    gateway: "stripe",
    metadata: params.metadata,
    clientSecret: paymentIntent.client_secret || undefined,
  };
}

export async function createStripeEscrow(params: {
  amount: number;
  currency: string;
  builderId: number;
  projectId: number;
  milestoneId?: number;
}): Promise<EscrowPayment> {
  const stripe = getStripeClient();
  
  // Create a payment intent with manual capture for escrow
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(params.amount * 100),
    currency: params.currency.toLowerCase(),
    capture_method: "manual", // Hold funds until milestone verification
    metadata: {
      type: "escrow",
      builderId: params.builderId.toString(),
      projectId: params.projectId.toString(),
      milestoneId: params.milestoneId?.toString() || "",
    },
  });

  return {
    id: paymentIntent.id,
    amount: params.amount,
    currency: params.currency,
    status: "held",
    milestoneId: params.milestoneId,
    gateway: "stripe",
  };
}

export async function releaseStripeEscrow(paymentIntentId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.paymentIntents.capture(paymentIntentId);
}

export async function refundStripeEscrow(paymentIntentId: string): Promise<void> {
  const stripe = getStripeClient();
  await stripe.refunds.create({
    payment_intent: paymentIntentId,
  });
}

// ============================================================================
// Flutterwave Integration
// ============================================================================

export async function createFlutterwavePayment(params: {
  amount: number;
  currency: string;
  email: string;
  metadata?: Record<string, any>;
}): Promise<PaymentIntent> {
  // Flutterwave API integration
  const response = await fetch("https://api.flutterwave.com/v3/payments", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.FLUTTERWAVE_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: `tx-${Date.now()}`,
      amount: params.amount,
      currency: params.currency,
      redirect_url: `${process.env.VITE_APP_URL}/payment/callback`,
      customer: {
        email: params.email,
      },
      customizations: {
        title: "Property Payment",
        description: "Real Estate Transaction",
      },
      meta: params.metadata,
    }),
  });

  const data = await response.json();

  return {
    id: data.data.id,
    amount: params.amount,
    currency: params.currency,
    status: "pending",
    gateway: "flutterwave",
    metadata: params.metadata,
    clientSecret: data.data.link, // Payment link
  };
}

// ============================================================================
// Paystack Integration
// ============================================================================

export async function createPaystackPayment(params: {
  amount: number;
  currency: string;
  email: string;
  metadata?: Record<string, any>;
}): Promise<PaymentIntent> {
  // Paystack API integration
  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email: params.email,
      amount: Math.round(params.amount * 100), // Convert to kobo
      currency: params.currency,
      metadata: params.metadata,
      callback_url: `${process.env.VITE_APP_URL}/payment/callback`,
    }),
  });

  const data = await response.json();

  return {
    id: data.data.reference,
    amount: params.amount,
    currency: params.currency,
    status: "pending",
    gateway: "paystack",
    metadata: params.metadata,
    clientSecret: data.data.authorization_url, // Payment URL
  };
}

// ============================================================================
// Mojaloop Integration (for interoperable payments)
// ============================================================================

export async function createMojaloopTransfer(params: {
  amount: number;
  currency: string;
  payerFspId: string;
  payeeFspId: string;
  metadata?: Record<string, any>;
}): Promise<PaymentIntent> {
  // Mojaloop API integration
  // This is a simplified example - actual implementation requires full Mojaloop setup
  
  const transferId = `ml-${Date.now()}`;
  
  // In production, this would call the Mojaloop API
  // For now, return a mock payment intent
  return {
    id: transferId,
    amount: params.amount,
    currency: params.currency,
    status: "pending",
    gateway: "mojaloop",
    metadata: params.metadata,
  };
}

// ============================================================================
// TigerBeetle Integration (for ledger management)
// ============================================================================

export interface TigerBeetleAccount {
  id: bigint;
  ledger: number;
  code: number;
  flags: number;
  debits_pending: bigint;
  debits_posted: bigint;
  credits_pending: bigint;
  credits_posted: bigint;
}

export interface TigerBeetleTransfer {
  id: bigint;
  debit_account_id: bigint;
  credit_account_id: bigint;
  amount: bigint;
  ledger: number;
  code: number;
  flags: number;
}

// TigerBeetle client would be initialized here
// For now, providing interface definitions

export async function createTigerBeetleEscrowAccount(params: {
  userId: number;
  projectId: number;
}): Promise<TigerBeetleAccount> {
  // In production, this would create an account in TigerBeetle
  // TigerBeetle provides high-performance ledger for tracking balances
  
  return {
    id: BigInt(Date.now()),
    ledger: 1, // Escrow ledger
    code: 1001, // Account type code
    flags: 0,
    debits_pending: BigInt(0),
    debits_posted: BigInt(0),
    credits_pending: BigInt(0),
    credits_posted: BigInt(0),
  };
}

export async function createTigerBeetleTransfer(params: {
  fromAccountId: bigint;
  toAccountId: bigint;
  amount: number;
  ledger: number;
}): Promise<TigerBeetleTransfer> {
  // In production, this would create a transfer in TigerBeetle
  
  return {
    id: BigInt(Date.now()),
    debit_account_id: params.fromAccountId,
    credit_account_id: params.toAccountId,
    amount: BigInt(Math.round(params.amount * 100)),
    ledger: params.ledger,
    code: 1, // Transfer code
    flags: 0,
  };
}

// ============================================================================
// Unified Payment Interface
// ============================================================================

export async function createPayment(params: {
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  email?: string;
  metadata?: Record<string, any>;
}): Promise<PaymentIntent> {
  switch (params.gateway) {
    case "stripe":
      return createStripePaymentIntent({
        amount: params.amount,
        currency: params.currency,
        metadata: params.metadata,
      });
    
    case "flutterwave":
      if (!params.email) throw new Error("Email required for Flutterwave");
      return createFlutterwavePayment({
        amount: params.amount,
        currency: params.currency,
        email: params.email,
        metadata: params.metadata,
      });
    
    case "paystack":
      if (!params.email) throw new Error("Email required for Paystack");
      return createPaystackPayment({
        amount: params.amount,
        currency: params.currency,
        email: params.email,
        metadata: params.metadata,
      });
    
    case "mojaloop":
      throw new Error("Mojaloop requires additional parameters");
    
    case "tigerbeetle":
      throw new Error("TigerBeetle requires account setup");
    
    default:
      throw new Error(`Unsupported payment gateway: ${params.gateway}`);
  }
}

export async function createEscrowPayment(params: {
  gateway: PaymentGateway;
  amount: number;
  currency: string;
  builderId: number;
  projectId: number;
  milestoneId?: number;
}): Promise<EscrowPayment> {
  switch (params.gateway) {
    case "stripe":
      return createStripeEscrow(params);
    
    default:
      throw new Error(`Escrow not yet implemented for ${params.gateway}`);
  }
}
