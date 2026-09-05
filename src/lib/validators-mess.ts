import { z } from "zod";

const geoFields = {
  division: z.string().max(40).optional().or(z.literal("")),
  district: z.string().max(40).optional().or(z.literal("")),
  upazila: z.string().max(40).optional().or(z.literal("")),
  unionName: z.string().max(60).optional().or(z.literal("")),
  area: z.string().max(80).optional().or(z.literal("")),
  postalCode: z.string().max(10).optional().or(z.literal("")),
};

export const createMessSchema = z.object({
  name: z.string().min(2).max(80),
  description: z.string().max(500).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  ...geoFields,
  contactInfo: z.string().max(200).optional().or(z.literal("")),
  currency: z.string().default("BDT").optional(),
  timezone: z.string().default("Asia/Dhaka").optional(),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD"),
  defaultMealPrecision: z.number().int().refine((v) => [50, 100].includes(v), { message: "precision 50 or 100" }).optional(),
  mealCostingModel: z.enum(["food_only", "food_plus_expenses", "custom"]).optional(),
  costAllocation: z.enum(["equal", "meal_proportional", "member_specific", "custom"]).optional(),
  expenseApprovalThreshold: z.number().min(0).optional(), // BDT
  mealTypes: z
    .array(z.object({ name: z.string().min(1).max(30), sortOrder: z.number().int().optional() }))
    .min(1)
    .max(10)
    .optional(), // if not provided default to Breakfast/Lunch/Dinner
});

export const updateMessSchema = z.object({
  name: z.string().min(2).max(80).optional(),
  description: z.string().max(500).optional(),
  address: z.string().max(200).optional(),
  division: z.string().max(40).optional(),
  district: z.string().max(40).optional(),
  upazila: z.string().max(40).optional(),
  unionName: z.string().max(60).optional(),
  area: z.string().max(80).optional(),
  postalCode: z.string().max(10).optional(),
  contactInfo: z.string().max(200).optional(),
  timezone: z.string().optional(),
  costAllocation: z.enum(["equal", "meal_proportional", "member_specific", "custom"]).optional(),
  mealCostingModel: z.enum(["food_only", "food_plus_expenses", "custom"]).optional(),
  expenseApprovalThreshold: z.number().min(0).optional(),
});

export const createInvitationSchema = z.object({
  role: z.enum(["member", "assistant_manager", "manager"]).default("member").optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  expiresAt: z.string().optional(),
});

export const updateMemberSchema = z.object({
  role: z.enum(["member", "assistant_manager", "manager"]).optional(),
  status: z.enum(["active", "inactive", "suspended", "left", "archived"]).optional(),
  isPrimaryManager: z.boolean().optional(),
  permissionsJson: z.string().optional(),
});

export const createPlaceholderSchema = z.object({
  displayName: z.string().min(2, "নাম কমপক্ষে ২ অক্ষর").max(80),
  role: z.enum(["member", "assistant_manager", "manager"]).default("member").optional(),
});

export const linkMemberSchema = z.object({
  userId: z.string().min(1),
});
