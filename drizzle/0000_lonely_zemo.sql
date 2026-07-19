CREATE TYPE "public"."accountType" AS ENUM('asset', 'liability');--> statement-breakpoint
CREATE TYPE "public"."action_2" AS ENUM('none', 'warning_sent', 'account_suspended', 'account_banned');--> statement-breakpoint
CREATE TYPE "public"."action_3" AS ENUM('none', 'review_removed', 'user_warned');--> statement-breakpoint
CREATE TYPE "public"."action" AS ENUM('none', 'warning_sent', 'listing_removed', 'user_banned');--> statement-breakpoint
CREATE TYPE "public"."actionType" AS ENUM('approve_property', 'reject_property', 'remove_property', 'suspend_user', 'ban_user', 'remove_review', 'warn_user', 'restore_content');--> statement-breakpoint
CREATE TYPE "public"."activityType" AS ENUM('view', 'search', 'favorite', 'inquiry', 'comparison', 'download');--> statement-breakpoint
CREATE TYPE "public"."activityType_2" AS ENUM('created', 'viewed', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired', 'signed', 'comment');--> statement-breakpoint
CREATE TYPE "public"."approverType" AS ENUM('buyer', 'seller', 'inspector', 'admin');--> statement-breakpoint
CREATE TYPE "public"."boundaryType" AS ENUM('none', 'polygon', 'circle', 'rectangle');--> statement-breakpoint
CREATE TYPE "public"."category_2" AS ENUM('header', 'text', 'image', 'cta', 'footer', 'custom');--> statement-breakpoint
CREATE TYPE "public"."category" AS ENUM('deed', 'inspection_report', 'contract', 'disclosure', 'appraisal', 'insurance', 'tax_document', 'id_verification', 'title', 'other');--> statement-breakpoint
CREATE TYPE "public"."changeType" AS ENUM('created', 'price_change', 'status_change', 'updated', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."checkType" AS ENUM('kyc', 'aml', 'sanctions', 'tax');--> statement-breakpoint
CREATE TYPE "public"."companyType" AS ENUM('individual', 'llc', 'corporation', 'partnership');--> statement-breakpoint
CREATE TYPE "public"."constructionStatus" AS ENUM('pre_construction', 'under_construction', 'completed');--> statement-breakpoint
CREATE TYPE "public"."digestFrequency" AS ENUM('weekly', 'biweekly', 'monthly');--> statement-breakpoint
CREATE TYPE "public"."disputeType" AS ENUM('milestone_not_completed', 'quality_issue', 'timeline_delay', 'contract_breach', 'other');--> statement-breakpoint
CREATE TYPE "public"."disputeType_2" AS ENUM('non_delivery', 'quality_issue', 'fraud', 'contract_breach', 'other');--> statement-breakpoint
CREATE TYPE "public"."eventType" AS ENUM('load', 'interaction', 'error', 'switch');--> statement-breakpoint
CREATE TYPE "public"."filedByRole" AS ENUM('buyer', 'seller');--> statement-breakpoint
CREATE TYPE "public"."financingType" AS ENUM('cash', 'conventional', 'fha', 'va', 'other');--> statement-breakpoint
CREATE TYPE "public"."frequency" AS ENUM('instant', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."healthStatus" AS ENUM('healthy', 'degraded', 'down');--> statement-breakpoint
CREATE TYPE "public"."heatmapMode" AS ENUM('density', 'price', 'combined', 'none');--> statement-breakpoint
CREATE TYPE "public"."listingType" AS ENUM('sale', 'rent', 'sold', 'off_market');--> statement-breakpoint
CREATE TYPE "public"."notificationType" AS ENUM('property_alert', 'new_message', 'offer_update', 'showing_reminder', 'document_ready', 'price_change', 'new_listing', 'system');--> statement-breakpoint
CREATE TYPE "public"."paymentStatus" AS ENUM('pending', 'paid', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."paymentType" AS ENUM('deposit', 'down_payment', 'installment', 'full_payment', 'refund');--> statement-breakpoint
CREATE TYPE "public"."permission" AS ENUM('view', 'download', 'edit');--> statement-breakpoint
CREATE TYPE "public"."projectType_2" AS ENUM('new_construction', 'renovation', 'extension', 'commercial', 'landscaping');--> statement-breakpoint
CREATE TYPE "public"."projectType" AS ENUM('residential', 'commercial', 'mixed_use');--> statement-breakpoint
CREATE TYPE "public"."propertyType" AS ENUM('single_family', 'condo', 'townhouse', 'multi_family', 'land', 'commercial');--> statement-breakpoint
CREATE TYPE "public"."provider" AS ENUM('google', 'maplibre');--> statement-breakpoint
CREATE TYPE "public"."rating" AS ENUM('up', 'down');--> statement-breakpoint
CREATE TYPE "public"."reason_2" AS ENUM('harassment', 'fraud', 'spam', 'inappropriate_behavior', 'fake_profile', 'other');--> statement-breakpoint
CREATE TYPE "public"."reason" AS ENUM('inaccurate_info', 'fake_listing', 'inappropriate_content', 'duplicate', 'scam', 'other');--> statement-breakpoint
CREATE TYPE "public"."reason_3" AS ENUM('fake_review', 'offensive_language', 'spam', 'not_relevant', 'other');--> statement-breakpoint
CREATE TYPE "public"."reportStatus" AS ENUM('pending', 'generated', 'filed');--> statement-breakpoint
CREATE TYPE "public"."riskLevel" AS ENUM('low', 'medium', 'high', 'critical');--> statement-breakpoint
CREATE TYPE "public"."role_2" AS ENUM('signer', 'cc', 'approver');--> statement-breakpoint
CREATE TYPE "public"."role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."signalType" AS ENUM('repeat_view', 'long_view', 'favorite', 'inquiry', 'comparison', 'download_docs', 'mortgage_calc');--> statement-breakpoint
CREATE TYPE "public"."signatureStatus" AS ENUM('not_required', 'pending', 'signed', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."status_10" AS ENUM('pending', 'confirmed', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."status_3" AS ENUM('pending', 'processing', 'completed', 'failed', 'refunded', 'escrow', 'released');--> statement-breakpoint
CREATE TYPE "public"."status_11" AS ENUM('pending', 'sent', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status_12" AS ENUM('pending', 'reviewing', 'resolved', 'dismissed');--> statement-breakpoint
CREATE TYPE "public"."status_27" AS ENUM('pending', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."status_7" AS ENUM('pending', 'published', 'flagged', 'removed');--> statement-breakpoint
CREATE TYPE "public"."status_5" AS ENUM('draft', 'published', 'sold_out', 'archived');--> statement-breakpoint
CREATE TYPE "public"."status_9" AS ENUM('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."status_20" AS ENUM('sent', 'failed', 'clicked');--> statement-breakpoint
CREATE TYPE "public"."status_31" AS ENUM('pending', 'accepted', 'rejected', 'withdrawn');--> statement-breakpoint
CREATE TYPE "public"."status_24" AS ENUM('filed', 'under_review', 'awaiting_response', 'arbitration', 'resolved_buyer', 'resolved_seller', 'resolved_split', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."status_22" AS ENUM('processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status_30" AS ENUM('pending', 'accepted', 'rejected', 'countered', 'withdrawn', 'expired');--> statement-breakpoint
CREATE TYPE "public"."status_4" AS ENUM('draft', 'pending_signature', 'signed', 'archived');--> statement-breakpoint
CREATE TYPE "public"."status_6" AS ENUM('pending', 'in_progress', 'completed', 'verified');--> statement-breakpoint
CREATE TYPE "public"."status_16" AS ENUM('pending', 'processing', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status_18" AS ENUM('draft', 'sent', 'in_progress', 'completed', 'declined', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "public"."status_34" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."status_33" AS ENUM('active', 'completed', 'unsubscribed');--> statement-breakpoint
CREATE TYPE "public"."status_2" AS ENUM('pending', 'in_progress', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."status_21" AS ENUM('draft', 'active', 'paused', 'completed');--> statement-breakpoint
CREATE TYPE "public"."status_23" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."status_35" AS ENUM('draft', 'running', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."status_36" AS ENUM('scheduled', 'sent', 'delivered', 'opened', 'clicked', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status_28" AS ENUM('scheduled', 'ongoing', 'completed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."status" AS ENUM('queued', 'sent', 'delivered', 'opened', 'clicked', 'bounced', 'complained', 'failed');--> statement-breakpoint
CREATE TYPE "public"."status_15" AS ENUM('pending', 'in_progress', 'completed', 'approved', 'released', 'disputed');--> statement-breakpoint
CREATE TYPE "public"."status_25" AS ENUM('pending', 'passed', 'failed', 'manual_review');--> statement-breakpoint
CREATE TYPE "public"."status_32" AS ENUM('pending', 'sent', 'failed', 'retrying');--> statement-breakpoint
CREATE TYPE "public"."status_26" AS ENUM('pending', 'quoted', 'accepted', 'rejected', 'expired');--> statement-breakpoint
CREATE TYPE "public"."status_13" AS ENUM('pending', 'approved', 'rejected', 'needs_changes');--> statement-breakpoint
CREATE TYPE "public"."status_19" AS ENUM('pending', 'sent', 'viewed', 'signed', 'declined', 'completed');--> statement-breakpoint
CREATE TYPE "public"."status_29" AS ENUM('registered', 'confirmed', 'attended', 'no_show', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."status_8" AS ENUM('active', 'inactive', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."status_14" AS ENUM('created', 'funded', 'partial_release', 'completed', 'disputed', 'refunded', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."status_17" AS ENUM('open', 'under_review', 'mediation', 'resolved', 'closed');--> statement-breakpoint
CREATE TYPE "public"."targetSegment" AS ENUM('all', 'buyers', 'sellers', 'agents');--> statement-breakpoint
CREATE TYPE "public"."targetType" AS ENUM('property', 'user', 'review');--> statement-breakpoint
CREATE TYPE "public"."testType" AS ENUM('subject_line', 'content', 'send_time', 'from_name');--> statement-breakpoint
CREATE TYPE "public"."tourType" AS ENUM('360_image', '3d_model', 'video', 'ar_view');--> statement-breakpoint
CREATE TYPE "public"."tourType_2" AS ENUM('in_person', 'virtual');--> statement-breakpoint
CREATE TYPE "public"."transactionType" AS ENUM('sale', 'rent', 'lease');--> statement-breakpoint
CREATE TYPE "public"."triggerType" AS ENUM('manual', 'signup', 'property_view', 'saved_search', 'offer_submitted', 'tour_booked', '');--> statement-breakpoint
CREATE TYPE "public"."type" AS ENUM('search_alert', 'price_change', 'new_listing', 'message', 'transaction');--> statement-breakpoint
CREATE TYPE "public"."type_2" AS ENUM('email', 'sms');--> statement-breakpoint
CREATE TYPE "public"."type_3" AS ENUM('deposit', 'release', 'refund', 'fee', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."verificationStatus" AS ENUM('pending', 'in_review', 'verified', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."winnerMetric" AS ENUM('open_rate', 'click_rate', 'conversion_rate');--> statement-breakpoint
CREATE TYPE "public"."exteriorCondition" AS ENUM('excellent', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."overallCondition" AS ENUM('excellent', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."roofCondition" AS ENUM('excellent', 'good', 'fair', 'poor');--> statement-breakpoint
CREATE TYPE "public"."alert_frequency" AS ENUM('instant', 'daily', 'weekly');--> statement-breakpoint
CREATE TYPE "public"."alert_type" AS ENUM('increase', 'decrease', 'both');--> statement-breakpoint
CREATE TYPE "public"."delivery_method" AS ENUM('email', 'push', 'in_app', 'sms');--> statement-breakpoint
CREATE TYPE "public"."delivery_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced');--> statement-breakpoint
CREATE TYPE "public"."cofOStatus" AS ENUM('valid', 'expired', 'pending_renewal', 'revoked', 'suspended', 'under_review');--> statement-breakpoint
CREATE TYPE "public"."landDocumentType" AS ENUM('certificate_of_occupancy', 'deed_of_assignment', 'survey_plan', 'building_approval', 'tax_clearance', 'development_permit', 'land_purchase_receipt', 'power_of_attorney', 'governor_consent', 'other');--> statement-breakpoint
CREATE TYPE "public"."landUseType" AS ENUM('residential', 'commercial', 'industrial', 'agricultural', 'mixed_use', 'recreational', 'institutional');--> statement-breakpoint
CREATE TYPE "public"."ownershipType" AS ENUM('individual', 'corporate', 'government', 'cooperative', 'trust', 'joint_ownership');--> statement-breakpoint
CREATE TYPE "public"."registrySource" AS ENUM('lagos_state', 'fct_abuja', 'rivers_state', 'kano_state', 'oyo_state', 'manual_entry');--> statement-breakpoint
CREATE TYPE "public"."syncStatus" AS ENUM('pending', 'in_progress', 'completed', 'failed', 'partial');--> statement-breakpoint
CREATE TYPE "public"."transferType" AS ENUM('sale', 'gift', 'inheritance', 'court_order', 'government_acquisition', 'lease');--> statement-breakpoint
CREATE TYPE "public"."landVerificationStatus" AS ENUM('pending', 'in_progress', 'verified', 'rejected', 'requires_documents', 'escalated');--> statement-breakpoint
CREATE TABLE "adminMetrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"metricDate" timestamp NOT NULL,
	"metricType" varchar(50) NOT NULL,
	"totalReports" integer DEFAULT 0 NOT NULL,
	"pendingReports" integer DEFAULT 0 NOT NULL,
	"resolvedReports" integer DEFAULT 0 NOT NULL,
	"averageResponseTimeMinutes" integer DEFAULT 0 NOT NULL,
	"totalProperties" integer DEFAULT 0 NOT NULL,
	"activeProperties" integer DEFAULT 0 NOT NULL,
	"pendingApprovals" integer DEFAULT 0 NOT NULL,
	"totalUsers" integer DEFAULT 0 NOT NULL,
	"activeUsers" integer DEFAULT 0 NOT NULL,
	"newUsers" integer DEFAULT 0 NOT NULL,
	"totalTransactions" integer DEFAULT 0 NOT NULL,
	"completedTransactions" integer DEFAULT 0 NOT NULL,
	"totalVolume" integer DEFAULT 0 NOT NULL,
	"activeEscrows" integer DEFAULT 0 NOT NULL,
	"completedEscrows" integer DEFAULT 0 NOT NULL,
	"disputedEscrows" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agentAvailability" (
	"id" serial PRIMARY KEY NOT NULL,
	"agentId" integer NOT NULL,
	"dayOfWeek" integer NOT NULL,
	"startTime" varchar(5) NOT NULL,
	"endTime" varchar(5) NOT NULL,
	"isAvailable" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"licenseNumber" varchar(100),
	"agency" varchar(255),
	"specialization" text,
	"bio" text,
	"phone" varchar(20),
	"website" text,
	"rating" integer,
	"totalSales" integer DEFAULT 0,
	"activeListings" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_acknowledgments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alert_acknowledgments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"alertHistoryId" integer NOT NULL,
	"userId" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_configurations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alert_configurations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer,
	"name" varchar(255) NOT NULL,
	"alertType" "alertType" NOT NULL,
	"conditions" json NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"notifyEmail" boolean DEFAULT true NOT NULL,
	"notifyPush" boolean DEFAULT false NOT NULL,
	"description" text,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alert_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alert_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"configurationId" integer NOT NULL,
	"userId" integer,
	"alertType" "alertType" NOT NULL,
	"severity" "severity" DEFAULT 'info' NOT NULL,
	"status" "alertStatus" DEFAULT 'pending' NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"propertyId" integer,
	"valuationId" integer,
	"acknowledgedAt" timestamp,
	"acknowledgedBy" integer,
	"metadata" json,
	"triggeredAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alternative_data_cache" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alternative_data_cache_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"walkabilityScore" integer,
	"amenityDensity025mi" integer,
	"amenityDensity05mi" integer,
	"amenityDensity1mi" integer,
	"restaurantQualityAvg" numeric(3, 2),
	"schoolQualityProxy" integer,
	"retailAccessibility" integer,
	"unemploymentRate" numeric(5, 2),
	"wageGrowthYoy" numeric(5, 2),
	"priceGrowthYoy" numeric(5, 2),
	"searchInterestIndex" integer,
	"buyerUrgencyScore" integer,
	"poiData" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "alternativeDataSources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "alternativeDataSources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"city" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"latitude" varchar(20),
	"longitude" varchar(20),
	"inflationRate" integer,
	"gdpGrowthRate" integer,
	"unemploymentRate" integer,
	"currencyExchangeRate" integer,
	"interestRate" integer,
	"avgPricePerSqm" integer,
	"listingCount" integer,
	"avgDaysOnMarket" integer,
	"priceTrend30d" integer,
	"comparablePropertiesCount" integer,
	"schoolProximityScore" integer,
	"hospitalProximityScore" integer,
	"shoppingProximityScore" integer,
	"transportProximityScore" integer,
	"crimeSafetyScore" integer,
	"overallNeighborhoodScore" integer,
	"dataCompletenessScore" integer NOT NULL,
	"sourcesUsed" text,
	"dataDate" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apiUsage" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "apiUsage_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"serviceName" varchar(64) NOT NULL,
	"endpoint" varchar(255) NOT NULL,
	"method" varchar(10) NOT NULL,
	"statusCode" integer NOT NULL,
	"responseTimeMs" integer NOT NULL,
	"cacheHit" boolean DEFAULT false NOT NULL,
	"mockData" boolean DEFAULT true NOT NULL,
	"requestSize" integer,
	"responseSize" integer,
	"errorMessage" text,
	"userId" integer,
	"propertyId" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL,
	"metadata" json
);
--> statement-breakpoint
CREATE TABLE "appointments" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"buyerId" integer NOT NULL,
	"agentId" integer,
	"appointmentDate" timestamp NOT NULL,
	"duration" integer DEFAULT 60 NOT NULL,
	"tourType_2" "tourType_2" DEFAULT 'in_person' NOT NULL,
	"status_10" "status_10" DEFAULT 'pending' NOT NULL,
	"meetingLink" text,
	"notes" text,
	"cancellationReason" text,
	"reminderSent" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "availability_calendar" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"isAvailable" integer DEFAULT 1 NOT NULL,
	"price" varchar(20),
	"minimumStay" integer DEFAULT 1,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builderProjects" (
	"id" serial PRIMARY KEY NOT NULL,
	"builderId" integer NOT NULL,
	"propertyId" integer,
	"projectName" varchar(255) NOT NULL,
	"projectType" "projectType" NOT NULL,
	"description" text,
	"constructionStatus" "constructionStatus" NOT NULL,
	"startDate" timestamp,
	"estimatedCompletionDate" timestamp,
	"actualCompletionDate" timestamp,
	"completionPercentage" integer DEFAULT 0,
	"originalPrice" integer NOT NULL,
	"currentPrice" integer NOT NULL,
	"pricePerSqFt" integer,
	"totalUnits" integer DEFAULT 1,
	"availableUnits" integer,
	"soldUnits" integer DEFAULT 0,
	"floorPlans" text,
	"images" text,
	"videos" text,
	"brochure" text,
	"legalDocuments" text,
	"status_5" "status_5" DEFAULT 'draft' NOT NULL,
	"publishedAt" timestamp,
	"views" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builderQuoteResponses" (
	"id" serial PRIMARY KEY NOT NULL,
	"quoteId" integer NOT NULL,
	"builderId" integer NOT NULL,
	"estimatedCost" integer NOT NULL,
	"timeline" varchar(255) NOT NULL,
	"breakdown" text,
	"terms" text,
	"validUntil" timestamp,
	"status_27" "status_27" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builderQuotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"builderId" integer,
	"projectType_2" "projectType_2" NOT NULL,
	"description" text NOT NULL,
	"location" varchar(255),
	"budget" integer,
	"timeline" varchar(100),
	"attachments" text,
	"status_26" "status_26" DEFAULT 'pending' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builderReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"builderId" integer NOT NULL,
	"projectId" integer,
	"reviewerId" integer NOT NULL,
	"overallRating" integer NOT NULL,
	"qualityRating" integer,
	"timelinessRating" integer,
	"communicationRating" integer,
	"valueRating" integer,
	"title" varchar(255),
	"review" text,
	"pros" text,
	"cons" text,
	"photos" text,
	"status_7" "status_7" DEFAULT 'pending' NOT NULL,
	"verifiedPurchase" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "builders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"agentId" integer,
	"companyName" varchar(255) NOT NULL,
	"cacNumber" varchar(100),
	"companyType" "companyType",
	"verificationStatus" "verificationStatus" DEFAULT 'pending' NOT NULL,
	"verificationDocuments" text,
	"verifiedAt" timestamp,
	"verifiedBy" integer,
	"trustScore" integer DEFAULT 0,
	"totalProjects" integer DEFAULT 0,
	"completedProjects" integer DEFAULT 0,
	"activeProjects" integer DEFAULT 0,
	"averageRating" integer DEFAULT 0,
	"totalReviews" integer DEFAULT 0,
	"phone" varchar(20),
	"email" varchar(320),
	"website" text,
	"address" text,
	"city" varchar(100),
	"state" varchar(50),
	"bio" text,
	"logo" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyerIntentSignals" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"signalType" "signalType" NOT NULL,
	"propertyId" integer,
	"weight" integer DEFAULT 1 NOT NULL,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "buyerProfiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"preferredLocations" text,
	"priceRange" text,
	"preferredPropertyTypes" text,
	"minBedrooms" integer,
	"minBathrooms" integer,
	"preferredAmenities" text,
	"intentScore" integer DEFAULT 0 NOT NULL,
	"lastActive" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "buyerProfiles_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "competitor_listings" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"competitorUrl" varchar(1000) NOT NULL,
	"competitorPlatform" varchar(100) NOT NULL,
	"competitorPrice" integer,
	"competitorStatus" varchar(50),
	"competitorListedDate" timestamp,
	"competitorUpdatedDate" timestamp,
	"priceHistory" text,
	"lastScrapedAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitor_tracking_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobType" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"startedAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp,
	"propertiesProcessed" integer DEFAULT 0,
	"emailsSent" integer DEFAULT 0,
	"errorMessage" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "confidenceScores" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "confidenceScores_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"valuationId" integer NOT NULL,
	"overallConfidence" integer NOT NULL,
	"confidenceLevel" "confidenceLevel" NOT NULL,
	"dataCompletenessScore" integer NOT NULL,
	"modelAccuracyScore" integer NOT NULL,
	"comparableQualityScore" integer NOT NULL,
	"satelliteConfidenceScore" integer,
	"marketStabilityScore" integer,
	"comparableSalesCount" integer DEFAULT 0,
	"transactionHistoryCount" integer DEFAULT 0,
	"satelliteDataAvailable" integer DEFAULT 0,
	"alternativeDataSourcesCount" integer DEFAULT 0,
	"predictionIntervalLower" integer NOT NULL,
	"predictionIntervalUpper" integer NOT NULL,
	"intervalWidthPercent" integer NOT NULL,
	"standardError" integer,
	"qualityFlags" text,
	"limitingFactors" text,
	"recommendations" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "confidenceScores_valuationId_unique" UNIQUE("valuationId")
);
--> statement-breakpoint
CREATE TABLE "costTracking" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "costTracking_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"serviceName" varchar(64) NOT NULL,
	"costType" varchar(64) NOT NULL,
	"amount" numeric(10, 4) NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"billingPeriod" varchar(32) NOT NULL,
	"description" text,
	"metadata" json,
	"recordedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "counteroffers" (
	"id" serial PRIMARY KEY NOT NULL,
	"offerId" integer NOT NULL,
	"counterpartyId" integer NOT NULL,
	"counterAmount" integer NOT NULL,
	"earnestMoney" integer,
	"downPayment" integer,
	"proposedClosingDate" timestamp,
	"inspectionPeriod" integer,
	"inspectionContingency" integer DEFAULT 1 NOT NULL,
	"appraisalContingency" integer DEFAULT 1 NOT NULL,
	"financingContingency" integer DEFAULT 1 NOT NULL,
	"additionalTerms" text,
	"notes" text,
	"status_31" "status_31" DEFAULT 'pending' NOT NULL,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "custom_date_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"price" integer NOT NULL,
	"reason" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customEmailTemplates" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"blockSequence" text NOT NULL,
	"blockCustomizations" text,
	"availableVariables" text,
	"isActive" integer DEFAULT 1 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "dataQualityMetrics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "dataQualityMetrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"city" varchar(100),
	"state" varchar(50),
	"propertyType" varchar(50),
	"comparableDataQuality" integer,
	"transactionDataQuality" integer,
	"satelliteDataQuality" integer,
	"marketDataQuality" integer,
	"overallDataQuality" integer NOT NULL,
	"totalProperties" integer,
	"propertiesWithComparables" integer,
	"propertiesWithSatellite" integer,
	"propertiesWithMarketData" integer,
	"recommendedPathway" "recommendedPathway",
	"calculatedAt" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputeEvidence" (
	"id" serial PRIMARY KEY NOT NULL,
	"disputeId" integer NOT NULL,
	"uploadedBy" integer NOT NULL,
	"evidenceType" varchar(50) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileName" varchar(255) NOT NULL,
	"fileSize" integer,
	"mimeType" varchar(100),
	"description" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "disputeMessages" (
	"id" serial PRIMARY KEY NOT NULL,
	"disputeId" integer NOT NULL,
	"senderId" integer NOT NULL,
	"senderRole" varchar(50) NOT NULL,
	"message" text NOT NULL,
	"attachments" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentFolderItems" (
	"id" serial PRIMARY KEY NOT NULL,
	"folderId" integer NOT NULL,
	"documentId" integer NOT NULL,
	"addedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentFolders" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"parentFolderId" integer,
	"color" varchar(20),
	"icon" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documentShares" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"sharedWithUserId" integer NOT NULL,
	"sharedByUserId" integer NOT NULL,
	"permission" "permission" DEFAULT 'view' NOT NULL,
	"expiresAt" timestamp,
	"accessCount" integer DEFAULT 0,
	"lastAccessedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"propertyId" integer,
	"transactionId" integer,
	"fileName" varchar(255) NOT NULL,
	"fileKey" varchar(500) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileSize" integer,
	"mimeType" varchar(100),
	"category" "category" NOT NULL,
	"tags" text,
	"title" varchar(255),
	"description" text,
	"version" integer DEFAULT 1 NOT NULL,
	"parentDocumentId" integer,
	"status_4" "status_4" DEFAULT 'draft' NOT NULL,
	"signatureStatus" "signatureStatus",
	"docusignEnvelopeId" varchar(255),
	"signedBy" text,
	"signedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailAbTestResults" (
	"id" serial PRIMARY KEY NOT NULL,
	"testId" integer NOT NULL,
	"pValue" varchar(20),
	"isSignificant" integer DEFAULT 0 NOT NULL,
	"confidenceInterval" varchar(50),
	"winnerVariant" varchar(1),
	"improvementPercentage" integer,
	"recommendation" text,
	"shouldPromote" integer DEFAULT 0 NOT NULL,
	"calculatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailAbTestVariants" (
	"id" serial PRIMARY KEY NOT NULL,
	"testId" integer NOT NULL,
	"variant" varchar(1) NOT NULL,
	"subjectLine" varchar(255),
	"fromName" varchar(255),
	"content" text,
	"sendTime" varchar(5),
	"sentCount" integer DEFAULT 0 NOT NULL,
	"deliveredCount" integer DEFAULT 0 NOT NULL,
	"openedCount" integer DEFAULT 0 NOT NULL,
	"clickedCount" integer DEFAULT 0 NOT NULL,
	"convertedCount" integer DEFAULT 0 NOT NULL,
	"deliveryRate" integer DEFAULT 0 NOT NULL,
	"openRate" integer DEFAULT 0 NOT NULL,
	"clickRate" integer DEFAULT 0 NOT NULL,
	"conversionRate" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailAbTests" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaignId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"testType" "testType" NOT NULL,
	"status_35" "status_35" DEFAULT 'draft' NOT NULL,
	"trafficSplit" integer DEFAULT 50 NOT NULL,
	"sampleSize" integer,
	"confidenceLevel" integer DEFAULT 95 NOT NULL,
	"winnerMetric" "winnerMetric" DEFAULT 'open_rate' NOT NULL,
	"winnerVariant" varchar(1),
	"autoPromoteWinner" integer DEFAULT 1 NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailCampaignSequences" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaignId" integer NOT NULL,
	"sequenceOrder" integer NOT NULL,
	"templateId" integer NOT NULL,
	"delayDays" integer DEFAULT 0 NOT NULL,
	"delayHours" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailCampaignSubscribers" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaignId" integer NOT NULL,
	"userId" integer NOT NULL,
	"status_33" "status_33" DEFAULT 'active' NOT NULL,
	"subscribedAt" timestamp DEFAULT now() NOT NULL,
	"lastSentSequence" integer DEFAULT 0,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailCampaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status_21" "status_21" DEFAULT 'draft' NOT NULL,
	"triggerType" "triggerType" DEFAULT 'manual' NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailDeliveryLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"status_34" "status_34" DEFAULT 'pending' NOT NULL,
	"templateId" integer,
	"userId" integer,
	"emailType" varchar(100),
	"opened" integer DEFAULT 0 NOT NULL,
	"clicked" integer DEFAULT 0 NOT NULL,
	"openedAt" timestamp,
	"clickedAt" timestamp,
	"sentAt" timestamp DEFAULT now() NOT NULL,
	"deliveredAt" timestamp,
	"errorMessage" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailDeliveryLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"subject" varchar(500) NOT NULL,
	"status_32" "status_32" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"lastAttemptAt" timestamp NOT NULL,
	"messageId" varchar(255),
	"errorMessage" text,
	"emailType" varchar(100),
	"userId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailTemplateBlocks" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category_2" "category_2" NOT NULL,
	"htmlContent" text NOT NULL,
	"cssStyles" text,
	"thumbnailUrl" text,
	"variables" text,
	"isPublic" integer DEFAULT 1 NOT NULL,
	"createdBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "emailTemplates" (
	"id" serial PRIMARY KEY NOT NULL,
	"templateKey" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"subject" varchar(255) NOT NULL,
	"htmlContent" text NOT NULL,
	"textContent" text,
	"variables" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "emailTemplates_templateKey_unique" UNIQUE("templateKey")
);
--> statement-breakpoint
CREATE TABLE "escrowAccounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"transactionId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"projectId" integer,
	"buyerId" integer NOT NULL,
	"sellerId" integer NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"totalAmount" integer NOT NULL,
	"heldAmount" integer NOT NULL,
	"releasedAmount" integer DEFAULT 0 NOT NULL,
	"refundedAmount" integer DEFAULT 0 NOT NULL,
	"status_14" "status_14" DEFAULT 'created' NOT NULL,
	"stripeAccountId" varchar(255),
	"stripeTransferId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"fundedAt" timestamp,
	"completedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowApprovals" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"approverType" "approverType" NOT NULL,
	"approverId" integer NOT NULL,
	"action" varchar(50) NOT NULL,
	"status_23" "status_23" DEFAULT 'pending' NOT NULL,
	"signature" text,
	"approvedAt" timestamp,
	"rejectedAt" timestamp,
	"reason" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowAuditLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"action" varchar(100) NOT NULL,
	"previousStatus" varchar(50),
	"newStatus" varchar(50),
	"amount" integer,
	"performedBy" integer,
	"performedByRole" varchar(50),
	"ipAddress" varchar(45),
	"userAgent" text,
	"reason" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowComplianceChecks" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"userId" integer NOT NULL,
	"checkType" "checkType" NOT NULL,
	"status_25" "status_25" NOT NULL,
	"provider" varchar(50),
	"providerCheckId" varchar(255),
	"result" text,
	"riskScore" integer,
	"flags" text,
	"reviewedBy" integer,
	"reviewNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "escrowDisputes" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowAccountId" integer NOT NULL,
	"milestoneId" integer,
	"initiatedByUserId" integer NOT NULL,
	"disputeType" "disputeType" NOT NULL,
	"description" text NOT NULL,
	"evidence" text,
	"requestedAmount" integer,
	"status_17" "status_17" DEFAULT 'open' NOT NULL,
	"resolution" text,
	"resolvedByAdminId" integer,
	"resolvedAmount" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowDisputesEnhanced" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"filedBy" integer NOT NULL,
	"filedByRole" "filedByRole" NOT NULL,
	"disputeType_2" "disputeType_2" NOT NULL,
	"description" text NOT NULL,
	"status_24" "status_24" DEFAULT 'filed' NOT NULL,
	"assignedArbitrator" integer,
	"resolution" text,
	"resolutionAmount" integer,
	"splitPercentage" integer,
	"resolvedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowFraudChecks" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"checkType" varchar(50) NOT NULL,
	"riskScore" integer NOT NULL,
	"riskLevel" "riskLevel" NOT NULL,
	"flags" text,
	"passed" boolean NOT NULL,
	"blockedReason" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowMilestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowAccountId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"amount" integer NOT NULL,
	"percentage" integer,
	"sequence" integer NOT NULL,
	"status_15" "status_15" DEFAULT 'pending' NOT NULL,
	"requiredDocuments" text,
	"uploadedDocuments" text,
	"approvedByBuyer" integer DEFAULT 0,
	"approvedBySeller" integer DEFAULT 0,
	"approvedByInspector" integer DEFAULT 0,
	"inspectorId" integer,
	"dueDate" timestamp,
	"completedAt" timestamp,
	"releasedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowStateHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"status" varchar(50) NOT NULL,
	"heldAmount" integer NOT NULL,
	"releasedAmount" integer NOT NULL,
	"refundedAmount" integer NOT NULL,
	"snapshot" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrowTransactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowAccountId" integer NOT NULL,
	"milestoneId" integer,
	"type_3" "type_3" NOT NULL,
	"amount" integer NOT NULL,
	"status_16" "status_16" DEFAULT 'pending' NOT NULL,
	"stripePaymentIntentId" varchar(255),
	"stripeTransferId" varchar(255),
	"description" text,
	"metadata" text,
	"processedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experimentAssignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"experimentId" integer NOT NULL,
	"userId" integer NOT NULL,
	"variant" varchar(50) NOT NULL,
	"assignedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "experimentMetrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"experimentId" integer NOT NULL,
	"userId" integer NOT NULL,
	"variant" varchar(50) NOT NULL,
	"metricType" varchar(50) NOT NULL,
	"propertyId" integer,
	"value" integer DEFAULT 1 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fairness_metrics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "fairness_metrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"segment" varchar(100) NOT NULL,
	"segmentValue" varchar(100) NOT NULL,
	"mpe" numeric(10, 4) NOT NULL,
	"mdape" numeric(10, 4) NOT NULL,
	"disparateImpact" numeric(10, 4),
	"sampleSize" integer NOT NULL,
	"calibrationFactor" numeric(10, 6) DEFAULT '1.000000',
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_alert_subscriptions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_alert_subscriptions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"alertType" "alertType" NOT NULL,
	"minInvestmentScore" integer,
	"minMomentumScore" integer,
	"minCentralityScore" varchar(20),
	"latitude" varchar(20),
	"longitude" varchar(20),
	"radiusKm" integer,
	"neighborhoods" text,
	"minPrice" integer,
	"maxPrice" integer,
	"enabled" integer DEFAULT 1 NOT NULL,
	"notifyEmail" integer DEFAULT 1,
	"notifySms" integer DEFAULT 0,
	"notifyInApp" integer DEFAULT 1,
	"frequency" "alertFrequency" DEFAULT 'daily' NOT NULL,
	"lastTriggered" timestamp,
	"triggerCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_alert_triggers" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_alert_triggers_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"subscriptionId" integer NOT NULL,
	"propertyId" integer,
	"alertType" varchar(50) NOT NULL,
	"alertTitle" varchar(255) NOT NULL,
	"alertMessage" text NOT NULL,
	"investmentScore" integer,
	"momentumScore" integer,
	"centralityScore" varchar(20),
	"predictedPriceChange" varchar(20),
	"confidenceScore" varchar(20),
	"emailSent" integer DEFAULT 0,
	"smsSent" integer DEFAULT 0,
	"inAppSent" integer DEFAULT 1,
	"viewed" integer DEFAULT 0,
	"viewedAt" timestamp,
	"clicked" integer DEFAULT 0,
	"clickedAt" timestamp,
	"triggeredAt" timestamp DEFAULT now() NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_inference_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"inferenceType" varchar(50) NOT NULL,
	"modelVersion" varchar(50) NOT NULL,
	"inputData" text NOT NULL,
	"outputData" text NOT NULL,
	"executionTimeMs" integer NOT NULL,
	"cacheHit" integer DEFAULT 0 NOT NULL,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_market_trend_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"neighborhoodId" varchar(100) NOT NULL,
	"modelVersion" varchar(50) NOT NULL,
	"trendDirection" varchar(20) NOT NULL,
	"trendStrength" real NOT NULL,
	"priceChangePrediction" real NOT NULL,
	"timeHorizon" integer NOT NULL,
	"confidence" real NOT NULL,
	"spatialDiffusion" text,
	"cachedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isValid" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_market_trend_predictions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_market_trend_predictions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"trendDirection" "trendDirection" NOT NULL,
	"trendMagnitude" varchar(20) NOT NULL,
	"trendScore" varchar(20) NOT NULL,
	"forecastMonths" integer NOT NULL,
	"investmentScore" varchar(20),
	"centralityScore" varchar(20),
	"undervaluationScore" varchar(20),
	"recommendation" "recommendation",
	"isHotspot" integer DEFAULT 0,
	"hotspotRank" integer,
	"modelVersion" varchar(50) NOT NULL,
	"predictionTimestamp" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_model_performance_metrics" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_model_performance_metrics_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"modelType" "gnnPerformanceModelType" NOT NULL,
	"modelVersion" varchar(50) NOT NULL,
	"evaluationStartDate" timestamp NOT NULL,
	"evaluationEndDate" timestamp NOT NULL,
	"numPredictions" integer,
	"avgError" varchar(20),
	"medianError" varchar(20),
	"avgConfidence" varchar(20),
	"accuracy_0_50k" varchar(20),
	"accuracy_50k_100k" varchar(20),
	"accuracy_100k_200k" varchar(20),
	"accuracy_200k_plus" varchar(20),
	"userRating" varchar(20),
	"numRatings" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_model_training_runs" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_model_training_runs_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"modelType" "gnnModelType" NOT NULL,
	"modelVersion" varchar(50) NOT NULL,
	"architecture" varchar(100),
	"hyperparameters" text,
	"numTrainingExamples" integer,
	"numValidationExamples" integer,
	"numTestExamples" integer,
	"trainLoss" varchar(20),
	"validationLoss" varchar(20),
	"testLoss" varchar(20),
	"mae" varchar(20),
	"rmse" varchar(20),
	"r2Score" varchar(20),
	"trainingDuration" integer,
	"device" varchar(20),
	"status" "gnnTrainingStatus" NOT NULL,
	"errorMessage" text,
	"startedAt" timestamp NOT NULL,
	"completedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_neighborhood_intel_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"neighborhoodId" varchar(100) NOT NULL,
	"modelVersion" varchar(50) NOT NULL,
	"walkabilityScore" real,
	"transitScore" real,
	"amenityDensity" real,
	"networkCentrality" real,
	"growthPotential" real,
	"investmentScore" real,
	"streetNetworkMetrics" text,
	"transitAccessibility" text,
	"cachedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isValid" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_neighborhood_intelligence" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_neighborhood_intelligence_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"latitude" varchar(20) NOT NULL,
	"longitude" varchar(20) NOT NULL,
	"city" varchar(100) NOT NULL,
	"neighborhood" varchar(255),
	"intersectionDensity" varchar(20),
	"streetConnectivity" varchar(20),
	"pedestrianFriendliness" varchar(20),
	"networkDistanceToAmenities" varchar(20),
	"walkabilityScore" varchar(20),
	"numNearbyStops" integer,
	"avgFrequency" varchar(20),
	"reachableArea" varchar(20),
	"transitScore" varchar(20),
	"nearestStops" text,
	"locationScore" varchar(20),
	"recommendation" text,
	"analysisTimestamp" timestamp NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_property_edges" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_property_edges_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"sourceNodeId" integer NOT NULL,
	"targetNodeId" integer NOT NULL,
	"distance" varchar(20) NOT NULL,
	"edgeType" "edgeType" NOT NULL,
	"weight" varchar(20) DEFAULT '1.0',
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_property_nodes" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_property_nodes_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"price" integer NOT NULL,
	"bedrooms" integer NOT NULL,
	"bathrooms" integer NOT NULL,
	"sqft" integer NOT NULL,
	"latitude" varchar(20) NOT NULL,
	"longitude" varchar(20) NOT NULL,
	"yearBuilt" integer,
	"lotSize" integer,
	"propertyType" varchar(50),
	"listingType" varchar(50),
	"pricePerSqft" integer,
	"ageOfProperty" integer,
	"nodeEmbedding" text,
	"centralityScore" varchar(20),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_valuation_cache" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"modelVersion" varchar(50) NOT NULL,
	"predictedValue" real NOT NULL,
	"confidence" real NOT NULL,
	"spatialFeatures" text,
	"temporalFeatures" text,
	"explanation" text,
	"cachedAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	"isValid" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_valuation_predictions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "gnn_valuation_predictions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"estimatedValue" integer NOT NULL,
	"confidenceScore" varchar(20) NOT NULL,
	"valueRangeMin" integer NOT NULL,
	"valueRangeMax" integer NOT NULL,
	"neighborhoodEffect" integer,
	"locationPremium" varchar(20),
	"accessibilityScore" integer,
	"modelVersion" varchar(50) NOT NULL,
	"predictionTimestamp" timestamp NOT NULL,
	"comparableProperties" text,
	"actualValue" integer,
	"predictionError" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "hybridValuations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "hybridValuations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"valuationId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"pathwayUsed" "pathwayUsed" NOT NULL,
	"dataAvailabilityScore" integer NOT NULL,
	"components" text NOT NULL,
	"finalValuation" integer NOT NULL,
	"confidenceScore" integer NOT NULL,
	"uncertaintyRangeLower" integer NOT NULL,
	"uncertaintyRangeUpper" integer NOT NULL,
	"satelliteAnalysisId" integer,
	"alternativeDataId" integer,
	"modelVersion" varchar(50) DEFAULT '2.0-hybrid',
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "hybridValuations_valuationId_unique" UNIQUE("valuationId")
);
--> statement-breakpoint
CREATE TABLE "idempotencyKeys" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(255) NOT NULL,
	"requestHash" varchar(64) NOT NULL,
	"response" text,
	"status_22" "status_22" NOT NULL,
	"lastError" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"expiresAt" timestamp NOT NULL,
	CONSTRAINT "idempotencyKeys_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "investor_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"minBudget" integer NOT NULL,
	"maxBudget" integer NOT NULL,
	"minROI" integer NOT NULL,
	"riskTolerance" "riskTolerance" NOT NULL,
	"investmentHorizon" "investmentHorizon" NOT NULL,
	"preferredCities" text,
	"preferredNeighborhoods" text,
	"propertyTypes" text,
	"isActive" integer DEFAULT 1 NOT NULL,
	"onboardingCompleted" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_execution_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobId" integer NOT NULL,
	"executionTime" integer,
	"itemsProcessed" integer DEFAULT 0 NOT NULL,
	"itemsFailed" integer DEFAULT 0 NOT NULL,
	"averageItemTime" integer,
	"peakMemoryUsage" integer,
	"cpuUsage" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_monitoring" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobType" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"propertyId" integer,
	"progress" integer DEFAULT 0 NOT NULL,
	"totalItems" integer DEFAULT 0 NOT NULL,
	"processedItems" integer DEFAULT 0 NOT NULL,
	"startedAt" timestamp,
	"completedAt" timestamp,
	"errorMessage" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_queue" (
	"id" serial PRIMARY KEY NOT NULL,
	"jobType" varchar(50) NOT NULL,
	"priority" integer DEFAULT 5 NOT NULL,
	"scheduledFor" timestamp NOT NULL,
	"payload" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 3 NOT NULL,
	"lastAttemptAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mapAnalytics" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"sessionId" varchar(64) NOT NULL,
	"provider" "provider" NOT NULL,
	"eventType" "eventType" NOT NULL,
	"loadTime" integer,
	"errorMessage" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "market_pricing_recommendations" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"recommendedBasePrice" integer NOT NULL,
	"confidence" varchar(10) NOT NULL,
	"competitorAvgPrice" integer,
	"marketDemandScore" varchar(10),
	"seasonalityFactor" varchar(10),
	"reasoning" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"senderId" integer NOT NULL,
	"receiverId" integer NOT NULL,
	"propertyId" integer,
	"subject" varchar(255),
	"content" text NOT NULL,
	"isRead" integer DEFAULT 0,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metricsDaily" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "metricsDaily_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"serviceName" varchar(64) NOT NULL,
	"date" timestamp NOT NULL,
	"totalRequests" integer DEFAULT 0 NOT NULL,
	"successfulRequests" integer DEFAULT 0 NOT NULL,
	"failedRequests" integer DEFAULT 0 NOT NULL,
	"cacheHits" integer DEFAULT 0 NOT NULL,
	"cacheMisses" integer DEFAULT 0 NOT NULL,
	"avgResponseTimeMs" integer DEFAULT 0 NOT NULL,
	"totalDataTransferMB" numeric(10, 2) DEFAULT '0' NOT NULL,
	"estimatedCostUSD" numeric(10, 4) DEFAULT '0' NOT NULL,
	"uniqueUsers" integer DEFAULT 0 NOT NULL,
	"uniqueProperties" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metricsHourly" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "metricsHourly_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"serviceName" varchar(64) NOT NULL,
	"hour" timestamp NOT NULL,
	"totalRequests" integer DEFAULT 0 NOT NULL,
	"successfulRequests" integer DEFAULT 0 NOT NULL,
	"failedRequests" integer DEFAULT 0 NOT NULL,
	"cacheHits" integer DEFAULT 0 NOT NULL,
	"cacheMisses" integer DEFAULT 0 NOT NULL,
	"avgResponseTimeMs" integer DEFAULT 0 NOT NULL,
	"p50ResponseTimeMs" integer DEFAULT 0 NOT NULL,
	"p95ResponseTimeMs" integer DEFAULT 0 NOT NULL,
	"p99ResponseTimeMs" integer DEFAULT 0 NOT NULL,
	"totalDataTransferMB" numeric(10, 2) DEFAULT '0' NOT NULL,
	"estimatedCostUSD" numeric(10, 4) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "moderationActions" (
	"id" serial PRIMARY KEY NOT NULL,
	"adminId" integer NOT NULL,
	"actionType" "actionType" NOT NULL,
	"targetType" "targetType" NOT NULL,
	"targetId" integer NOT NULL,
	"reason" text,
	"notes" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mojaLoopParties" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"partyIdType" varchar(50) NOT NULL,
	"partyIdentifier" varchar(255) NOT NULL,
	"partySubIdOrType" varchar(255),
	"fspId" varchar(100),
	"displayName" varchar(255),
	"firstName" varchar(100),
	"lastName" varchar(100),
	"dateOfBirth" varchar(10),
	"verified" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "monitoringAlerts" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "monitoringAlerts_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"serviceName" varchar(64) NOT NULL,
	"alertType" varchar(64) NOT NULL,
	"severity" varchar(32) NOT NULL,
	"message" text NOT NULL,
	"threshold" varchar(255),
	"actualValue" varchar(255),
	"resolved" boolean DEFAULT false NOT NULL,
	"resolvedAt" timestamp,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "neighborhood_graph" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "neighborhood_graph_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"neighborId" integer NOT NULL,
	"distanceMiles" numeric(10, 4) NOT NULL,
	"influenceWeight" numeric(10, 6) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notificationPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailNotifications" boolean DEFAULT true NOT NULL,
	"smsNotifications" boolean DEFAULT false NOT NULL,
	"priceDropAlerts" boolean DEFAULT true NOT NULL,
	"newListingAlerts" boolean DEFAULT true NOT NULL,
	"appointmentReminders" boolean DEFAULT true NOT NULL,
	"messageNotifications" boolean DEFAULT true NOT NULL,
	"marketingEmails" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "notificationPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "notificationQueue" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type_2" "type_2" NOT NULL,
	"template" varchar(100) NOT NULL,
	"recipient" varchar(255) NOT NULL,
	"subject" varchar(255),
	"data" text,
	"status_11" "status_11" DEFAULT 'pending' NOT NULL,
	"sentAt" timestamp,
	"error" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"type" "type" NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"relatedId" integer,
	"isRead" integer DEFAULT 0,
	"readAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offerActivityLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"offerId" integer NOT NULL,
	"userId" integer NOT NULL,
	"activityType_2" "activityType_2" NOT NULL,
	"description" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "offers" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"buyerId" integer NOT NULL,
	"sellerId" integer NOT NULL,
	"agentId" integer,
	"offerAmount" integer NOT NULL,
	"earnestMoney" integer,
	"downPayment" integer,
	"financingType" "financingType" DEFAULT 'conventional' NOT NULL,
	"inspectionContingency" integer DEFAULT 1 NOT NULL,
	"appraisalContingency" integer DEFAULT 1 NOT NULL,
	"financingContingency" integer DEFAULT 1 NOT NULL,
	"proposedClosingDate" timestamp,
	"inspectionPeriod" integer DEFAULT 10,
	"status_30" "status_30" DEFAULT 'pending' NOT NULL,
	"additionalTerms" text,
	"notes" text,
	"documents" text,
	"buyerSignature" text,
	"buyerSignedAt" timestamp,
	"sellerSignature" text,
	"sellerSignedAt" timestamp,
	"expiresAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openHouseAttendees" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" integer NOT NULL,
	"registrationId" integer,
	"checkInTime" timestamp NOT NULL,
	"checkOutTime" timestamp,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openHouseEvents" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"agentId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"startTime" timestamp NOT NULL,
	"endTime" timestamp NOT NULL,
	"maxAttendees" integer,
	"registrationRequired" integer DEFAULT 1,
	"status_28" "status_28" DEFAULT 'scheduled' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openHouseFeedback" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" integer NOT NULL,
	"userId" integer,
	"rating" integer NOT NULL,
	"feedback" text,
	"interestedInProperty" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "openHouseRegistrations" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventId" integer NOT NULL,
	"userId" integer,
	"name" varchar(255) NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20),
	"numberOfGuests" integer DEFAULT 1,
	"status_29" "status_29" DEFAULT 'registered' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "paymentProviders" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(50) NOT NULL,
	"displayName" varchar(100) NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"priority" integer DEFAULT 0 NOT NULL,
	"capabilities" text,
	"supportedCurrencies" text,
	"configuration" text,
	"healthStatus" "healthStatus" DEFAULT 'healthy' NOT NULL,
	"lastHealthCheck" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "paymentProviders_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"transactionId" integer NOT NULL,
	"userId" integer NOT NULL,
	"amount" integer NOT NULL,
	"paymentType" "paymentType" NOT NULL,
	"paymentMethod" varchar(50),
	"status_3" "status_3" DEFAULT 'pending' NOT NULL,
	"paymentGateway" varchar(50),
	"gatewayTransactionId" varchar(255),
	"stripePaymentId" varchar(255),
	"metadata" text,
	"releasedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platformHealthMetrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"timestamp" timestamp NOT NULL,
	"apiResponseTimeMs" integer DEFAULT 0 NOT NULL,
	"errorRate" integer DEFAULT 0 NOT NULL,
	"uptime" integer DEFAULT 100 NOT NULL,
	"dailyActiveUsers" integer DEFAULT 0 NOT NULL,
	"avgSessionDurationMinutes" integer DEFAULT 0 NOT NULL,
	"pageViewsPerSession" integer DEFAULT 0 NOT NULL,
	"newListingsToday" integer DEFAULT 0 NOT NULL,
	"searchesPerformed" integer DEFAULT 0 NOT NULL,
	"messagesExchanged" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricing_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"basePrice" varchar(20) NOT NULL,
	"strategy" "pricingStrategy" DEFAULT 'dynamic' NOT NULL,
	"weekendMultiplier" varchar(10) DEFAULT '1.2' NOT NULL,
	"highSeasonStart" varchar(10),
	"highSeasonEnd" varchar(10),
	"highSeasonMultiplier" varchar(10) DEFAULT '1.5' NOT NULL,
	"lowSeasonStart" varchar(10),
	"lowSeasonEnd" varchar(10),
	"lowSeasonMultiplier" varchar(10) DEFAULT '0.8' NOT NULL,
	"enableDemandPricing" integer DEFAULT 1 NOT NULL,
	"demandMultiplierMin" varchar(10) DEFAULT '0.8' NOT NULL,
	"demandMultiplierMax" varchar(10) DEFAULT '1.5' NOT NULL,
	"lastMinuteDays" integer DEFAULT 7 NOT NULL,
	"lastMinuteDiscount" varchar(10) DEFAULT '0.15' NOT NULL,
	"weeklyDiscount" varchar(10) DEFAULT '0.1' NOT NULL,
	"monthlyDiscount" varchar(10) DEFAULT '0.2' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projectMilestones" (
	"id" serial PRIMARY KEY NOT NULL,
	"projectId" integer NOT NULL,
	"milestoneNumber" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"description" text,
	"paymentPercentage" integer,
	"paymentAmount" integer,
	"status_6" "status_6" DEFAULT 'pending' NOT NULL,
	"targetDate" timestamp,
	"completedDate" timestamp,
	"verifiedDate" timestamp,
	"verifiedBy" integer,
	"progressPhotos" text,
	"inspectionReport" text,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" serial PRIMARY KEY NOT NULL,
	"externalId" varchar(128),
	"addressLine1" varchar(255) NOT NULL,
	"addressLine2" varchar(255),
	"city" varchar(100) NOT NULL,
	"state" varchar(50) NOT NULL,
	"zipCode" varchar(20) NOT NULL,
	"country" varchar(50) DEFAULT 'USA' NOT NULL,
	"latitude" varchar(20) NOT NULL,
	"longitude" varchar(20) NOT NULL,
	"propertyType" "propertyType" NOT NULL,
	"listingType" "listingType" NOT NULL,
	"status" "status" DEFAULT 'active' NOT NULL,
	"bedrooms" integer,
	"bathrooms" integer,
	"squareFeet" integer,
	"lotSize" integer,
	"yearBuilt" integer,
	"price" integer NOT NULL,
	"pricePerSqFt" integer,
	"title" varchar(255),
	"description" text,
	"features" text,
	"primaryImage" text,
	"images" text,
	"virtualTourUrl" text,
	"listDate" timestamp,
	"soldDate" timestamp,
	"daysOnMarket" integer,
	"viewCount" integer DEFAULT 0,
	"ownerId" integer,
	"agentId" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyApprovals" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"status_13" "status_13" DEFAULT 'pending' NOT NULL,
	"reviewedByAdminId" integer,
	"reviewNotes" text,
	"rejectionReason" text,
	"submittedAt" timestamp DEFAULT now() NOT NULL,
	"reviewedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "propertyComparisons" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255),
	"propertyIds" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyHistory" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"price" integer NOT NULL,
	"status" "status" NOT NULL,
	"listingType" "listingType" NOT NULL,
	"latitude" varchar(20) NOT NULL,
	"longitude" varchar(20) NOT NULL,
	"snapshotDate" timestamp NOT NULL,
	"changeType" "changeType" NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"reportedByUserId" integer NOT NULL,
	"reason" "reason" NOT NULL,
	"description" text,
	"status_12" "status_12" DEFAULT 'pending' NOT NULL,
	"reviewedByAdminId" integer,
	"reviewNotes" text,
	"action" "action",
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "propertyReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"reviewerId" integer NOT NULL,
	"overallRating" integer NOT NULL,
	"locationRating" integer,
	"valueRating" integer,
	"conditionRating" integer,
	"title" varchar(255),
	"review" text NOT NULL,
	"pros" text,
	"cons" text,
	"photos" text,
	"status_7" "status_7" DEFAULT 'pending' NOT NULL,
	"verifiedPurchase" integer DEFAULT 0,
	"helpfulCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "property_tracking_preferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"trackingEnabled" integer DEFAULT 1 NOT NULL,
	"notifyOnPriceChange" integer DEFAULT 1 NOT NULL,
	"notifyOnNewCompetitor" integer DEFAULT 1 NOT NULL,
	"notifyOnStatusChange" integer DEFAULT 1 NOT NULL,
	"checkFrequency" varchar(20) DEFAULT 'daily' NOT NULL,
	"priceChangeThreshold" integer DEFAULT 5,
	"lastCheckedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "property_tracking_preferences_propertyId_unique" UNIQUE("propertyId")
);
--> statement-breakpoint
CREATE TABLE "property_valuations" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "property_valuations_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"estimatedValue" numeric(15, 2) NOT NULL,
	"lowerBound" numeric(15, 2) NOT NULL,
	"upperBound" numeric(15, 2) NOT NULL,
	"confidence" numeric(5, 4) NOT NULL,
	"modelType" varchar(50) NOT NULL,
	"source" varchar(50) NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "propertyViews" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"userId" integer,
	"sessionId" varchar(255),
	"ipAddress" varchar(45),
	"userAgent" text,
	"referrer" text,
	"viewDuration" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "providerTransactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"providerId" integer NOT NULL,
	"providerTransactionId" varchar(255) NOT NULL,
	"transactionType" varchar(50) NOT NULL,
	"amount" integer NOT NULL,
	"currency" varchar(3) NOT NULL,
	"status" varchar(50) NOT NULL,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pushNotificationLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"subscriptionId" integer,
	"title" varchar(255) NOT NULL,
	"body" text NOT NULL,
	"icon" text,
	"badge" text,
	"data" text,
	"notificationType" "notificationType" NOT NULL,
	"status_20" "status_20" DEFAULT 'sent' NOT NULL,
	"errorMessage" text,
	"clickedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pushSubscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"endpoint" text NOT NULL,
	"p256dh" text NOT NULL,
	"auth" text NOT NULL,
	"userAgent" text,
	"deviceType" varchar(50),
	"isActive" integer DEFAULT 1 NOT NULL,
	"lastUsed" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reEngagementCampaignLogs" (
	"id" serial PRIMARY KEY NOT NULL,
	"campaignId" integer NOT NULL,
	"userId" integer NOT NULL,
	"emailSequenceIndex" integer NOT NULL,
	"emailSubject" varchar(255),
	"status_36" "status_36" NOT NULL,
	"scheduledFor" timestamp,
	"sentAt" timestamp,
	"deliveredAt" timestamp,
	"openedAt" timestamp,
	"clickedAt" timestamp,
	"errorMessage" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "reEngagementCampaigns" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"inactivityDays" integer DEFAULT 30 NOT NULL,
	"targetSegment" "targetSegment" DEFAULT 'all' NOT NULL,
	"emailSequence" text NOT NULL,
	"delayBetweenEmails" integer DEFAULT 3 NOT NULL,
	"maxEmails" integer DEFAULT 3 NOT NULL,
	"status_21" "status_21" DEFAULT 'draft' NOT NULL,
	"totalTriggered" integer DEFAULT 0 NOT NULL,
	"totalReEngaged" integer DEFAULT 0 NOT NULL,
	"totalUnsubscribed" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendationExperiments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"status_21" "status_21" DEFAULT 'draft' NOT NULL,
	"variants" text NOT NULL,
	"trafficAllocation" text NOT NULL,
	"startDate" timestamp,
	"endDate" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_feedback" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recommendation_feedback_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"feedbackType" "feedbackType" NOT NULL,
	"rating" integer,
	"recommendationSource" varchar(100),
	"recommendationScore" integer,
	"comment" text,
	"reasons" json,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "recommendation_preferences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "recommendation_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"userId" integer NOT NULL,
	"preferredCities" json,
	"preferredNeighborhoods" json,
	"excludedAreas" json,
	"propertyTypes" json,
	"minBedrooms" integer,
	"maxBedrooms" integer,
	"minBathrooms" integer,
	"minPrice" integer,
	"maxPrice" integer,
	"requiredFeatures" json,
	"preferredFeatures" json,
	"enableEmailDigest" boolean DEFAULT true NOT NULL,
	"digestFrequency" varchar(20) DEFAULT 'weekly',
	"maxRecommendationsPerDay" integer DEFAULT 10,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "recommendation_preferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "reviewReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewId" integer NOT NULL,
	"reportedByUserId" integer NOT NULL,
	"reason_3" "reason_3" NOT NULL,
	"description" text,
	"status_12" "status_12" DEFAULT 'pending' NOT NULL,
	"reviewedByAdminId" integer,
	"reviewNotes" text,
	"action_3" "action_3",
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "reviewVotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"reviewId" integer NOT NULL,
	"userId" integer NOT NULL,
	"isHelpful" boolean NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "satelliteImageryAnalysis" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "satelliteImageryAnalysis_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"buildingFootprintSqm" integer,
	"estimatedHeightM" integer,
	"numFloors" integer,
	"roofMaterial" "roofMaterial",
	"roofCondition" "roofCondition",
	"buildingDensity" integer,
	"greenSpaceRatio" integer,
	"roadAccessQuality" "roadAccessQuality",
	"amenityDensity" integer,
	"roadDensityKm" integer,
	"commercialRatio" integer,
	"infrastructureScore" integer,
	"analysisConfidence" integer NOT NULL,
	"dataQuality" "dataQuality",
	"dataSources" text,
	"analysisTimestamp" timestamp NOT NULL,
	"valuationMultiplier" integer,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_map_search_alerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"savedSearchId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"userId" integer NOT NULL,
	"notificationSent" integer DEFAULT 0 NOT NULL,
	"notificationSentAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "saved_map_searches" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"northEastLat" real NOT NULL,
	"northEastLng" real NOT NULL,
	"southWestLat" real NOT NULL,
	"southWestLng" real NOT NULL,
	"city" varchar(255),
	"checkIn" timestamp,
	"checkOut" timestamp,
	"guests" integer,
	"minPrice" integer,
	"maxPrice" integer,
	"amenities" text,
	"alertEnabled" integer DEFAULT 1 NOT NULL,
	"lastAlertSent" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savedMapViews" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"centerLat" varchar(20) NOT NULL,
	"centerLng" varchar(20) NOT NULL,
	"zoom" integer NOT NULL,
	"filters" text,
	"heatmapMode" "heatmapMode" DEFAULT 'none',
	"heatmapIntensity" integer DEFAULT 100,
	"heatmapRadius" integer DEFAULT 25,
	"clusteringEnabled" integer DEFAULT 1,
	"minClusterSize" integer DEFAULT 2,
	"isDefault" integer DEFAULT 0,
	"shareToken" varchar(64),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "savedSearches" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"searchCriteria" text NOT NULL,
	"boundaryType" "boundaryType" DEFAULT 'none',
	"boundaryData" text,
	"notificationsEnabled" integer DEFAULT 1,
	"lastNotified" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "searchAlerts" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"savedSearchId" integer,
	"alertName" varchar(255) NOT NULL,
	"searchCriteria" text NOT NULL,
	"frequency" "frequency" DEFAULT 'daily' NOT NULL,
	"isActive" integer DEFAULT 1,
	"lastTriggered" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "serviceHealth" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "serviceHealth_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"serviceName" varchar(64) NOT NULL,
	"status" varchar(32) NOT NULL,
	"mockMode" boolean DEFAULT true NOT NULL,
	"initialized" boolean DEFAULT false NOT NULL,
	"lastCheckAt" timestamp DEFAULT now() NOT NULL,
	"responseTimeMs" integer,
	"errorMessage" text,
	"metadata" json,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortLetBookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"guestId" integer NOT NULL,
	"hostId" integer NOT NULL,
	"checkIn" timestamp NOT NULL,
	"checkOut" timestamp NOT NULL,
	"nights" integer NOT NULL,
	"numberOfGuests" integer NOT NULL,
	"nightlyRate" integer NOT NULL,
	"totalNights" integer NOT NULL,
	"cleaningFee" integer,
	"serviceFee" integer,
	"totalAmount" integer NOT NULL,
	"status_9" "status_9" DEFAULT 'pending' NOT NULL,
	"paymentStatus" "paymentStatus" DEFAULT 'pending' NOT NULL,
	"paymentId" integer,
	"specialRequests" text,
	"hostNotes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortLetProperties" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"hostId" integer NOT NULL,
	"nightlyRate" integer NOT NULL,
	"weeklyRate" integer,
	"monthlyRate" integer,
	"cleaningFee" integer,
	"securityDeposit" integer,
	"minimumStay" integer DEFAULT 1,
	"maximumStay" integer,
	"instantBooking" integer DEFAULT 0,
	"amenities" text,
	"houseRules" text,
	"maxGuests" integer NOT NULL,
	"availabilityCalendar" text,
	"blockedDates" text,
	"status_8" "status_8" DEFAULT 'active' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortlet_availability" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"date" timestamp NOT NULL,
	"isAvailable" integer DEFAULT 1 NOT NULL,
	"priceOverride" integer,
	"minimumStay" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "shortletReviews" (
	"id" serial PRIMARY KEY NOT NULL,
	"bookingId" integer NOT NULL,
	"propertyId" integer NOT NULL,
	"guestId" integer NOT NULL,
	"hostId" integer NOT NULL,
	"overallRating" integer NOT NULL,
	"cleanlinessRating" integer,
	"accuracyRating" integer,
	"communicationRating" integer,
	"locationRating" integer,
	"valueRating" integer,
	"reviewText" text,
	"photos" text,
	"hostResponse" text,
	"hostRespondedAt" timestamp,
	"helpfulCount" integer DEFAULT 0 NOT NULL,
	"notHelpfulCount" integer DEFAULT 0 NOT NULL,
	"isVerifiedBooking" boolean DEFAULT true NOT NULL,
	"status_7" "status_7" DEFAULT 'published' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatureAuditLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"signatureRequestId" integer NOT NULL,
	"recipientId" integer,
	"action" varchar(100) NOT NULL,
	"description" text,
	"ipAddress" varchar(45),
	"userAgent" text,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatureRecipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"signatureRequestId" integer NOT NULL,
	"userId" integer,
	"email" varchar(320) NOT NULL,
	"name" varchar(255) NOT NULL,
	"role_2" "role_2" DEFAULT 'signer' NOT NULL,
	"routingOrder" integer DEFAULT 1 NOT NULL,
	"status_19" "status_19" DEFAULT 'pending' NOT NULL,
	"signedAt" timestamp,
	"declinedAt" timestamp,
	"declineReason" text,
	"ipAddress" varchar(45),
	"userAgent" text,
	"externalRecipientId" varchar(255),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signatureRequests" (
	"id" serial PRIMARY KEY NOT NULL,
	"documentId" integer NOT NULL,
	"transactionId" integer,
	"propertyId" integer,
	"createdByUserId" integer NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text,
	"status_18" "status_18" DEFAULT 'draft' NOT NULL,
	"expiresAt" timestamp,
	"completedAt" timestamp,
	"provider" varchar(50),
	"externalEnvelopeId" varchar(255),
	"externalStatus" varchar(50),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "special_event_pricing" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"eventName" varchar(255) NOT NULL,
	"startDate" timestamp NOT NULL,
	"endDate" timestamp NOT NULL,
	"priceMultiplier" varchar(10) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "taxReporting" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"year" integer NOT NULL,
	"totalEscrowVolume" integer NOT NULL,
	"transactionCount" integer NOT NULL,
	"reportType" varchar(50),
	"reportStatus" "reportStatus" NOT NULL,
	"reportUrl" text,
	"filedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tigerBeetleAccounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"escrowId" integer NOT NULL,
	"accountId" varchar(128) NOT NULL,
	"accountType" "accountType" NOT NULL,
	"ledger" integer NOT NULL,
	"code" integer NOT NULL,
	"balance" varchar(50) DEFAULT '0' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tigerBeetleAccounts_accountId_unique" UNIQUE("accountId")
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"buyerId" integer,
	"sellerId" integer,
	"agentId" integer,
	"transactionType" "transactionType" NOT NULL,
	"status_2" "status_2" DEFAULT 'pending' NOT NULL,
	"amount" integer NOT NULL,
	"depositAmount" integer,
	"closingDate" timestamp,
	"notes" text,
	"documents" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userActivity" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"sessionId" varchar(255),
	"activityType" "activityType" NOT NULL,
	"propertyId" integer,
	"searchQuery" text,
	"metadata" text,
	"duration" integer,
	"timestamp" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "userActivityTracking" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"lastLoginAt" timestamp,
	"lastPropertyViewAt" timestamp,
	"lastSearchAt" timestamp,
	"lastOfferAt" timestamp,
	"lastMessageAt" timestamp,
	"engagementScore" integer DEFAULT 50 NOT NULL,
	"isInactive" integer DEFAULT 0 NOT NULL,
	"inactiveSince" timestamp,
	"reEngagementCampaignId" integer,
	"reEngagementEmailsSent" integer DEFAULT 0 NOT NULL,
	"lastReEngagementEmailAt" timestamp,
	"wasReEngaged" integer DEFAULT 0 NOT NULL,
	"reEngagedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user_alert_preferences" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "user_alert_preferences_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"user_id" integer NOT NULL,
	"email_alerts_enabled" integer DEFAULT 1 NOT NULL,
	"push_alerts_enabled" integer DEFAULT 1 NOT NULL,
	"in_app_alerts_enabled" integer DEFAULT 1 NOT NULL,
	"sms_alerts_enabled" integer DEFAULT 0 NOT NULL,
	"max_alerts_per_day" integer DEFAULT 10 NOT NULL,
	"quiet_hours_start" integer,
	"quiet_hours_end" integer,
	"valuation_change_alerts" integer DEFAULT 1 NOT NULL,
	"market_trend_alerts" integer DEFAULT 1 NOT NULL,
	"price_drop_alerts" integer DEFAULT 1 NOT NULL,
	"new_listing_alerts" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_alert_preferences_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "userNotificationPreferences" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"emailEnabled" integer DEFAULT 1 NOT NULL,
	"smsEnabled" integer DEFAULT 0 NOT NULL,
	"pushEnabled" integer DEFAULT 1 NOT NULL,
	"escrowUpdates" integer DEFAULT 1 NOT NULL,
	"documentSigning" integer DEFAULT 1 NOT NULL,
	"propertyAlerts" integer DEFAULT 1 NOT NULL,
	"messageNotifications" integer DEFAULT 1 NOT NULL,
	"marketingEmails" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "userNotificationPreferences_userId_unique" UNIQUE("userId")
);
--> statement-breakpoint
CREATE TABLE "userReports" (
	"id" serial PRIMARY KEY NOT NULL,
	"reportedUserId" integer NOT NULL,
	"reportedByUserId" integer NOT NULL,
	"reason_2" "reason_2" NOT NULL,
	"description" text,
	"evidence" text,
	"status_12" "status_12" DEFAULT 'pending' NOT NULL,
	"reviewedByAdminId" integer,
	"reviewNotes" text,
	"action_2" "action_2",
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"resolvedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"loginMethod" varchar(64),
	"role" "role" DEFAULT 'user' NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "valuation_ab_tests" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_ab_tests_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"test_name" varchar(100) NOT NULL,
	"variant" varchar(50) NOT NULL,
	"property_id" integer NOT NULL,
	"user_id" integer,
	"session_id" varchar(255),
	"converted" integer DEFAULT 0,
	"conversion_type" varchar(50),
	"time_spent_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_alerts_sent" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_alerts_sent_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"monitoring_id" integer NOT NULL,
	"change_history_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"delivery_method" "delivery_method" NOT NULL,
	"delivery_status" "delivery_status" DEFAULT 'pending' NOT NULL,
	"alert_title" varchar(255) NOT NULL,
	"alert_message" text NOT NULL,
	"opened" integer DEFAULT 0,
	"opened_at" timestamp,
	"clicked" integer DEFAULT 0,
	"clicked_at" timestamp,
	"error_message" text,
	"retry_count" integer DEFAULT 0,
	"sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_change_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_change_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"previous_valuation" integer NOT NULL,
	"new_valuation" integer NOT NULL,
	"change_amount" integer NOT NULL,
	"change_percentage" numeric(5, 2) NOT NULL,
	"change_reason" text,
	"detected_at" timestamp DEFAULT now() NOT NULL,
	"detection_method" varchar(50),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_conversions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_conversions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"view_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"user_id" integer,
	"conversion_type" varchar(50) NOT NULL,
	"conversion_value" numeric(15, 2),
	"time_to_conversion_seconds" integer,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuationDataSources" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuationDataSources_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"valuationId" integer NOT NULL,
	"sourceName" varchar(100) NOT NULL,
	"sourceType" "sourceType" NOT NULL,
	"weight" integer NOT NULL,
	"confidence" integer NOT NULL,
	"valueContribution" integer,
	"dataQuality" "dataQuality",
	"dataCount" integer,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_feedback" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_feedback_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"user_id" integer,
	"rating" integer,
	"accuracy_rating" integer,
	"usefulness_rating" integer,
	"comment" text,
	"helpful_features" text,
	"issues_reported" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_history" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_history_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"estimatedValue" numeric(15, 2) NOT NULL,
	"actualValue" numeric(15, 2),
	"confidence" numeric(5, 4) NOT NULL,
	"modelType" varchar(50) NOT NULL,
	"valuationDate" timestamp NOT NULL,
	"error" numeric(10, 4),
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_monitoring" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_monitoring_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"user_id" integer NOT NULL,
	"alert_threshold" numeric(5, 2) NOT NULL,
	"alert_type" "alert_type" DEFAULT 'both' NOT NULL,
	"last_valuation" integer,
	"last_checked_at" timestamp,
	"is_active" integer DEFAULT 1 NOT NULL,
	"alert_frequency" "alert_frequency" DEFAULT 'instant' NOT NULL,
	"last_alert_sent_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_tab_engagement" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_tab_engagement_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"view_id" integer NOT NULL,
	"property_id" integer NOT NULL,
	"user_id" integer,
	"tab_name" varchar(50) NOT NULL,
	"time_spent_seconds" integer NOT NULL,
	"interaction_count" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuation_views" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "valuation_views_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"property_id" integer NOT NULL,
	"user_id" integer,
	"session_id" varchar(255),
	"view_duration_seconds" integer,
	"tabs_viewed" text,
	"scroll_depth" numeric(5, 2),
	"contacted_agent" integer DEFAULT 0,
	"scheduled_tour" integer DEFAULT 0,
	"added_to_favorites" integer DEFAULT 0,
	"referrer_page" varchar(255),
	"utm_source" varchar(100),
	"utm_medium" varchar(100),
	"utm_campaign" varchar(100),
	"device_type" varchar(50),
	"browser" varchar(100),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "valuations" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"estimatedValue" integer NOT NULL,
	"confidenceLower" integer,
	"confidenceUpper" integer,
	"confidenceScore" integer,
	"valuationMethod" varchar(50),
	"comparables" text,
	"factors" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "virtualTours" (
	"id" serial PRIMARY KEY NOT NULL,
	"propertyId" integer NOT NULL,
	"tourType" "tourType" NOT NULL,
	"title" varchar(255),
	"description" text,
	"mediaUrl" text NOT NULL,
	"thumbnailUrl" text,
	"viewCount" integer DEFAULT 0,
	"metadata" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "visual_assessments" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "visual_assessments_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"propertyId" integer NOT NULL,
	"overallCondition" "overallCondition" NOT NULL,
	"conditionScore" integer NOT NULL,
	"roofCondition" "roofCondition" NOT NULL,
	"hasPool" boolean DEFAULT false,
	"hasSolarPanels" boolean DEFAULT false,
	"hasDeck" boolean DEFAULT false,
	"vegetationIndex" numeric(5, 4),
	"curbAppeal" integer,
	"exteriorCondition" "exteriorCondition",
	"parkingSpaces" integer,
	"walkabilityScore" integer,
	"aerialImageUrl" text,
	"streetViewUrl" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhookActivityLog" (
	"id" serial PRIMARY KEY NOT NULL,
	"eventType" varchar(100) NOT NULL,
	"emailId" varchar(255) NOT NULL,
	"recipient" varchar(320) NOT NULL,
	"eventData" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "webhookRetries" (
	"id" serial PRIMARY KEY NOT NULL,
	"webhookId" varchar(255) NOT NULL,
	"provider" varchar(50) NOT NULL,
	"eventType" varchar(100) NOT NULL,
	"payload" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"maxAttempts" integer DEFAULT 3 NOT NULL,
	"status_16" "status_16" NOT NULL,
	"lastError" text,
	"nextRetryAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"completedAt" timestamp
);
--> statement-breakpoint
CREATE TABLE "certificate_of_occupancy" (
	"id" serial PRIMARY KEY NOT NULL,
	"land_record_id" integer NOT NULL,
	"cofo_number" varchar(100) NOT NULL,
	"file_number" varchar(100),
	"issue_date" timestamp NOT NULL,
	"expiry_date" timestamp,
	"issuing_authority" varchar(255) NOT NULL,
	"registry_source" "registrySource" NOT NULL,
	"status" "cofOStatus" DEFAULT 'pending_renewal' NOT NULL,
	"last_verified_date" timestamp,
	"holder_name" varchar(255) NOT NULL,
	"holder_address" text,
	"holder_id_number" varchar(100),
	"document_url" varchar(500),
	"document_hash" varchar(255),
	"term" varchar(100),
	"purpose" text,
	"conditions" text,
	"is_authentic" boolean DEFAULT false,
	"verification_score" integer,
	"verification_notes" text,
	"blockchain_hash" varchar(255),
	"is_on_blockchain" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "certificate_of_occupancy_cofo_number_unique" UNIQUE("cofo_number")
);
--> statement-breakpoint
CREATE TABLE "cofo_verification_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" integer,
	"cofo_number" varchar(100) NOT NULL,
	"state" varchar(50),
	"multi_state" boolean DEFAULT false,
	"is_valid" boolean,
	"verification_score" integer,
	"status" varchar(50),
	"result_data" json,
	"consensus_data" json,
	"sources" json,
	"cached" boolean DEFAULT false,
	"response_time" integer,
	"api_call_count" integer DEFAULT 1,
	"user_agent" varchar(500),
	"ip_address" varchar(45),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "government_registry_sync" (
	"id" serial PRIMARY KEY NOT NULL,
	"registry_source" "registrySource" NOT NULL,
	"registry_api_endpoint" varchar(500),
	"sync_type" varchar(50) NOT NULL,
	"status" "syncStatus" DEFAULT 'pending' NOT NULL,
	"started_at" timestamp,
	"completed_at" timestamp,
	"next_scheduled_sync" timestamp,
	"records_processed" integer DEFAULT 0,
	"records_added" integer DEFAULT 0,
	"records_updated" integer DEFAULT 0,
	"records_failed" integer DEFAULT 0,
	"error_count" integer DEFAULT 0,
	"error_log" json,
	"duration_seconds" integer,
	"api_call_count" integer DEFAULT 0,
	"sync_triggered_by" integer,
	"sync_metadata" json,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "land_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"land_record_id" integer NOT NULL,
	"document_type" "landDocumentType" NOT NULL,
	"document_name" varchar(255) NOT NULL,
	"document_number" varchar(100),
	"file_url" varchar(500) NOT NULL,
	"file_size" integer,
	"file_type" varchar(50),
	"file_hash" varchar(255),
	"issue_date" timestamp,
	"expiry_date" timestamp,
	"issuing_authority" varchar(255),
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verified_by" integer,
	"uploaded_by" integer NOT NULL,
	"is_public" boolean DEFAULT false,
	"description" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "land_ownership_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"land_record_id" integer NOT NULL,
	"transfer_type" "transferType" NOT NULL,
	"transfer_date" timestamp NOT NULL,
	"previous_owner_id" integer,
	"previous_owner_name" varchar(255),
	"new_owner_id" integer,
	"new_owner_name" varchar(255) NOT NULL,
	"sale_price" numeric(15, 2),
	"currency" varchar(10) DEFAULT 'NGN',
	"deed_of_assignment_url" varchar(500),
	"governor_consent_url" varchar(500),
	"receipt_url" varchar(500),
	"lawyer_name" varchar(255),
	"lawyer_firm_name" varchar(255),
	"registration_number" varchar(100),
	"blockchain_transaction_hash" varchar(255),
	"is_on_blockchain" boolean DEFAULT false,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "land_records" (
	"id" serial PRIMARY KEY NOT NULL,
	"parcel_id" varchar(100) NOT NULL,
	"property_id" integer,
	"address" text NOT NULL,
	"city" varchar(100) NOT NULL,
	"state" varchar(100) NOT NULL,
	"lga" varchar(100),
	"ward" varchar(100),
	"latitude" numeric(10, 8),
	"longitude" numeric(11, 8),
	"land_size" numeric(12, 2),
	"land_size_unit" varchar(20) DEFAULT 'sqm',
	"land_use_type" "landUseType" NOT NULL,
	"zoning" varchar(100),
	"current_owner_id" integer,
	"ownership_type" "ownershipType" NOT NULL,
	"is_verified" boolean DEFAULT false,
	"verified_at" timestamp,
	"verified_by" integer,
	"blockchain_hash" varchar(255),
	"blockchain_transaction_id" varchar(255),
	"is_on_blockchain" boolean DEFAULT false,
	"description" text,
	"metadata" json,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "land_records_parcel_id_unique" UNIQUE("parcel_id")
);
--> statement-breakpoint
CREATE TABLE "land_verification_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"land_record_id" integer NOT NULL,
	"cofo_id" integer,
	"request_type" varchar(50) NOT NULL,
	"status" "landVerificationStatus" DEFAULT 'pending' NOT NULL,
	"requested_by" integer NOT NULL,
	"requested_at" timestamp DEFAULT now() NOT NULL,
	"assigned_to" integer,
	"assigned_at" timestamp,
	"started_at" timestamp,
	"completed_at" timestamp,
	"verification_result" varchar(50),
	"verification_score" integer,
	"verification_report" text,
	"verification_report_url" varchar(500),
	"issues_found" json,
	"recommended_actions" text,
	"documents_checked" json,
	"registry_check_performed" boolean DEFAULT false,
	"registry_check_result" json,
	"blockchain_check_performed" boolean DEFAULT false,
	"blockchain_check_result" json,
	"verification_fee" numeric(10, 2),
	"payment_status" varchar(50),
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_alert_evaluation_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"evaluationType" varchar(50) NOT NULL,
	"propertiesEvaluated" integer NOT NULL,
	"alertsTriggered" integer NOT NULL,
	"subscriptionsChecked" integer NOT NULL,
	"notificationsSent" integer NOT NULL,
	"executionTimeMs" integer NOT NULL,
	"gnnInferenceTimeMs" integer,
	"cacheHitRate" real,
	"errorCount" integer DEFAULT 0 NOT NULL,
	"errorDetails" text,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "gnn_alert_performance_metrics" (
	"id" serial PRIMARY KEY NOT NULL,
	"alertType" varchar(50) NOT NULL,
	"totalSent" integer DEFAULT 0 NOT NULL,
	"totalViewed" integer DEFAULT 0 NOT NULL,
	"totalDismissed" integer DEFAULT 0 NOT NULL,
	"totalPropertyViews" integer DEFAULT 0 NOT NULL,
	"totalPropertySaves" integer DEFAULT 0 NOT NULL,
	"totalAgentContacts" integer DEFAULT 0 NOT NULL,
	"viewRate" real,
	"engagementRate" real,
	"dismissRate" real,
	"truePositives" integer DEFAULT 0 NOT NULL,
	"falsePositives" integer DEFAULT 0 NOT NULL,
	"precision" real,
	"periodStart" timestamp NOT NULL,
	"periodEnd" timestamp NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "certificate_of_occupancy" ADD CONSTRAINT "certificate_of_occupancy_land_record_id_land_records_id_fk" FOREIGN KEY ("land_record_id") REFERENCES "public"."land_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cofo_verification_history" ADD CONSTRAINT "cofo_verification_history_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "government_registry_sync" ADD CONSTRAINT "government_registry_sync_sync_triggered_by_users_id_fk" FOREIGN KEY ("sync_triggered_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_documents" ADD CONSTRAINT "land_documents_land_record_id_land_records_id_fk" FOREIGN KEY ("land_record_id") REFERENCES "public"."land_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_documents" ADD CONSTRAINT "land_documents_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_documents" ADD CONSTRAINT "land_documents_uploaded_by_users_id_fk" FOREIGN KEY ("uploaded_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_ownership_history" ADD CONSTRAINT "land_ownership_history_land_record_id_land_records_id_fk" FOREIGN KEY ("land_record_id") REFERENCES "public"."land_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_ownership_history" ADD CONSTRAINT "land_ownership_history_previous_owner_id_users_id_fk" FOREIGN KEY ("previous_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_ownership_history" ADD CONSTRAINT "land_ownership_history_new_owner_id_users_id_fk" FOREIGN KEY ("new_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_records" ADD CONSTRAINT "land_records_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_records" ADD CONSTRAINT "land_records_current_owner_id_users_id_fk" FOREIGN KEY ("current_owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_records" ADD CONSTRAINT "land_records_verified_by_users_id_fk" FOREIGN KEY ("verified_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_verification_requests" ADD CONSTRAINT "land_verification_requests_land_record_id_land_records_id_fk" FOREIGN KEY ("land_record_id") REFERENCES "public"."land_records"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_verification_requests" ADD CONSTRAINT "land_verification_requests_cofo_id_certificate_of_occupancy_id_fk" FOREIGN KEY ("cofo_id") REFERENCES "public"."certificate_of_occupancy"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_verification_requests" ADD CONSTRAINT "land_verification_requests_requested_by_users_id_fk" FOREIGN KEY ("requested_by") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "land_verification_requests" ADD CONSTRAINT "land_verification_requests_assigned_to_users_id_fk" FOREIGN KEY ("assigned_to") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "gnn_log_type_idx" ON "gnn_inference_log" USING btree ("inferenceType");--> statement-breakpoint
CREATE INDEX "gnn_log_created_idx" ON "gnn_inference_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "gnn_trend_cache_neighborhood_idx" ON "gnn_market_trend_cache" USING btree ("neighborhoodId");--> statement-breakpoint
CREATE INDEX "gnn_trend_cache_expires_idx" ON "gnn_market_trend_cache" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "gnn_intel_cache_neighborhood_idx" ON "gnn_neighborhood_intel_cache" USING btree ("neighborhoodId");--> statement-breakpoint
CREATE INDEX "gnn_intel_cache_expires_idx" ON "gnn_neighborhood_intel_cache" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "gnn_val_cache_property_idx" ON "gnn_valuation_cache" USING btree ("propertyId");--> statement-breakpoint
CREATE INDEX "gnn_val_cache_expires_idx" ON "gnn_valuation_cache" USING btree ("expiresAt");--> statement-breakpoint
CREATE INDEX "gnn_val_cache_valid_idx" ON "gnn_valuation_cache" USING btree ("isValid");--> statement-breakpoint
CREATE INDEX "user_id_idx" ON "user_alert_preferences" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "test_name_idx" ON "valuation_ab_tests" USING btree ("test_name");--> statement-breakpoint
CREATE INDEX "variant_idx" ON "valuation_ab_tests" USING btree ("variant");--> statement-breakpoint
CREATE INDEX "val_alert_sent_user_idx" ON "valuation_alerts_sent" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "val_alert_sent_property_idx" ON "valuation_alerts_sent" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "val_alert_sent_delivery_status_idx" ON "valuation_alerts_sent" USING btree ("delivery_status");--> statement-breakpoint
CREATE INDEX "property_id_idx" ON "valuation_change_history" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "detected_at_idx" ON "valuation_change_history" USING btree ("detected_at");--> statement-breakpoint
CREATE INDEX "val_conv_property_idx" ON "valuation_conversions" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "val_conv_type_idx" ON "valuation_conversions" USING btree ("conversion_type");--> statement-breakpoint
CREATE INDEX "val_conv_created_idx" ON "valuation_conversions" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "val_feedback_property_idx" ON "valuation_feedback" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "val_feedback_rating_idx" ON "valuation_feedback" USING btree ("rating");--> statement-breakpoint
CREATE INDEX "val_mon_user_idx" ON "valuation_monitoring" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "val_mon_property_idx" ON "valuation_monitoring" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "val_mon_active_idx" ON "valuation_monitoring" USING btree ("is_active");--> statement-breakpoint
CREATE INDEX "view_id_idx" ON "valuation_tab_engagement" USING btree ("view_id");--> statement-breakpoint
CREATE INDEX "tab_name_idx" ON "valuation_tab_engagement" USING btree ("tab_name");--> statement-breakpoint
CREATE INDEX "val_view_property_idx" ON "valuation_views" USING btree ("property_id");--> statement-breakpoint
CREATE INDEX "val_view_user_idx" ON "valuation_views" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "val_view_created_idx" ON "valuation_views" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "cofo_number_idx" ON "certificate_of_occupancy" USING btree ("cofo_number");--> statement-breakpoint
CREATE INDEX "cofo_land_record_idx" ON "certificate_of_occupancy" USING btree ("land_record_id");--> statement-breakpoint
CREATE INDEX "cofo_status_idx" ON "certificate_of_occupancy" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verification_history_user_idx" ON "cofo_verification_history" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_history_cofo_idx" ON "cofo_verification_history" USING btree ("cofo_number");--> statement-breakpoint
CREATE INDEX "verification_history_date_idx" ON "cofo_verification_history" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "verification_history_state_idx" ON "cofo_verification_history" USING btree ("state");--> statement-breakpoint
CREATE INDEX "registry_sync_source_idx" ON "government_registry_sync" USING btree ("registry_source");--> statement-breakpoint
CREATE INDEX "registry_sync_status_idx" ON "government_registry_sync" USING btree ("status");--> statement-breakpoint
CREATE INDEX "registry_sync_date_idx" ON "government_registry_sync" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "land_documents_land_idx" ON "land_documents" USING btree ("land_record_id");--> statement-breakpoint
CREATE INDEX "land_documents_type_idx" ON "land_documents" USING btree ("document_type");--> statement-breakpoint
CREATE INDEX "ownership_history_land_idx" ON "land_ownership_history" USING btree ("land_record_id");--> statement-breakpoint
CREATE INDEX "ownership_history_date_idx" ON "land_ownership_history" USING btree ("transfer_date");--> statement-breakpoint
CREATE INDEX "ownership_history_owner_idx" ON "land_ownership_history" USING btree ("new_owner_id");--> statement-breakpoint
CREATE INDEX "land_records_parcel_id_idx" ON "land_records" USING btree ("parcel_id");--> statement-breakpoint
CREATE INDEX "land_records_owner_idx" ON "land_records" USING btree ("current_owner_id");--> statement-breakpoint
CREATE INDEX "land_records_city_idx" ON "land_records" USING btree ("city");--> statement-breakpoint
CREATE INDEX "land_records_verified_idx" ON "land_records" USING btree ("is_verified");--> statement-breakpoint
CREATE INDEX "verification_requests_land_idx" ON "land_verification_requests" USING btree ("land_record_id");--> statement-breakpoint
CREATE INDEX "verification_requests_status_idx" ON "land_verification_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "verification_requests_requester_idx" ON "land_verification_requests" USING btree ("requested_by");--> statement-breakpoint
CREATE INDEX "gnn_eval_log_type_idx" ON "gnn_alert_evaluation_log" USING btree ("evaluationType");--> statement-breakpoint
CREATE INDEX "gnn_eval_log_created_idx" ON "gnn_alert_evaluation_log" USING btree ("createdAt");--> statement-breakpoint
CREATE INDEX "gnn_perf_type_idx" ON "gnn_alert_performance_metrics" USING btree ("alertType");--> statement-breakpoint
CREATE INDEX "gnn_perf_period_idx" ON "gnn_alert_performance_metrics" USING btree ("periodStart","periodEnd");