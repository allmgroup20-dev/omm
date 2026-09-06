ALTER TABLE `market_products` ADD `sort_order` integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__tel_ghee', NULL, NULL, 'তেল/ঘি', 'tel-ghee', 0, 9, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, sort_order, is_archived, created_at) VALUES ('prod__tel_canola', NULL, 'cat__tel_ghee', 'ক্যানোলা তেল', 'tel-canola', 'litre', 0, 0, '2026-09-06T00:00:00.000Z');
