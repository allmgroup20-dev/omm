import { z } from "zod";

export const expenseCategorySchema = z.object({
  name: z.string().min(1).max(40),
  parentId: z.string().optional().nullable(),
});

export const expenseSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  categoryId: z.string().optional().nullable(),
  categoryName: z.string().max(40).optional().or(z.literal("")), // free form if no categoryId
  amount: z.number().min(0.01).max(10000000), // BDT
  paidBy: z.string().min(1).optional(), // messMemberId
  paymentMethod: z.enum(["cash", "bank", "mobile", "other"]).default("cash").optional(),
  description: z.string().max(500).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
  clientRefId: z.string().max(80).optional(),
  // receiptUrl handled via R2 in future, optional string for now
  receiptUrl: z.string().max(500).optional().or(z.literal("")),
});

export const approvalSchema = z.object({
  note: z.string().max(500).optional().or(z.literal("")),
});
