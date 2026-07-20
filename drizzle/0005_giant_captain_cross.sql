CREATE TABLE "app_versions" (
	"id" serial PRIMARY KEY NOT NULL,
	"version" varchar(50) NOT NULL,
	"buildHash" varchar(64) NOT NULL,
	"environment" varchar(50) DEFAULT 'production' NOT NULL,
	"deployedAt" timestamp DEFAULT now() NOT NULL,
	"deployedBy" varchar(255),
	"changelog" text,
	"isActive" boolean DEFAULT true NOT NULL,
	"rollbackVersion" varchar(50),
	"metadata" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" varchar(255),
	"action" varchar(100) NOT NULL,
	"resource" varchar(100) NOT NULL,
	"resourceId" varchar(255),
	"ipAddress" varchar(45),
	"userAgent" text,
	"metadata" jsonb,
	"success" boolean DEFAULT true NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fluvio_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" varchar(255) NOT NULL,
	"topic" varchar(255) NOT NULL,
	"partition" integer DEFAULT 0 NOT NULL,
	"offset" integer,
	"payload" jsonb NOT NULL,
	"source" varchar(100),
	"status" varchar(50) DEFAULT 'published' NOT NULL,
	"processedAt" timestamp,
	"errorMessage" text,
	"retryCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "fluvio_events_eventId_unique" UNIQUE("eventId")
);
--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "emailRecipients" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "smsEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "smsRecipients" json DEFAULT '[]'::json;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "webhookEnabled" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "webhookUrl" varchar(2048);--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "emailSent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "smsSent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "webhookSent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "severity" varchar(32) DEFAULT 'info';--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "serviceName" varchar(128);--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "metricName" varchar(128);--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "evaluationWindow" integer DEFAULT 300;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "thresholdValue" varchar(64);--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "comparisonOperator" varchar(10) DEFAULT 'gt';--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "cooldownPeriod" integer DEFAULT 3600;--> statement-breakpoint
ALTER TABLE "alert_configurations" ADD COLUMN "emailEnabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "resolvedAt" timestamp;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "serviceName" varchar(128);--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "metricName" varchar(128);--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "metricValue" varchar(64);--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "thresholdValue" varchar(64);--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "emailSent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "smsSent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "alert_history" ADD COLUMN "webhookSent" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "cities" text;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "propertyTypes" text;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "minBedrooms" integer;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "maxBedrooms" integer;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "minUndervaluedPercent" real;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "minTrendStrength" real;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "minGrowthPotential" real;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "isActive" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "notificationChannels" text;--> statement-breakpoint
ALTER TABLE "gnn_alert_subscriptions" ADD COLUMN "lastNotifiedAt" timestamp;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "undervaluedPercent" real;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "trendStrength" real;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "growthPotential" real;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "confidence" real;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "title" varchar(255);--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "message" text;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "reasoning" text;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "notificationsSent" text;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "userViewed" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "userDismissed" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "dismissedAt" timestamp;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "userSavedProperty" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "userViewedProperty" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "gnn_alert_triggers" ADD COLUMN "userContactedAgent" integer DEFAULT 0;--> statement-breakpoint
CREATE INDEX "app_versions_version_idx" ON "app_versions" USING btree ("version");--> statement-breakpoint
CREATE INDEX "app_versions_active_idx" ON "app_versions" USING btree ("isActive");--> statement-breakpoint
CREATE INDEX "app_versions_deployed_idx" ON "app_versions" USING btree ("deployedAt");--> statement-breakpoint
CREATE INDEX "audit_logs_user_idx" ON "audit_logs" USING btree ("userId");--> statement-breakpoint
CREATE INDEX "audit_logs_action_idx" ON "audit_logs" USING btree ("action");--> statement-breakpoint
CREATE INDEX "audit_logs_resource_idx" ON "audit_logs" USING btree ("resource");--> statement-breakpoint
CREATE INDEX "audit_logs_created_idx" ON "audit_logs" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "fluvio_events_topic_idx" ON "fluvio_events" USING btree ("topic");--> statement-breakpoint
CREATE INDEX "fluvio_events_status_idx" ON "fluvio_events" USING btree ("status");--> statement-breakpoint
CREATE INDEX "fluvio_events_created_idx" ON "fluvio_events" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "fluvio_events_event_id_idx" ON "fluvio_events" USING btree ("eventId");