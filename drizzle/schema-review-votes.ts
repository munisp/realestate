import { integer, pgTable, serial, timestamp, boolean } from "drizzle-orm/pg-core";

// Review helpful votes tracking
export const reviewVotes = pgTable("reviewVotes", {
  id: serial("id").primaryKey(),
  reviewId: integer("reviewId").notNull(),
  userId: integer("userId").notNull(),
  isHelpful: boolean("isHelpful").notNull(), // true = helpful, false = not helpful
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ReviewVote = typeof reviewVotes.$inferSelect;
export type InsertReviewVote = typeof reviewVotes.$inferInsert;
