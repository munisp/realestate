/**
 * Email Delivery Logs Schema
 * 
 * Tracks email delivery attempts, retries, and failures for monitoring and debugging
 */

import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// Enum declarations
export const statusEnum_12345 = pgEnum("status", ["pending", "sent", "failed", "retrying"]);


export const emailDeliveryLogs = pgTable("email_delivery_logs", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  
  // Email details
  recipient: varchar("recipient", { length: 320 }).notNull(),
  subject: varchar("subject", { length: 500 }).notNull(),
  
  // Delivery status
  status: statusEnum_12345("status").notNull().default("pending"),
  
  // Retry tracking
  attempts: integer("attempts").notNull().default(0),
  lastAttemptAt: timestamp("lastAttemptAt").notNull(),
  
  // Success/failure details
  messageId: varchar("messageId", { length: 255 }),
  errorMessage: text("errorMessage"),
  
  // Metadata
  emailType: varchar("emailType", { length: 100 }), // e.g., "appointment-confirmation", "offer-update"
  userId: integer("userId"), // Optional: link to user who triggered the email
  
  // Timestamps
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
});

export type EmailDeliveryLog = typeof emailDeliveryLogs.$inferSelect;
export type InsertEmailDeliveryLog = typeof emailDeliveryLogs.$inferInsert;
