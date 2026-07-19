import { integer, pgEnum, pgTable, text, timestamp, varchar } from "drizzle-orm/pg-core";

// ==================== ENUM DEFINITIONS ====================
// PostgreSQL requires enums to be declared separately before use

export const statusEnum_06055 = pgEnum("status", [
    "queued",
    "sent",
    "delivered",
    "opened",
    "clicked",
    "bounced",
    "complained",
    "failed",
  ]);

// ==================== TABLE DEFINITIONS ====================


/**
 * Email Delivery Log
 * Tracks all emails sent through the platform with delivery status
 */
export const emailDeliveryLog = pgTable("email_delivery_log", {
  id: integer("id").generatedAlwaysAsIdentity().primaryKey(),
  recipientEmail: varchar("recipient_email", { length: 320 }).notNull(),
  subject: text("subject").notNull(),
  provider: varchar("provider", { length: 50 }).notNull(), // 'resend', 'sendgrid', 'aws-ses'
  messageId: varchar("message_id", { length: 255 }),
  status: statusEnum_06055("status").notNull().default("queued"),
  error: text("error"),
  metadata: text("metadata"), // JSON string with additional data
  sentAt: timestamp("sent_at").notNull(),
  deliveredAt: timestamp("delivered_at"),
  openedAt: timestamp("opened_at"),
  clickedAt: timestamp("clicked_at"),
  bouncedAt: timestamp("bounced_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type EmailDeliveryLog = typeof emailDeliveryLog.$inferSelect;
export type InsertEmailDeliveryLog = typeof emailDeliveryLog.$inferInsert;
