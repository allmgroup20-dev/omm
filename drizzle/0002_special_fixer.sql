ALTER TABLE `listings` ADD `union_name` text;--> statement-breakpoint
ALTER TABLE `listings` ADD `postal_code` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `level` integer DEFAULT 3 NOT NULL;--> statement-breakpoint
ALTER TABLE `locations` ADD `union_name` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `bn_name` text;--> statement-breakpoint
ALTER TABLE `locations` ADD `postal` text;--> statement-breakpoint
CREATE INDEX `idx_locations_level` ON `locations` (`level`);--> statement-breakpoint
ALTER TABLE `messes` ADD `division` text;--> statement-breakpoint
ALTER TABLE `messes` ADD `district` text;--> statement-breakpoint
ALTER TABLE `messes` ADD `upazila` text;--> statement-breakpoint
ALTER TABLE `messes` ADD `union_name` text;--> statement-breakpoint
ALTER TABLE `messes` ADD `area` text;--> statement-breakpoint
ALTER TABLE `messes` ADD `postal_code` text;