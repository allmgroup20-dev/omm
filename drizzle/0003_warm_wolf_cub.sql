PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_mess_members` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`user_id` text,
	`display_name` text,
	`claimed_at` text,
	`claimed_by` text,
	`role` text DEFAULT 'member' NOT NULL,
	`is_primary_manager` integer DEFAULT false NOT NULL,
	`permissions_json` text,
	`status` text DEFAULT 'active' NOT NULL,
	`invited_by` text,
	`joined_at` text NOT NULL,
	`left_at` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`claimed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_mess_members`("id", "mess_id", "user_id", "display_name", "claimed_at", "claimed_by", "role", "is_primary_manager", "permissions_json", "status", "invited_by", "joined_at", "left_at", "created_at", "updated_at") SELECT "id", "mess_id", "user_id", NULL, NULL, NULL, "role", "is_primary_manager", "permissions_json", "status", "invited_by", "joined_at", "left_at", "created_at", "updated_at" FROM `mess_members`;--> statement-breakpoint
DROP TABLE `mess_members`;--> statement-breakpoint
ALTER TABLE `__new_mess_members` RENAME TO `mess_members`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `uq_mess_member` ON `mess_members` (`mess_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_mess_members_mess` ON `mess_members` (`mess_id`);--> statement-breakpoint
CREATE INDEX `idx_mess_members_user` ON `mess_members` (`user_id`);