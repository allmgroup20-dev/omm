import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";

/**
 * OMM Phase 1 foundation schema
 * Full Phase 2 schema will be expanded in next phase.
 * Money stored as INTEGER paisa. Meal quantity stored as INTEGER scaled x100 (1.00 = 100)
 */

export const users = sqliteTable(
  "users",
  {
    id: text("id").primaryKey(),
    email: text("email").notNull().unique(),
    phone: text("phone"),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    profilePhoto: text("profile_photo"),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    status: text("status").notNull().default("active"), // active|suspended|deleted
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (t) => [index("idx_users_email").on(t.email)]
);

export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  tokenHash: text("token_hash").notNull().unique(),
  expiresAt: text("expires_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const messes = sqliteTable("messes", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(), // human-readable unique code
  description: text("description"),
  address: text("address"),
  contactInfo: text("contact_info"),
  currency: text("currency").notNull().default("BDT"),
  timezone: text("timezone").notNull().default("Asia/Dhaka"),
  status: text("status").notNull().default("active"),
  startDate: text("start_date").notNull(),
  createdBy: text("created_by").references(() => users.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const roles = sqliteTable("roles", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(), // super_admin|mess_manager|assistant_manager|member
  description: text("description"),
});

export const messMembers = sqliteTable(
  "mess_members",
  {
    id: text("id").primaryKey(),
    messId: text("mess_id")
      .notNull()
      .references(() => messes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    role: text("role").notNull().default("member"), // manager|assistant_manager|member
    status: text("status").notNull().default("active"), // active|inactive|suspended|left|archived
    joinedAt: text("joined_at").notNull(),
    leftAt: text("left_at"),
    createdAt: text("created_at").notNull(),
  },
  (t) => [
    uniqueIndex("uq_mess_member").on(t.messId, t.userId),
    index("idx_mess_members_mess").on(t.messId),
    index("idx_mess_members_user").on(t.userId),
  ]
);

// Placeholder for Phase 2 expansion - will be replaced with full entities
export const auditLogs = sqliteTable("audit_logs", {
  id: text("id").primaryKey(),
  messId: text("mess_id").references(() => messes.id),
  actorId: text("actor_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id").notNull(),
  beforeJson: text("before_json"),
  afterJson: text("after_json"),
  reason: text("reason"),
  createdAt: text("created_at").notNull(),
});
