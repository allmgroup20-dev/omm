INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__chal', NULL, NULL, 'চাল', 'chal', 0, 0, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__dal', NULL, NULL, 'ডাল', 'dal', 0, 1, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__ata_moyda', NULL, NULL, 'আটা/ময়দা', 'ata-moyda', 0, 2, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__mach', NULL, NULL, 'মাছ', 'mach', 0, 3, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__mangsho', NULL, NULL, 'মাংস', 'mangsho', 0, 4, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__dim', NULL, NULL, 'ডিম', 'dim', 0, 5, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__shobji', NULL, NULL, 'সবজি', 'shobji', 0, 6, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__alu_peyaj_roshun_ada', NULL, NULL, 'আলু/পেঁয়াজ/রসুন/আদা', 'alu-peyaj-roshun-ada', 0, 7, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__moshla', NULL, NULL, 'মসলা', 'moshla', 0, 8, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__tel_ghee', NULL, NULL, 'তেল/ঘি', 'tel-ghee', 0, 9, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__dudh_doi', NULL, NULL, 'দুধ/দই', 'dudh-doi', 0, 10, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__lobon_chini_cha', NULL, NULL, 'লবণ/চিনি/চা', 'lobon-chini-cha', 0, 11, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_categories (id, mess_id, parent_id, name, slug, level, sort_order, is_active, created_at) VALUES ('cat__onnanno', NULL, NULL, 'অন্যান্য', 'onnanno', 0, 12, 1, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chal_miniket', NULL, 'cat__chal', 'মিনিকেট চাল', 'chal-miniket', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chal_nazirshail', NULL, 'cat__chal', 'নাজিরশাইল চাল', 'chal-nazirshail', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chal_bashmoti', NULL, 'cat__chal', 'বাসমতী চাল', 'chal-bashmoti', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chal_atop', NULL, 'cat__chal', 'আটপ চাল', 'chal-atop', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chal_mota', NULL, 'cat__chal', 'মোটা চাল', 'chal-mota', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dal_moshur', NULL, 'cat__dal', 'মসুর ডাল', 'dal-moshur', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dal_mug', NULL, 'cat__dal', 'মুগ ডাল', 'dal-mug', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dal_kheshari', NULL, 'cat__dal', 'খেসারি ডাল', 'dal-kheshari', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dal_chola', NULL, 'cat__dal', 'ছোলা', 'dal-chola', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dal_motor', NULL, 'cat__dal', 'মটর ডাল', 'dal-motor', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__ata', NULL, 'cat__ata_moyda', 'আটা', 'ata', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moyda', NULL, 'cat__ata_moyda', 'ময়দা', 'moyda', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shuji', NULL, 'cat__ata_moyda', 'সুজি', 'shuji', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__beshon', NULL, 'cat__ata_moyda', 'বেসন', 'beshon', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chira', NULL, 'cat__ata_moyda', 'চিড়া', 'chira', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__muri', NULL, 'cat__ata_moyda', 'মুড়ি', 'muri', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_ilish', NULL, 'cat__mach', 'ইলিশ', 'mach-ilish', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_rui', NULL, 'cat__mach', 'রুই', 'mach-rui', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_katla', NULL, 'cat__mach', 'কাতলা', 'mach-katla', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_pangash', NULL, 'cat__mach', 'পাঙ্গাশ', 'mach-pangash', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_telapia', NULL, 'cat__mach', 'তেলাপিয়া', 'mach-telapia', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_chingri', NULL, 'cat__mach', 'চিংড়ি', 'mach-chingri', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_koi', NULL, 'cat__mach', 'কৈ', 'mach-koi', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_shing', NULL, 'cat__mach', 'শিং/মাগুর', 'mach-shing', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_boal', NULL, 'cat__mach', 'বোয়াল', 'mach-boal', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mach_shutki', NULL, 'cat__mach', 'শুঁটকি', 'mach-shutki', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mangsho_goru', NULL, 'cat__mangsho', 'গরুর মাংস', 'mangsho-goru', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mangsho_khashi', NULL, 'cat__mangsho', 'খাসির মাংস', 'mangsho-khashi', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mangsho_murgi_farm', NULL, 'cat__mangsho', 'মুরগি (ফার্ম)', 'mangsho-murgi-farm', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mangsho_murgi_deshi', NULL, 'cat__mangsho', 'মুরগি (দেশি)', 'mangsho-murgi-deshi', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__mangsho_hash', NULL, 'cat__mangsho', 'হাঁস', 'mangsho-hash', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dim_murgi', NULL, 'cat__dim', 'ডিম (মুরগি)', 'dim-murgi', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dim_hash', NULL, 'cat__dim', 'ডিম (হাঁস)', 'dim-hash', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_begun', NULL, 'cat__shobji', 'বেগুন', 'shobji-begun', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_tomato', NULL, 'cat__shobji', 'টমেটো', 'shobji-tomato', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_fulkopi', NULL, 'cat__shobji', 'ফুলকপি', 'shobji-fulkopi', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_badhakopi', NULL, 'cat__shobji', 'বাঁধাকপি', 'shobji-badhakopi', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_lau', NULL, 'cat__shobji', 'লাউ', 'shobji-lau', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_kumra_mishti', NULL, 'cat__shobji', 'মিষ্টি কুমড়া', 'shobji-kumra-mishti', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_kumra_chal', NULL, 'cat__shobji', 'চাল কুমড়া', 'shobji-kumra-chal', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_potol', NULL, 'cat__shobji', 'পটল', 'shobji-potol', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_dherosh', NULL, 'cat__shobji', 'ঢেঁড়স', 'shobji-dherosh', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_korola', NULL, 'cat__shobji', 'করলা', 'shobji-korola', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_shosha', NULL, 'cat__shobji', 'শসা', 'shobji-shosha', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_gajor', NULL, 'cat__shobji', 'গাজর', 'shobji-gajor', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_mula', NULL, 'cat__shobji', 'মুলা', 'shobji-mula', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_borboti', NULL, 'cat__shobji', 'বরবটি', 'shobji-borboti', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_pui_shak', NULL, 'cat__shobji', 'পুঁই শাক', 'shobji-pui-shak', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_lal_shak', NULL, 'cat__shobji', 'লাল শাক', 'shobji-lal-shak', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_palong_shak', NULL, 'cat__shobji', 'পালং শাক', 'shobji-palong-shak', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_kolmi_shak', NULL, 'cat__shobji', 'কলমি শাক', 'shobji-kolmi-shak', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_data', NULL, 'cat__shobji', 'ডাঁটা', 'shobji-data', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_dhonepata', NULL, 'cat__shobji', 'ধনেপাতা', 'shobji-dhonepata', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_kancha_morich', NULL, 'cat__shobji', 'কাঁচা মরিচ', 'shobji-kancha-morich', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_lebu', NULL, 'cat__shobji', 'লেবু', 'shobji-lebu', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_kochur_mukhi', NULL, 'cat__shobji', 'কচুর মুখি', 'shobji-kochur-mukhi', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__shobji_pepe', NULL, 'cat__shobji', 'পেঁপে', 'shobji-pepe', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__alu', NULL, 'cat__alu_peyaj_roshun_ada', 'আলু', 'alu', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__peyaj', NULL, 'cat__alu_peyaj_roshun_ada', 'পেঁয়াজ', 'peyaj', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__roshun', NULL, 'cat__alu_peyaj_roshun_ada', 'রসুন', 'roshun', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__ada', NULL, 'cat__alu_peyaj_roshun_ada', 'আদা', 'ada', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__kochur_loti', NULL, 'cat__alu_peyaj_roshun_ada', 'কচুর লতি', 'kochur-loti', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_holud', NULL, 'cat__moshla', 'হলুদ গুঁড়া', 'moshla-holud', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_morich_gura', NULL, 'cat__moshla', 'মরিচ গুঁড়া', 'moshla-morich-gura', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_dhoniya', NULL, 'cat__moshla', 'ধনিয়া গুঁড়া', 'moshla-dhoniya', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_jira', NULL, 'cat__moshla', 'জিরা', 'moshla-jira', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_gorom_moshla', NULL, 'cat__moshla', 'গরম মসলা', 'moshla-gorom-moshla', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_tejpata', NULL, 'cat__moshla', 'তেজপাতা', 'moshla-tejpata', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_daruchini', NULL, 'cat__moshla', 'দারুচিনি', 'moshla-daruchini', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_elach', NULL, 'cat__moshla', 'এলাচ', 'moshla-elach', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_lobongo', NULL, 'cat__moshla', 'লবঙ্গ', 'moshla-lobongo', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_golmorich', NULL, 'cat__moshla', 'গোলমরিচ', 'moshla-golmorich', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__moshla_shorisha_bata', NULL, 'cat__moshla', 'সরিষা বাটা', 'moshla-shorisha-bata', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__tel_soyabin', NULL, 'cat__tel_ghee', 'সয়াবিন তেল', 'tel-soyabin', 'litre', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__tel_shorisha', NULL, 'cat__tel_ghee', 'সরিষার তেল', 'tel-shorisha', 'litre', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__ghee', NULL, 'cat__tel_ghee', 'ঘি', 'ghee', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dudh', NULL, 'cat__dudh_doi', 'দুধ', 'dudh', 'litre', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__doi', NULL, 'cat__dudh_doi', 'দই', 'doi', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__dim_tokdoi', NULL, 'cat__dudh_doi', 'টকদই', 'dim-tokdoi', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__lobon', NULL, 'cat__lobon_chini_cha', 'লবণ', 'lobon', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chini', NULL, 'cat__lobon_chini_cha', 'চিনি', 'chini', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__cha_pata', NULL, 'cat__lobon_chini_cha', 'চা পাতা', 'cha-pata', 'gram', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__gur', NULL, 'cat__lobon_chini_cha', 'গুড়', 'gur', 'kg', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__biscuit', NULL, 'cat__lobon_chini_cha', 'বিস্কুট', 'biscuit', 'packet', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__chanachur', NULL, 'cat__lobon_chini_cha', 'চানাচুর', 'chanachur', 'packet', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__pani_jar', NULL, 'cat__onnanno', 'পানি জার', 'pani-jar', 'piece', 0, '2026-09-06T00:00:00.000Z');
--> statement-breakpoint
INSERT OR IGNORE INTO market_products (id, mess_id, category_id, name, slug, default_unit, is_archived, created_at) VALUES ('prod__tissue', NULL, 'cat__onnanno', 'টিস্যু', 'tissue', 'packet', 0, '2026-09-06T00:00:00.000Z');