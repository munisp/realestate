CREATE TABLE "generated_verification_reports" (
	"id" serial PRIMARY KEY NOT NULL,
	"verificationRequestId" integer NOT NULL,
	"templateId" integer,
	"generatedBy" integer NOT NULL,
	"reportUrl" varchar(500) NOT NULL,
	"fileSize" integer,
	"downloadCount" integer DEFAULT 0 NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification_report_templates" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer NOT NULL,
	"name" varchar(255) NOT NULL,
	"logoUrl" varchar(500),
	"companyName" varchar(255),
	"primaryColor" varchar(7),
	"secondaryColor" varchar(7),
	"footerText" text,
	"includeWatermark" boolean DEFAULT false NOT NULL,
	"watermarkText" varchar(100),
	"isDefault" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
