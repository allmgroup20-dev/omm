CREATE TABLE `meal_defaults` (
  `id` text PRIMARY KEY NOT NULL,
  `mess_id` text NOT NULL,
  `meal_type_id` text NOT NULL,
  `member_id` text,
  `default_scaled` integer DEFAULT 100 NOT NULL,
  `is_enabled` integer DEFAULT true NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`meal_type_id`) REFERENCES `meal_types`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_meal_default` ON `meal_defaults` (`mess_id`,`meal_type_id`,`member_id`);
--> statement-breakpoint
CREATE INDEX `idx_meal_defaults_mess` ON `meal_defaults` (`mess_id`);
