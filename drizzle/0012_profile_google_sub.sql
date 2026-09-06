ALTER TABLE `users` ADD `google_sub` text;
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_users_google_sub` ON `users` (`google_sub`);
