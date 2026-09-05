CREATE TABLE `favorites` (
	`user_id` text NOT NULL,
	`listing_id` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_favorite` ON `favorites` (`user_id`,`listing_id`);--> statement-breakpoint
CREATE TABLE `inquiries` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`sender_id` text,
	`message` text NOT NULL,
	`contact_phone` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_inquiries_listing` ON `inquiries` (`listing_id`);--> statement-breakpoint
CREATE INDEX `idx_inquiries_sender` ON `inquiries` (`sender_id`);--> statement-breakpoint
CREATE TABLE `listing_images` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`url` text NOT NULL,
	`width` integer,
	`height` integer,
	`position` integer DEFAULT 0 NOT NULL,
	`is_cover` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_listing_images_listing` ON `listing_images` (`listing_id`);--> statement-breakpoint
CREATE TABLE `listings` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`mess_id` text,
	`slug` text NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`type` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`price_paisa` integer NOT NULL,
	`deposit_paisa` integer DEFAULT 0 NOT NULL,
	`service_charge_paisa` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'BDT' NOT NULL,
	`division` text,
	`district` text,
	`upazila` text,
	`area` text,
	`address` text,
	`lat` text,
	`lng` text,
	`bedrooms` integer,
	`bathrooms` integer,
	`sqft` integer,
	`floor` integer,
	`total_floors` integer,
	`furnished` integer DEFAULT false NOT NULL,
	`bachelor_allowed` integer DEFAULT true NOT NULL,
	`family_allowed` integer DEFAULT false NOT NULL,
	`gender_preference` text,
	`available_from` text,
	`occupancy` integer,
	`total_seats` integer,
	`verified` integer DEFAULT false NOT NULL,
	`quality_score` integer DEFAULT 0 NOT NULL,
	`moderation_reason` text,
	`published_at` text,
	`expires_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `listings_slug_unique` ON `listings` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_listings_status` ON `listings` (`status`);--> statement-breakpoint
CREATE INDEX `idx_listings_district_area` ON `listings` (`district`,`area`);--> statement-breakpoint
CREATE INDEX `idx_listings_type_status` ON `listings` (`type`,`status`);--> statement-breakpoint
CREATE INDEX `idx_listings_price` ON `listings` (`price_paisa`);--> statement-breakpoint
CREATE INDEX `idx_listings_owner` ON `listings` (`owner_id`);--> statement-breakpoint
CREATE TABLE `locations` (
	`id` text PRIMARY KEY NOT NULL,
	`division` text NOT NULL,
	`district` text NOT NULL,
	`upazila` text,
	`area` text,
	`slug` text NOT NULL,
	`lat` text,
	`lng` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `locations_slug_unique` ON `locations` (`slug`);--> statement-breakpoint
CREATE INDEX `idx_locations_district` ON `locations` (`district`);--> statement-breakpoint
CREATE INDEX `idx_locations_area` ON `locations` (`area`);--> statement-breakpoint
CREATE TABLE `moderation_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`listing_id` text NOT NULL,
	`moderator_id` text,
	`action` text NOT NULL,
	`reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`listing_id`) REFERENCES `listings`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`moderator_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_moderation_listing` ON `moderation_logs` (`listing_id`);