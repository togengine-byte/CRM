DROP TYPE IF EXISTS "public"."entity_type" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."quote_status" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."user_role" CASCADE;--> statement-breakpoint
DROP TYPE IF EXISTS "public"."user_status" CASCADE;--> statement-breakpoint
CREATE TYPE "public"."entity_type" AS ENUM('customer', 'quote');--> statement-breakpoint
CREATE TYPE "public"."quote_status" AS ENUM('draft', 'sent', 'approved', 'rejected', 'superseded', 'in_production', 'ready');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('admin', 'employee', 'customer', 'supplier', 'courier');--> statement-breakpoint
CREATE TYPE "public"."user_status" AS ENUM('pending_approval', 'active', 'rejected', 'deactivated');--> statement-breakpoint
CREATE TABLE "activity_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"userId" integer,
	"actionType" varchar(100) NOT NULL,
	"details" jsonb,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "base_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"category" varchar(100),
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_pricelists" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer NOT NULL,
	"pricelistId" integer NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "customer_signup_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"requestId" varchar(64) NOT NULL,
	"name" text NOT NULL,
	"email" varchar(320) NOT NULL,
	"phone" varchar(20) NOT NULL,
	"companyName" text,
	"description" text NOT NULL,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"files" jsonb DEFAULT '[]',
	"processedAt" timestamp,
	"processedBy" integer,
	"notes" text,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "customer_signup_requests_requestId_unique" UNIQUE("requestId")
);
--> statement-breakpoint
CREATE TABLE "internal_notes" (
	"id" serial PRIMARY KEY NOT NULL,
	"entityType" "entity_type" NOT NULL,
	"entityId" integer NOT NULL,
	"authorId" integer NOT NULL,
	"content" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricelist_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"pricelistId" integer NOT NULL,
	"productVariantId" integer NOT NULL,
	"minQuantity" integer DEFAULT 1,
	"maxQuantity" integer,
	"pricePerUnit" numeric(10, 2) NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pricelists" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"isDefault" boolean DEFAULT false,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "product_variants" (
	"id" serial PRIMARY KEY NOT NULL,
	"baseProductId" integer NOT NULL,
	"sku" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"attributes" jsonb,
	"validationProfileId" integer,
	"isActive" boolean DEFAULT true,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "product_variants_sku_unique" UNIQUE("sku")
);
--> statement-breakpoint
CREATE TABLE "quote_attachments" (
	"id" serial PRIMARY KEY NOT NULL,
	"quoteId" integer NOT NULL,
	"quoteItemId" integer,
	"fileName" varchar(255) NOT NULL,
	"fileUrl" text NOT NULL,
	"fileSize" integer,
	"mimeType" varchar(100),
	"uploadedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_file_warnings" (
	"id" serial PRIMARY KEY NOT NULL,
	"quoteId" integer NOT NULL,
	"attachmentId" integer NOT NULL,
	"warningType" varchar(100) NOT NULL,
	"severity" varchar(20) DEFAULT 'warning' NOT NULL,
	"message" text NOT NULL,
	"details" text,
	"currentValue" varchar(255),
	"requiredValue" varchar(255),
	"isAcknowledged" boolean DEFAULT false,
	"acknowledgedBy" integer,
	"acknowledgedAt" timestamp,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"quoteId" integer NOT NULL,
	"productVariantId" integer NOT NULL,
	"quantity" integer NOT NULL,
	"priceAtTimeOfQuote" numeric(10, 2) NOT NULL,
	"isUpsell" boolean DEFAULT false,
	"supplierId" integer,
	"supplierCost" numeric(10, 2),
	"deliveryDays" integer,
	"pickedUp" boolean DEFAULT false,
	"pickedUpAt" timestamp,
	"pickedUpBy" integer,
	"delivered" boolean DEFAULT false,
	"deliveredAt" timestamp,
	"deliveredBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" serial PRIMARY KEY NOT NULL,
	"customerId" integer NOT NULL,
	"employeeId" integer,
	"status" "quote_status" DEFAULT 'draft' NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"parentQuoteId" integer,
	"finalValue" numeric(12, 2),
	"rejectionReason" text,
	"dealRating" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "supplier_prices" (
	"id" serial PRIMARY KEY NOT NULL,
	"supplierId" integer NOT NULL,
	"productVariantId" integer NOT NULL,
	"minQuantity" integer DEFAULT 1,
	"maxQuantity" integer,
	"pricePerUnit" numeric(10, 2) NOT NULL,
	"deliveryDays" integer DEFAULT 3,
	"qualityRating" numeric(3, 2),
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "system_settings" (
	"id" serial PRIMARY KEY NOT NULL,
	"key" varchar(100) NOT NULL,
	"value" jsonb NOT NULL,
	"description" text,
	"updatedBy" integer,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "system_settings_key_unique" UNIQUE("key")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"openId" varchar(64) NOT NULL,
	"name" text,
	"email" varchar(320),
	"password" varchar(255),
	"loginMethod" varchar(64),
	"role" "user_role" DEFAULT 'customer' NOT NULL,
	"status" "user_status" DEFAULT 'pending_approval' NOT NULL,
	"phone" varchar(20),
	"companyName" text,
	"address" text,
	"permissions" jsonb DEFAULT '{}',
	"totalRatingPoints" integer DEFAULT 0,
	"ratedDealsCount" integer DEFAULT 0,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL,
	"lastSignedIn" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_openId_unique" UNIQUE("openId")
);
--> statement-breakpoint
CREATE TABLE "validation_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"description" text,
	"minDpi" integer DEFAULT 300 NOT NULL,
	"maxDpi" integer,
	"allowedColorspaces" jsonb DEFAULT '["CMYK"]',
	"requiredBleedMm" integer DEFAULT 3 NOT NULL,
	"maxFileSizeMb" integer DEFAULT 100 NOT NULL,
	"allowedFormats" jsonb DEFAULT '["pdf", "ai", "eps", "tiff"]',
	"isDefault" boolean DEFAULT false,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
