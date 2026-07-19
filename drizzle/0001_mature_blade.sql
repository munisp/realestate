CREATE TYPE "public"."alert_severity" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."verification_frequency" AS ENUM('monthly', 'quarterly', 'annually');--> statement-breakpoint
CREATE TABLE "bulk_verification_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"bulkJobId" integer NOT NULL,
	"rowNumber" integer NOT NULL,
	"cofONumber" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"ownerName" varchar(255),
	"parcelId" varchar(100),
	"verificationRequestId" integer,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"overallResult" varchar(50),
	"errorMessage" text,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bulk_verification_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestedBy" integer NOT NULL,
	"institutionName" varchar(255),
	"totalRecords" integer NOT NULL,
	"processedRecords" integer DEFAULT 0 NOT NULL,
	"successfulVerifications" integer DEFAULT 0 NOT NULL,
	"failedVerifications" integer DEFAULT 0 NOT NULL,
	"status" varchar(50) DEFAULT 'pending' NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"estimatedCompletionTime" timestamp,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"errorMessage" text,
	"resultFileUrl" varchar(500),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "scheduled_verifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"userId" integer,
	"frequency" "verification_frequency" NOT NULL,
	"nextVerificationDate" timestamp NOT NULL,
	"lastVerificationDate" timestamp,
	"lastVerificationId" integer,
	"alertOnChange" boolean DEFAULT true NOT NULL,
	"notificationEmail" varchar(255),
	"notificationPhone" varchar(20),
	"enabled" boolean DEFAULT true NOT NULL,
	"verificationCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_change_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"scheduledVerificationId" integer NOT NULL,
	"previousVerificationId" integer NOT NULL,
	"currentVerificationId" integer NOT NULL,
	"previousStatus" varchar(50) NOT NULL,
	"currentStatus" varchar(50) NOT NULL,
	"changedFields" jsonb NOT NULL,
	"severity" "alert_severity" NOT NULL,
	"notificationSent" boolean DEFAULT false NOT NULL,
	"notificationSentAt" timestamp,
	"acknowledgedBy" integer,
	"acknowledgedAt" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
