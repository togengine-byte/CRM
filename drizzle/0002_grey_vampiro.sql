ALTER TABLE `quote_items` ADD `pickedUp` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `pickedUpAt` timestamp;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `pickedUpBy` int;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `delivered` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `deliveredAt` timestamp;--> statement-breakpoint
ALTER TABLE `quote_items` ADD `deliveredBy` int;