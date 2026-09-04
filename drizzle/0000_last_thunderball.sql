CREATE TABLE `audit_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text,
	`actor_id` text,
	`action` text NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` text NOT NULL,
	`before_json` text,
	`after_json` text,
	`reason` text,
	`ip` text,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_audit_mess` ON `audit_logs` (`mess_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_entity` ON `audit_logs` (`entity_type`,`entity_id`);--> statement-breakpoint
CREATE INDEX `idx_audit_actor` ON `audit_logs` (`actor_id`);--> statement-breakpoint
CREATE TABLE `closing_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`closed_by` text,
	`closed_at` text,
	`reopened_by` text,
	`reopened_at` text,
	`reopen_reason` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`closed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`reopened_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_closing_period` ON `closing_periods` (`mess_id`,`year`,`month`);--> statement-breakpoint
CREATE TABLE `deposits` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`member_id` text NOT NULL,
	`date` text NOT NULL,
	`amount_paisa` integer NOT NULL,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`received_by` text,
	`transaction_id` text,
	`client_ref_id` text,
	`note` text,
	`receipt_url` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`received_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `deposits_client_ref_id_unique` ON `deposits` (`client_ref_id`);--> statement-breakpoint
CREATE INDEX `idx_deposits_mess_date` ON `deposits` (`mess_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_deposits_member` ON `deposits` (`member_id`);--> statement-breakpoint
CREATE TABLE `expense_approvals` (
	`id` text PRIMARY KEY NOT NULL,
	`expense_id` text NOT NULL,
	`approver_id` text,
	`status` text NOT NULL,
	`note` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`expense_id`) REFERENCES `expenses`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_exp_approvals_expense` ON `expense_approvals` (`expense_id`);--> statement-breakpoint
CREATE TABLE `expense_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`parent_id` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_exp_cat_mess` ON `expense_categories` (`mess_id`);--> statement-breakpoint
CREATE TABLE `expenses` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`date` text NOT NULL,
	`category_id` text,
	`amount_paisa` integer NOT NULL,
	`paid_by` text,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`description` text,
	`receipt_url` text,
	`notes` text,
	`status` text DEFAULT 'approved' NOT NULL,
	`client_ref_id` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `expense_categories`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`paid_by`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `expenses_client_ref_id_unique` ON `expenses` (`client_ref_id`);--> statement-breakpoint
CREATE INDEX `idx_expenses_mess_date` ON `expenses` (`mess_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_expenses_category` ON `expenses` (`category_id`);--> statement-breakpoint
CREATE TABLE `guest_meals` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`date` text NOT NULL,
	`guest_name` text NOT NULL,
	`host_member_id` text,
	`meal_type_id` text,
	`quantity_scaled` integer NOT NULL,
	`is_paid` integer DEFAULT false NOT NULL,
	`cost_paisa` integer DEFAULT 0 NOT NULL,
	`recorded_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`host_member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`meal_type_id`) REFERENCES `meal_types`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_guest_meals_mess_date` ON `guest_meals` (`mess_id`,`date`);--> statement-breakpoint
CREATE TABLE `inventory` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`product_id` text NOT NULL,
	`current_stock_scaled` integer DEFAULT 0 NOT NULL,
	`unit` text NOT NULL,
	`opening_stock_scaled` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `market_products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_inventory_product` ON `inventory` (`mess_id`,`product_id`);--> statement-breakpoint
CREATE TABLE `inventory_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`inventory_id` text NOT NULL,
	`type` text NOT NULL,
	`quantity_scaled` integer NOT NULL,
	`note` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`inventory_id`) REFERENCES `inventory`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_inv_txn_inventory` ON `inventory_transactions` (`inventory_id`);--> statement-breakpoint
CREATE TABLE `invitations` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`code` text NOT NULL,
	`link_token` text NOT NULL,
	`email` text,
	`phone` text,
	`role` text DEFAULT 'member' NOT NULL,
	`created_by` text,
	`expires_at` text,
	`used_at` text,
	`used_by` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`used_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_code_unique` ON `invitations` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `invitations_link_token_unique` ON `invitations` (`link_token`);--> statement-breakpoint
CREATE INDEX `idx_invitations_mess` ON `invitations` (`mess_id`);--> statement-breakpoint
CREATE INDEX `idx_invitations_code` ON `invitations` (`code`);--> statement-breakpoint
CREATE TABLE `ledger_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`member_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`description` text NOT NULL,
	`debit_paisa` integer DEFAULT 0 NOT NULL,
	`credit_paisa` integer DEFAULT 0 NOT NULL,
	`balance_paisa` integer NOT NULL,
	`ref_type` text,
	`ref_id` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_ledger_mess_member` ON `ledger_entries` (`mess_id`,`member_id`);--> statement-breakpoint
CREATE INDEX `idx_ledger_date` ON `ledger_entries` (`date`);--> statement-breakpoint
CREATE TABLE `login_history` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`email` text NOT NULL,
	`success` integer NOT NULL,
	`ip` text,
	`user_agent` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_login_history_user` ON `login_history` (`user_id`);--> statement-breakpoint
CREATE TABLE `market_categories` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text,
	`parent_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`level` integer DEFAULT 0 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_market_cat_mess` ON `market_categories` (`mess_id`);--> statement-breakpoint
CREATE INDEX `idx_market_cat_parent` ON `market_categories` (`parent_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `uq_market_cat_slug` ON `market_categories` (`mess_id`,`slug`);--> statement-breakpoint
CREATE TABLE `market_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`date` text NOT NULL,
	`purchased_by` text,
	`vendor_id` text,
	`payment_method` text DEFAULT 'cash' NOT NULL,
	`total_paisa` integer DEFAULT 0 NOT NULL,
	`discount_paisa` integer DEFAULT 0 NOT NULL,
	`final_paisa` integer DEFAULT 0 NOT NULL,
	`classification` text DEFAULT 'food' NOT NULL,
	`notes` text,
	`receipt_url` text,
	`reference_number` text,
	`client_ref_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`purchased_by`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `market_entries_client_ref_id_unique` ON `market_entries` (`client_ref_id`);--> statement-breakpoint
CREATE INDEX `idx_market_entries_mess_date` ON `market_entries` (`mess_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_market_entries_vendor` ON `market_entries` (`vendor_id`);--> statement-breakpoint
CREATE TABLE `market_entry_items` (
	`id` text PRIMARY KEY NOT NULL,
	`entry_id` text NOT NULL,
	`product_id` text,
	`product_name_snapshot` text NOT NULL,
	`category_name_snapshot` text,
	`quantity_scaled` integer NOT NULL,
	`unit` text NOT NULL,
	`unit_price_paisa` integer NOT NULL,
	`total_paisa` integer NOT NULL,
	`notes` text,
	FOREIGN KEY (`entry_id`) REFERENCES `market_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `market_products`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_market_items_entry` ON `market_entry_items` (`entry_id`);--> statement-breakpoint
CREATE TABLE `market_products` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text,
	`category_id` text,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`default_unit` text DEFAULT 'kg' NOT NULL,
	`is_archived` integer DEFAULT false NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`category_id`) REFERENCES `market_categories`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE INDEX `idx_market_product_mess` ON `market_products` (`mess_id`);--> statement-breakpoint
CREATE INDEX `idx_market_product_cat` ON `market_products` (`category_id`);--> statement-breakpoint
CREATE TABLE `meal_corrections` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_record_id` text NOT NULL,
	`before_scaled` integer NOT NULL,
	`after_scaled` integer NOT NULL,
	`reason` text,
	`changed_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`meal_record_id`) REFERENCES `meal_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`changed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_meal_corrections_record` ON `meal_corrections` (`meal_record_id`);--> statement-breakpoint
CREATE TABLE `meal_locks` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`date` text NOT NULL,
	`locked_by` text,
	`locked_at` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`locked_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_meal_lock` ON `meal_locks` (`mess_id`,`date`);--> statement-breakpoint
CREATE TABLE `meal_records` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`member_id` text NOT NULL,
	`date` text NOT NULL,
	`meal_type_id` text NOT NULL,
	`quantity_scaled` integer DEFAULT 0 NOT NULL,
	`created_by` text,
	`updated_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`meal_type_id`) REFERENCES `meal_types`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_meal_record` ON `meal_records` (`mess_id`,`member_id`,`date`,`meal_type_id`);--> statement-breakpoint
CREATE INDEX `idx_meal_records_mess_date` ON `meal_records` (`mess_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_meal_records_member` ON `meal_records` (`member_id`);--> statement-breakpoint
CREATE TABLE `meal_types` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`name` text NOT NULL,
	`slug` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_meal_type_mess_slug` ON `meal_types` (`mess_id`,`slug`);--> statement-breakpoint
CREATE INDEX `idx_meal_types_mess` ON `meal_types` (`mess_id`);--> statement-breakpoint
CREATE TABLE `member_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_id` text NOT NULL,
	`member_id` text NOT NULL,
	`total_meals_scaled` integer DEFAULT 0 NOT NULL,
	`meal_cost_paisa` integer DEFAULT 0 NOT NULL,
	`allocated_expense_paisa` integer DEFAULT 0 NOT NULL,
	`previous_balance_paisa` integer DEFAULT 0 NOT NULL,
	`deposit_paisa` integer DEFAULT 0 NOT NULL,
	`adjustment_paisa` integer DEFAULT 0 NOT NULL,
	`closing_balance_paisa` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'settled' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`settlement_id`) REFERENCES `monthly_settlements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_member_settlement` ON `member_settlements` (`settlement_id`,`member_id`);--> statement-breakpoint
CREATE TABLE `mess_members` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`user_id` text NOT NULL,
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
	FOREIGN KEY (`invited_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_mess_member` ON `mess_members` (`mess_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `idx_mess_members_mess` ON `mess_members` (`mess_id`);--> statement-breakpoint
CREATE INDEX `idx_mess_members_user` ON `mess_members` (`user_id`);--> statement-breakpoint
CREATE TABLE `messes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`address` text,
	`contact_info` text,
	`currency` text DEFAULT 'BDT' NOT NULL,
	`timezone` text DEFAULT 'Asia/Dhaka' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`start_date` text NOT NULL,
	`default_meal_precision` integer DEFAULT 50 NOT NULL,
	`meal_costing_model` text DEFAULT 'food_only' NOT NULL,
	`cost_allocation` text DEFAULT 'equal' NOT NULL,
	`expense_approval_threshold_paisa` integer DEFAULT 500000 NOT NULL,
	`notification_settings_json` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `messes_code_unique` ON `messes` (`code`);--> statement-breakpoint
CREATE INDEX `idx_messes_code` ON `messes` (`code`);--> statement-breakpoint
CREATE TABLE `monthly_settlements` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`year` integer NOT NULL,
	`month` integer NOT NULL,
	`total_market_paisa` integer DEFAULT 0 NOT NULL,
	`total_other_expense_paisa` integer DEFAULT 0 NOT NULL,
	`total_food_cost_paisa` integer DEFAULT 0 NOT NULL,
	`total_meals_scaled` integer DEFAULT 0 NOT NULL,
	`meal_rate_paisa` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`notes` text,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_settlement_period` ON `monthly_settlements` (`mess_id`,`year`,`month`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`mess_id` text,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`body` text,
	`is_read` integer DEFAULT false NOT NULL,
	`link` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_notifications_user` ON `notifications` (`user_id`);--> statement-breakpoint
CREATE INDEX `idx_notifications_mess` ON `notifications` (`mess_id`);--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `permissions_name_unique` ON `permissions` (`name`);--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`role_id` text NOT NULL,
	`permission_id` text NOT NULL,
	FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_role_perm` ON `role_permissions` (`role_id`,`permission_id`);--> statement-breakpoint
CREATE TABLE `roles` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `roles_name_unique` ON `roles` (`name`);--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`token_hash` text NOT NULL,
	`expires_at` text NOT NULL,
	`created_at` text NOT NULL,
	`ip` text,
	`user_agent` text,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_token_hash_unique` ON `sessions` (`token_hash`);--> statement-breakpoint
CREATE INDEX `idx_sessions_user` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE TABLE `settlement_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`settlement_id` text,
	`member_id` text NOT NULL,
	`amount_paisa` integer NOT NULL,
	`reason` text NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`settlement_id`) REFERENCES `monthly_settlements`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`member_id`) REFERENCES `mess_members`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_adjustments_settlement` ON `settlement_adjustments` (`settlement_id`);--> statement-breakpoint
CREATE TABLE `shopping_list_items` (
	`id` text PRIMARY KEY NOT NULL,
	`list_id` text NOT NULL,
	`product_id` text,
	`product_name` text NOT NULL,
	`quantity_scaled` integer NOT NULL,
	`unit` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`purchased_entry_id` text,
	FOREIGN KEY (`list_id`) REFERENCES `shopping_lists`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `market_products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`purchased_entry_id`) REFERENCES `market_entries`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shop_items_list` ON `shopping_list_items` (`list_id`);--> statement-breakpoint
CREATE TABLE `shopping_lists` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_shopping_lists_mess` ON `shopping_lists` (`mess_id`);--> statement-breakpoint
CREATE TABLE `special_days` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`date` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`note` text,
	`custom_rules_json` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_special_day` ON `special_days` (`mess_id`,`date`);--> statement-breakpoint
CREATE INDEX `idx_special_days_mess` ON `special_days` (`mess_id`);--> statement-breakpoint
CREATE TABLE `system_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text,
	`key` text NOT NULL,
	`value_json` text NOT NULL,
	`updated_by` text,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`updated_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `uq_system_settings` ON `system_settings` (`mess_id`,`key`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`phone` text,
	`phone_verified` integer DEFAULT false NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`profile_photo` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`emergency_contact` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_email` ON `users` (`email`);--> statement-breakpoint
CREATE INDEX `idx_users_phone` ON `users` (`phone`);--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`category` text,
	`notes` text,
	`total_purchases_paisa` integer DEFAULT 0 NOT NULL,
	`outstanding_paisa` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_vendors_mess` ON `vendors` (`mess_id`);--> statement-breakpoint
CREATE TABLE `waste_records` (
	`id` text PRIMARY KEY NOT NULL,
	`mess_id` text NOT NULL,
	`date` text NOT NULL,
	`product_id` text,
	`product_name_snapshot` text NOT NULL,
	`quantity_scaled` integer NOT NULL,
	`unit` text NOT NULL,
	`reason` text,
	`estimated_cost_paisa` integer DEFAULT 0 NOT NULL,
	`recorded_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`mess_id`) REFERENCES `messes`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`product_id`) REFERENCES `market_products`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`recorded_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_waste_mess_date` ON `waste_records` (`mess_id`,`date`);