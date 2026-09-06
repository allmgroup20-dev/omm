CREATE TABLE `market_entry_purchasers` (
  `entry_id` text NOT NULL,
  `member_id` text NOT NULL,
  `created_at` text NOT NULL,
  FOREIGN KEY (`entry_id`) REFERENCES `market_entries`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_entry_purchaser` ON `market_entry_purchasers` (`entry_id`,`member_id`);
--> statement-breakpoint
CREATE INDEX `idx_entry_purchasers_member` ON `market_entry_purchasers` (`member_id`);
--> statement-breakpoint
INSERT OR IGNORE INTO `market_entry_purchasers` (`entry_id`, `member_id`, `created_at`) SELECT `id`, `purchased_by`, `created_at` FROM `market_entries` WHERE `purchased_by` IS NOT NULL;
