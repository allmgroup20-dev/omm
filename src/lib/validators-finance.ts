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
