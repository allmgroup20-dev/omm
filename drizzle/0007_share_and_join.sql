CREATE TABLE `mess_share_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `mess_id` text NOT NULL,
  `token` text NOT NULL,
  `created_by` text,
  `expires_at` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `mess_share_tokens_token_unique` ON `mess_share_tokens` (`token`);
--> statement-breakpoint
CREATE INDEX `idx_share_tokens_mess` ON `mess_share_tokens` (`mess_id`);
--> statement-breakpoint
CREATE TABLE `mess_join_requests` (
  `id` text PRIMARY KEY NOT NULL,
  `mess_id` text NOT NULL,
  `user_id` text NOT NULL,
  `status` text DEFAULT 'pending' NOT NULL,
  `requested_at` text NOT NULL,
  `decided_by` text,
  `decided_at` text,
  `created_at` text NOT NULL,
  FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`decided_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_join_request` ON `mess_join_requests` (`mess_id`,`user_id`);
--> statement-breakpoint
CREATE INDEX `idx_join_requests_mess` ON `mess_join_requests` (`mess_id`);
