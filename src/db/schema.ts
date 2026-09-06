import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/* =========================================================
   OMM Phase 2 — Full Normalized Schema (32+ tables)
   Money: INTEGER paisa (BDT*100). Meal qty: INTEGER scaled x100 (0.5 => 50)
   No CASCADE on financial history. Soft-delete via status/archived.
   All tenant rows carry messId; every query must filter by messId.
   ========================================================= */

// ---------- USERS & AUTH ----------

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    phoneVerified: integer("phone_verified", { mode: "boolean" }).notNull().default(false),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    profilePhoto: text("profile_photo"),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("active"), // active|suspended|deleted
    emergencyContact: text("emergency_contact"),
    notes: text("notes"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_users_email").on(t.email), index("idx_users_phone").on(t.phone)],
);

export const sessions = sqliteTable(
  "sessions",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: text("expires_at").notNull(),
    createdAt: text("created_at").notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
  },
  (t) => [index("idx_sessions_user").on(t.userId)],
);

export const loginHistory = sqliteTable(
  "login_history",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    success: integer("success", { mode: "boolean" }).notNull(),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_login_history_user").on(t.userId)],
);

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(), // super_admin|mess_manager|assistant_manager|member
  name: text("name").notNull().unique(),
  description: text("description"),
});

export const permissions = sqliteTable("permissions", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // e.g. member.manage, meal.manage, market.manage, finance.manage
  description: text("description"),
});

export const rolePermissions = sqliteTable(
  "role_permissions",
  {
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    permissionId: text("permission_id")
      .notNull()
      .references(() => permissions.id, { onDelete: "cascade" }),
  },
  (t) => [uniqueIndex("uq_role_perm").on(t.roleId, t.permissionId)],
);

// ---------- MESSES & MEMBERSHIP ----------

export const messes = sqliteTable(
  "messes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(), // OMM-XXXX unique
    description: text("description"),
    address: text("address"),
    division: text("division"),
    district: text("district"),
    upazila: text("upazila"),
    unionName: text("union_name"),
    area: text("area"),
    postalCode: text("postal_code"),
    contactInfo: text("contact_info"),
    currency: text("currency").notNull().default("BDT"),
    timezone: text("timezone").notNull().default("Asia/Dhaka"),
    status: text("status").notNull().default("active"), // active|archived|suspended
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    defaultMealPrecision: integer("default_meal_precision").notNull().default(50), // 50 => 0.5 steps, 100 => 1.0
    mealCostingModel: text("meal_costing_model").notNull().default("food_only"), // food_only|food_plus_expenses|custom
    costAllocation: text("cost_allocation").notNull().default("equal"), // equal|meal_proportional|member_specific|custom
    expenseApprovalThresholdPaisa: integer("expense_approval_threshold_paisa").notNull().default(500000), // 5000 BDT
    notificationSettingsJson: text("notification_settings_json"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_messes_code").on(t.code)],
);

export const messMembers = sqliteTable(
  "mess_members",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    userId: text("user_id").references(() => users.id, { onDelete: "restrict" }), // NULL = placeholder (no account yet)
    displayName: text("display_name"), // placeholder name; shown when userId is NULL
    claimedAt: text("claimed_at"),
    claimedBy: text("claimed_by").references(() => users.id),
    role: text("role").notNull().default("member"), // manager|assistant_manager|member
    isPrimaryManager: integer("is_primary_manager", { mode: "boolean" }).notNull().default(false),
    permissionsJson: text("permissions_json"), // granular overrides JSON
    status: text("status").notNull().default("active"), // active|inactive|suspended|left|archived
    invitedBy: text("invited_by").references(() => users.id),
    joinedAt: text("joined_at").notNull(),
    leftAt: text("left_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_mess_member").on(t.messId, t.userId),
    index("idx_mess_members_mess").on(t.messId),
    index("idx_mess_members_user").on(t.userId),
  ],
);

export const invitations = sqliteTable(
  "invitations",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    code: text("code").notNull().unique(), // 6-8 char invite code
    linkToken: text("link_token").notNull().unique(),
    email: text("email"),
    phone: text("phone"),
    role: text("role").notNull().default("member"),
    createdBy: text("created_by").references(() => users.id),
    expiresAt: text("expires_at"),
    usedAt: text("used_at"),
    usedBy: text("used_by").references(() => users.id),
    status: text("status").notNull().default("active"), // active|used|expired|revoked
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_invitations_mess").on(t.messId), index("idx_invitations_code").on(t.code)],
);

export const messShareTokens = sqliteTable(
  "mess_share_tokens",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    createdBy: text("created_by").references(() => users.id),
    expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_share_tokens_mess").on(t.messId)],
);

export const messJoinRequests = sqliteTable(
  "mess_join_requests",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: text("status").notNull().default("pending"), // pending|approved|rejected
    requestedAt: text("requested_at").notNull(),
    decidedBy: text("decided_by").references(() => users.id),
    decidedAt: text("decided_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uq_join_request").on(t.messId, t.userId), index("idx_join_requests_mess").on(t.messId)],
);

// ---------- MEAL ----------

export const mealTypes = sqliteTable(
  "meal_types",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    name: text("name").notNull(), // Breakfast, Lunch, Dinner, Sehri...
    slug: text("slug").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_meal_type_mess_slug").on(t.messId, t.slug),
    index("idx_meal_types_mess").on(t.messId),
  ],
);

export const mealDefaults = sqliteTable(
  "meal_defaults",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    mealTypeId: text("meal_type_id")
      .notNull()
      .references(() => mealTypes.id, { onDelete: "cascade" }),
    memberId: text("member_id").references(() => messMembers.id, { onDelete: "cascade" }), // null = mess-wide default, else per-member override
    defaultScaled: integer("default_scaled").notNull().default(100), // x100 — 1 => 100, 0.5 => 50
    isEnabled: integer("is_enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_meal_default").on(t.messId, t.mealTypeId, t.memberId),
    index("idx_meal_defaults_mess").on(t.messId),
  ],
);

export const mealRecords = sqliteTable(
  "meal_records",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => messMembers.id, { onDelete: "restrict" }),
    date: text("date").notNull(), // YYYY-MM-DD mess-local
    mealTypeId: text("meal_type_id")
      .notNull()
      .references(() => mealTypes.id, { onDelete: "restrict" }),
    quantityScaled: integer("quantity_scaled").notNull().default(0), // x100
    createdBy: text("created_by").references(() => users.id),
    updatedBy: text("updated_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_meal_record").on(t.messId, t.memberId, t.date, t.mealTypeId),
    index("idx_meal_records_mess_date").on(t.messId, t.date),
    index("idx_meal_records_member").on(t.memberId),
  ],
);

export const mealCorrections = sqliteTable(
  "meal_corrections",
  {
    id: text("id").primaryKey(),
    mealRecordId: text("meal_record_id")
      .notNull()
      .references(() => mealRecords.id, { onDelete: "cascade" }),
    beforeScaled: integer("before_scaled").notNull(),
    afterScaled: integer("after_scaled").notNull(),
    reason: text("reason"),
    changedBy: text("changed_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_meal_corrections_record").on(t.mealRecordId)],
);

export const mealLocks = sqliteTable(
  "meal_locks",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    lockedBy: text("locked_by").references(() => users.id),
    lockedAt: text("locked_at").notNull(),
    reason: text("reason"),
  },
  (t) => [uniqueIndex("uq_meal_lock").on(t.messId, t.date)],
);

export const closingPeriods = sqliteTable(
  "closing_periods",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(), // 1-12
    status: text("status").notNull().default("open"), // open|closed
    closedBy: text("closed_by").references(() => users.id),
    closedAt: text("closed_at"),
    reopenedBy: text("reopened_by").references(() => users.id),
    reopenedAt: text("reopened_at"),
    reopenReason: text("reopen_reason"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uq_closing_period").on(t.messId, t.year, t.month)],
);

// ---------- MARKET ----------

export const marketCategories = sqliteTable(
  "market_categories",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id").references(() => messes.id, { onDelete: "cascade" }), // null = global template
    parentId: text("parent_id"),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    level: integer("level").notNull().default(0),
    sortOrder: integer("sort_order").notNull().default(0),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_market_cat_mess").on(t.messId),
    index("idx_market_cat_parent").on(t.parentId),
    uniqueIndex("uq_market_cat_slug").on(t.messId, t.slug),
  ],
);

export const marketProducts = sqliteTable(
  "market_products",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id").references(() => messes.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => marketCategories.id, { onDelete: "restrict" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    defaultUnit: text("default_unit").notNull().default("kg"), // kg|gram|litre|ml|piece|dozen|packet|bottle|box|custom
    sortOrder: integer("sort_order").notNull().default(0),
    isArchived: integer("is_archived", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_market_product_mess").on(t.messId), index("idx_market_product_cat").on(t.categoryId)],
);

export const vendors = sqliteTable(
  "vendors",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    address: text("address"),
    category: text("category"),
    notes: text("notes"),
    totalPurchasesPaisa: integer("total_purchases_paisa").notNull().default(0),
    outstandingPaisa: integer("outstanding_paisa").notNull().default(0),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_vendors_mess").on(t.messId)],
);

export const marketEntries = sqliteTable(
  "market_entries",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    date: text("date").notNull(), // YYYY-MM-DD
    purchasedBy: text("purchased_by").references(() => messMembers.id, { onDelete: "restrict" }),
    vendorId: text("vendor_id").references(() => vendors.id, { onDelete: "restrict" }),
    paymentMethod: text("payment_method").notNull().default("cash"), // cash|bank|mobile|other
    totalPaisa: integer("total_paisa").notNull().default(0),
    transportPaisa: integer("transport_paisa").notNull().default(0), // গাড়ি ভাড়া — market add dedicated
    discountPaisa: integer("discount_paisa").notNull().default(0),
    finalPaisa: integer("final_paisa").notNull().default(0),
    classification: text("classification").notNull().default("food"), // food|shared|non_food
    notes: text("notes"),
    receiptUrl: text("receipt_url"),
    referenceNumber: text("reference_number"),
    clientRefId: text("client_ref_id").unique(), // idempotency
    status: text("status").notNull().default("active"), // active|voided|reversed
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_market_entries_mess_date").on(t.messId, t.date),
    index("idx_market_entries_vendor").on(t.vendorId),
    index("idx_market_entries_purchasedBy").on(t.purchasedBy),
  ],
);

export const marketEntryItems = sqliteTable(
  "market_entry_items",
  {
    id: text("id").primaryKey(),
    entryId: text("entry_id")
      .notNull()
      .references(() => marketEntries.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => marketProducts.id, { onDelete: "restrict" }),
    productNameSnapshot: text("product_name_snapshot").notNull(), // preserve if product renamed/deleted
    categoryNameSnapshot: text("category_name_snapshot"),
    quantityScaled: integer("quantity_scaled").notNull(), // x1000 — preserves 42.560 (42kg 560g) exactly
    unit: text("unit").notNull(),
    unitPricePaisa: integer("unit_price_paisa").notNull(),
    totalPaisa: integer("total_paisa").notNull(),
    notes: text("notes"),
  },
  (t) => [index("idx_market_items_entry").on(t.entryId)],
);

export const marketEntryPurchasers = sqliteTable(
  "market_entry_purchasers",
  {
    entryId: text("entry_id")
      .notNull()
      .references(() => marketEntries.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => messMembers.id, { onDelete: "restrict" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uq_entry_purchaser").on(t.entryId, t.memberId), index("idx_entry_purchasers_member").on(t.memberId)],
);

// ---------- SHOPPING LIST & INVENTORY ----------

export const shoppingLists = sqliteTable(
  "shopping_lists",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    status: text("status").notNull().default("pending"), // pending|purchased|partial|cancelled
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_shopping_lists_mess").on(t.messId)],
);

export const shoppingListItems = sqliteTable(
  "shopping_list_items",
  {
    id: text("id").primaryKey(),
    listId: text("list_id")
      .notNull()
      .references(() => shoppingLists.id, { onDelete: "cascade" }),
    productId: text("product_id").references(() => marketProducts.id, { onDelete: "restrict" }),
    productName: text("product_name").notNull(),
    quantityScaled: integer("quantity_scaled").notNull(),
    unit: text("unit").notNull(),
    status: text("status").notNull().default("pending"),
    purchasedEntryId: text("purchased_entry_id").references(() => marketEntries.id),
  },
  (t) => [index("idx_shop_items_list").on(t.listId)],
);

export const inventory = sqliteTable(
  "inventory",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    productId: text("product_id")
      .notNull()
      .references(() => marketProducts.id, { onDelete: "restrict" }),
    currentStockScaled: integer("current_stock_scaled").notNull().default(0),
    unit: text("unit").notNull(),
    openingStockScaled: integer("opening_stock_scaled").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("uq_inventory_product").on(t.messId, t.productId)],
);

export const inventoryTransactions = sqliteTable(
  "inventory_transactions",
  {
    id: text("id").primaryKey(),
    inventoryId: text("inventory_id")
      .notNull()
      .references(() => inventory.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // purchase|consumed|wasted|adjusted
    quantityScaled: integer("quantity_scaled").notNull(),
    note: text("note"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_inv_txn_inventory").on(t.inventoryId)],
);

export const wasteRecords = sqliteTable(
  "waste_records",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    productId: text("product_id").references(() => marketProducts.id, { onDelete: "restrict" }),
    productNameSnapshot: text("product_name_snapshot").notNull(),
    quantityScaled: integer("quantity_scaled").notNull(),
    unit: text("unit").notNull(),
    reason: text("reason"),
    estimatedCostPaisa: integer("estimated_cost_paisa").notNull().default(0),
    recordedBy: text("recorded_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_waste_mess_date").on(t.messId, t.date)],
);

// ---------- EXPENSES ----------

export const expenseCategories = sqliteTable(
  "expense_categories",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id").references(() => messes.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    parentId: text("parent_id"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_exp_cat_mess").on(t.messId)],
);

export const expenses = sqliteTable(
  "expenses",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    categoryId: text("category_id").references(() => expenseCategories.id, { onDelete: "restrict" }),
    amountPaisa: integer("amount_paisa").notNull(),
    paidBy: text("paid_by").references(() => messMembers.id, { onDelete: "restrict" }),
    paymentMethod: text("payment_method").notNull().default("cash"),
    description: text("description"),
    receiptUrl: text("receipt_url"),
    notes: text("notes"),
    status: text("status").notNull().default("approved"), // pending|approved|rejected|cancelled|voided
    clientRefId: text("client_ref_id").unique(),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_expenses_mess_date").on(t.messId, t.date),
    index("idx_expenses_category").on(t.categoryId),
  ],
);

export const expenseApprovals = sqliteTable(
  "expense_approvals",
  {
    id: text("id").primaryKey(),
    expenseId: text("expense_id")
      .notNull()
      .references(() => expenses.id, { onDelete: "cascade" }),
    approverId: text("approver_id").references(() => users.id),
    status: text("status").notNull(), // approved|rejected
    note: text("note"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_exp_approvals_expense").on(t.expenseId)],
);

// ---------- FINANCE ----------

export const deposits = sqliteTable(
  "deposits",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => messMembers.id, { onDelete: "restrict" }),
    date: text("date").notNull(),
    amountPaisa: integer("amount_paisa").notNull(),
    paymentMethod: text("payment_method").notNull().default("cash"), // cash|bank|mobile|other
    receivedBy: text("received_by").references(() => users.id),
    transactionId: text("transaction_id"),
    clientRefId: text("client_ref_id").unique(),
    note: text("note"),
    receiptUrl: text("receipt_url"),
    status: text("status").notNull().default("active"), // active|voided|reversed
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_deposits_mess_date").on(t.messId, t.date),
    index("idx_deposits_member").on(t.memberId),
  ],
);

export const ledgerEntries = sqliteTable(
  "ledger_entries",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => messMembers.id, { onDelete: "restrict" }),
    date: text("date").notNull(),
    type: text("type").notNull(), // deposit|meal_cost|expense_share|adjustment|refund|opening
    description: text("description").notNull(),
    debitPaisa: integer("debit_paisa").notNull().default(0),
    creditPaisa: integer("credit_paisa").notNull().default(0),
    balancePaisa: integer("balance_paisa").notNull(), // running balance snapshot
    refType: text("ref_type"), // deposit|market_entry|expense|settlement
    refId: text("ref_id"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_ledger_mess_member").on(t.messId, t.memberId),
    index("idx_ledger_date").on(t.date),
  ],
);

// ---------- SETTLEMENT ----------

export const monthlySettlements = sqliteTable(
  "monthly_settlements",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    month: integer("month").notNull(),
    totalMarketPaisa: integer("total_market_paisa").notNull().default(0),
    totalOtherExpensePaisa: integer("total_other_expense_paisa").notNull().default(0),
    totalFoodCostPaisa: integer("total_food_cost_paisa").notNull().default(0),
    totalMealsScaled: integer("total_meals_scaled").notNull().default(0),
    mealRatePaisa: integer("meal_rate_paisa").notNull().default(0),
    status: text("status").notNull().default("draft"), // draft|final|voided
    notes: text("notes"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("uq_settlement_period").on(t.messId, t.year, t.month)],
);

export const memberSettlements = sqliteTable(
  "member_settlements",
  {
    id: text("id").primaryKey(),
    settlementId: text("settlement_id")
      .notNull()
      .references(() => monthlySettlements.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => messMembers.id, { onDelete: "restrict" }),
    totalMealsScaled: integer("total_meals_scaled").notNull().default(0),
    mealCostPaisa: integer("meal_cost_paisa").notNull().default(0),
    allocatedExpensePaisa: integer("allocated_expense_paisa").notNull().default(0),
    previousBalancePaisa: integer("previous_balance_paisa").notNull().default(0),
    depositPaisa: integer("deposit_paisa").notNull().default(0),
    adjustmentPaisa: integer("adjustment_paisa").notNull().default(0),
    closingBalancePaisa: integer("closing_balance_paisa").notNull().default(0), // + = advance, - = due
    status: text("status").notNull().default("settled"), // due|advance|settled
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uq_member_settlement").on(t.settlementId, t.memberId)],
);

export const settlementAdjustments = sqliteTable(
  "settlement_adjustments",
  {
    id: text("id").primaryKey(),
    settlementId: text("settlement_id").references(() => monthlySettlements.id, { onDelete: "cascade" }),
    memberId: text("member_id")
      .notNull()
      .references(() => messMembers.id, { onDelete: "restrict" }),
    amountPaisa: integer("amount_paisa").notNull(),
    reason: text("reason").notNull(),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_adjustments_settlement").on(t.settlementId)],
);

// ---------- SPECIAL DAYS & GUEST ----------

export const specialDays = sqliteTable(
  "special_days",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    type: text("type").notNull(), // holiday|guest_day|party|event|closed|special_meal
    title: text("title").notNull(),
    note: text("note"),
    customRulesJson: text("custom_rules_json"),
    createdBy: text("created_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uq_special_day").on(t.messId, t.date), index("idx_special_days_mess").on(t.messId)],
);

export const guestMeals = sqliteTable(
  "guest_meals",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    date: text("date").notNull(),
    guestName: text("guest_name").notNull(),
    hostMemberId: text("host_member_id").references(() => messMembers.id, { onDelete: "restrict" }),
    mealTypeId: text("meal_type_id").references(() => mealTypes.id, { onDelete: "restrict" }),
    quantityScaled: integer("quantity_scaled").notNull(),
    isPaid: integer("is_paid", { mode: "boolean" }).notNull().default(false),
    costPaisa: integer("cost_paisa").notNull().default(0),
    recordedBy: text("recorded_by").references(() => users.id),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_guest_meals_mess_date").on(t.messId, t.date)],
);

// ---------- NOTIFICATIONS & AUDIT ----------

export const notifications = sqliteTable(
  "notifications",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messId: text("mess_id").references(() => messes.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // meal_reminder|deposit|due|settlement|approval|invitation|security
    title: text("title").notNull(),
    body: text("body"),
    isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
    link: text("link"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_notifications_user").on(t.userId), index("idx_notifications_mess").on(t.messId)],
);

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id").references(() => messes.id, { onDelete: "cascade" }),
    actorId: text("actor_id").references(() => users.id),
    action: text("action").notNull(), // create|update|delete|close|reopen|correct|void
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    beforeJson: text("before_json"),
    afterJson: text("after_json"),
    reason: text("reason"),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    index("idx_audit_mess").on(t.messId),
    index("idx_audit_entity").on(t.entityType, t.entityId),
    index("idx_audit_actor").on(t.actorId),
  ],
);

export const systemSettings = sqliteTable(
  "system_settings",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id").references(() => messes.id, { onDelete: "cascade" }), // null = global
    key: text("key").notNull(),
    valueJson: text("value_json").notNull(),
    updatedBy: text("updated_by").references(() => users.id),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [uniqueIndex("uq_system_settings").on(t.messId, t.key)],
);

// ---------- MARKETPLACE — Shared Living + Property (Bangladesh-first, international-ready) ----------

export const locations = sqliteTable(
  "locations",
  {
    id: text("id").primaryKey(),
    level: integer("level").notNull().default(3), // 1=division, 2=district, 3=upazila
    division: text("division").notNull(),
    district: text("district").notNull(),
    upazila: text("upazila"),
    unionName: text("union_name"),
    area: text("area"),
    bnName: text("bn_name"),
    postal: text("postal"),
    slug: text("slug").notNull().unique(),
    lat: text("lat"),
    lng: text("lng"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_locations_district").on(t.district), index("idx_locations_area").on(t.area), index("idx_locations_level").on(t.level)],
);

export const listings = sqliteTable(
  "listings",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    messId: text("mess_id").references(() => messes.id, { onDelete: "cascade" }), // nullable for standalone property
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    type: text("type").notNull(), // seat|bed|room|flat|apartment|house|hostel|mess|coliving
    status: text("status").notNull().default("draft"), // draft|pending|published|paused|rented|expired|rejected|archived
    pricePaisa: integer("price_paisa").notNull(), // rent per month in paisa
    depositPaisa: integer("deposit_paisa").notNull().default(0),
    serviceChargePaisa: integer("service_charge_paisa").notNull().default(0),
    currency: text("currency").notNull().default("BDT"),
    division: text("division"),
    district: text("district"),
    upazila: text("upazila"),
    unionName: text("union_name"),
    area: text("area"),
    address: text("address"),
    postalCode: text("postal_code"),
    lat: text("lat"),
    lng: text("lng"),
    bedrooms: integer("bedrooms"),
    bathrooms: integer("bathrooms"),
    sqft: integer("sqft"),
    floor: integer("floor"),
    totalFloors: integer("total_floors"),
    furnished: integer("furnished", { mode: "boolean" }).notNull().default(false),
    bachelorAllowed: integer("bachelor_allowed", { mode: "boolean" }).notNull().default(true),
    familyAllowed: integer("family_allowed", { mode: "boolean" }).notNull().default(false),
    genderPreference: text("gender_preference"), // male|female|any
    availableFrom: text("available_from"),
    occupancy: integer("occupancy"),
    totalSeats: integer("total_seats"),
    verified: integer("verified", { mode: "boolean" }).notNull().default(false),
    qualityScore: integer("quality_score").notNull().default(0),
    moderationReason: text("moderation_reason"),
    publishedAt: text("published_at"),
    expiresAt: text("expires_at"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [
    index("idx_listings_status").on(t.status),
    index("idx_listings_district_area").on(t.district, t.area),
    index("idx_listings_type_status").on(t.type, t.status),
    index("idx_listings_price").on(t.pricePaisa),
    index("idx_listings_owner").on(t.ownerId),
  ],
);

export const listingImages = sqliteTable(
  "listing_images",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    width: integer("width"),
    height: integer("height"),
    position: integer("position").notNull().default(0),
    isCover: integer("is_cover", { mode: "boolean" }).notNull().default(false),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_listing_images_listing").on(t.listingId)],
);

export const inquiries = sqliteTable(
  "inquiries",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    senderId: text("sender_id").references(() => users.id, { onDelete: "cascade" }),
    message: text("message").notNull(),
    contactPhone: text("contact_phone"),
    status: text("status").notNull().default("open"), // open|replied|closed|spam
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_inquiries_listing").on(t.listingId), index("idx_inquiries_sender").on(t.senderId)],
);

export const favorites = sqliteTable(
  "favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("uq_favorite").on(t.userId, t.listingId)],
);

export const moderationLogs = sqliteTable(
  "moderation_logs",
  {
    id: text("id").primaryKey(),
    listingId: text("listing_id")
      .notNull()
      .references(() => listings.id, { onDelete: "cascade" }),
    moderatorId: text("moderator_id").references(() => users.id),
    action: text("action").notNull(), // approve|reject|flag|pause
    reason: text("reason"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [index("idx_moderation_listing").on(t.listingId)],
);
