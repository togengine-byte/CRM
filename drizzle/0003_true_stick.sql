ALTER TABLE `validation_profiles` MODIFY COLUMN `minDpi` int NOT NULL DEFAULT 300;--> statement-breakpoint
ALTER TABLE `validation_profiles` MODIFY COLUMN `maxFileSizeMb` int NOT NULL DEFAULT 100;--> statement-breakpoint
ALTER TABLE `validation_profiles` MODIFY COLUMN `allowedFormats` json DEFAULT ('["pdf", "ai", "eps", "tiff"]');--> statement-breakpoint
ALTER TABLE `quote_file_warnings` ADD `quoteId` int NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_file_warnings` ADD `severity` varchar(20) DEFAULT 'warning' NOT NULL;--> statement-breakpoint
ALTER TABLE `quote_file_warnings` ADD `details` text;--> statement-breakpoint
ALTER TABLE `quote_file_warnings` ADD `currentValue` varchar(255);--> statement-breakpoint
ALTER TABLE `quote_file_warnings` ADD `requiredValue` varchar(255);--> statement-breakpoint
ALTER TABLE `validation_profiles` ADD `description` text;--> statement-breakpoint
ALTER TABLE `validation_profiles` ADD `maxDpi` int;--> statement-breakpoint
ALTER TABLE `validation_profiles` ADD `allowedColorspaces` json DEFAULT ('["CMYK"]');--> statement-breakpoint
ALTER TABLE `validation_profiles` ADD `requiredBleedMm` int DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `validation_profiles` ADD `isDefault` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `validation_profiles` DROP COLUMN `colorSpace`;--> statement-breakpoint
ALTER TABLE `validation_profiles` DROP COLUMN `minBleedMm`;
