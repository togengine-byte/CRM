CREATE TABLE `activity_log` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int,
	`actionType` varchar(100) NOT NULL,
	`details` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_log_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `base_products` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`category` varchar(100),
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `base_products_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `customer_pricelists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`pricelistId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `customer_pricelists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `internal_notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`entity_type` enum('customer','quote') NOT NULL,
	`entityId` int NOT NULL,
	`authorId` int NOT NULL,
	`content` text NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `internal_notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricelist_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`pricelistId` int NOT NULL,
	`productVariantId` int NOT NULL,
	`minQuantity` int DEFAULT 1,
	`maxQuantity` int,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricelist_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `pricelists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`description` text,
	`isDefault` boolean DEFAULT false,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `pricelists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `product_variants` (
	`id` int AUTO_INCREMENT NOT NULL,
	`baseProductId` int NOT NULL,
	`sku` varchar(100) NOT NULL,
	`name` varchar(255) NOT NULL,
	`attributes` json,
	`validationProfileId` int,
	`isActive` boolean DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `product_variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `product_variants_sku_unique` UNIQUE(`sku`)
);
--> statement-breakpoint
CREATE TABLE `quote_attachments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`quoteItemId` int,
	`fileName` varchar(255) NOT NULL,
	`fileUrl` text NOT NULL,
	`fileSize` int,
	`mimeType` varchar(100),
	`uploadedAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_attachments_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_file_warnings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`attachmentId` int NOT NULL,
	`warningType` varchar(100) NOT NULL,
	`message` text NOT NULL,
	`isAcknowledged` boolean DEFAULT false,
	`acknowledgedBy` int,
	`acknowledgedAt` timestamp,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_file_warnings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quote_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`quoteId` int NOT NULL,
	`productVariantId` int NOT NULL,
	`quantity` int NOT NULL,
	`priceAtTimeOfQuote` decimal(10,2) NOT NULL,
	`isUpsell` boolean DEFAULT false,
	`supplierId` int,
	`supplierCost` decimal(10,2),
	`deliveryDays` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `quote_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`customerId` int NOT NULL,
	`employeeId` int,
	`quote_status` enum('draft','sent','approved','rejected','superseded','in_production','ready') NOT NULL DEFAULT 'draft',
	`version` int NOT NULL DEFAULT 1,
	`parentQuoteId` int,
	`finalValue` decimal(12,2),
	`rejectionReason` text,
	`dealRating` int,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `supplier_prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`supplierId` int NOT NULL,
	`productVariantId` int NOT NULL,
	`minQuantity` int DEFAULT 1,
	`maxQuantity` int,
	`pricePerUnit` decimal(10,2) NOT NULL,
	`deliveryDays` int DEFAULT 3,
	`qualityRating` decimal(3,2),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `supplier_prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `validation_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`minDpi` int DEFAULT 300,
	`colorSpace` varchar(50) DEFAULT 'CMYK',
	`minBleedMm` decimal(5,2) DEFAULT '3.00',
	`maxFileSizeMb` int DEFAULT 100,
	`allowedFormats` json,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `validation_profiles_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `users` MODIFY COLUMN `role` enum('admin','employee','customer','supplier','courier') NOT NULL DEFAULT 'customer';--> statement-breakpoint
ALTER TABLE `users` ADD `status` enum('pending_approval','active','rejected','deactivated') DEFAULT 'pending_approval' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `phone` varchar(20);--> statement-breakpoint
ALTER TABLE `users` ADD `companyName` text;--> statement-breakpoint
ALTER TABLE `users` ADD `address` text;--> statement-breakpoint
ALTER TABLE `users` ADD `totalRatingPoints` int DEFAULT 0;--> statement-breakpoint
ALTER TABLE `users` ADD `ratedDealsCount` int DEFAULT 0;