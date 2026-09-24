import { z } from "zod";

export const depositSchema = z.object({
  memberId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.number().min(0.01).max(10000000), // BDT
  paymentMethod: z.enum(["cash", "bank", "mobile", "other"]).default("cash").optional(),
  receivedBy: z.string().optional().nullable(),
  transactionId: z.string().max(80).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),
  receiptUrl: z.string().max(500).optional().or(z.literal("")),
  clientRefId: z.string().max(80).optional(),
});

/** Partial update for an existing deposit — at least one editable field + mandatory reason for audit. */
export const depositUpdateSchema = z.object({
  memberId: z.string().min(1).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  amount: z.number().min(0.01).max(10000000).optional(), // BDT
  paymentMethod: z.enum(["cash", "bank", "mobile", "other"]).optional(),
  receivedBy: z.string().optional().nullable(),
  transactionId: z.string().max(80).optional().or(z.literal("")),
  note: z.string().max(500).optional().or(z.literal("")),
  receiptUrl: z.string().max(500).optional().or(z.literal("")),
  reason: z.string().trim().min(3).max(500),
}).refine((d) => d.memberId !== undefined || d.date !== undefined || d.amount !== undefined || d.paymentMethod !== undefined || d.receivedBy !== undefined || d.transactionId !== undefined || d.note !== undefined || d.receiptUrl !== undefined, {
  message: "At least one field to update is required",
});

export type DepositUpdate = z.infer<typeof depositUpdateSchema>;
