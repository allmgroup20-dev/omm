import { z } from "zod";

export const UNITS = ["kg", "gram", "litre", "ml", "piece", "dozen", "packet", "bottle", "box", "custom"] as const;
export type Unit = (typeof UNITS)[number];

export const categorySchema = z.object({
  name: z.string().min(1).max(40),
  parentId: z.string().optional().nullable(),
  sortOrder: z.number().int().min(0).optional(),
});

export const productSchema = z.object({
  name: z.string().min(1).max(40),
  categoryId: z.string().min(1),
  defaultUnit: z.enum(UNITS).default("kg").optional(),
  sortOrder: z.number().int().min(0).optional(),
});

export const vendorSchema = z.object({
  name: z.string().min(1).max(60),
  phone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  category: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const marketEntryItemSchema = z
  .object({
    productId: z.string().optional().nullable(),
    productName: z.string().min(1).max(60), // if productId absent, free form
    categoryName: z.string().max(40).optional().or(z.literal("")),
    quantity: z.number().min(0.001).max(100000),
    unit: z.enum(UNITS),
    unitPrice: z.number().min(0).max(1000000).optional(), // BDT per unit — optional when total given
    total: z.number().min(0).max(10000000).optional(), // BDT total — exact when pasted (e.g. 2460 for 42.56kg)
    notes: z.string().max(200).optional().or(z.literal("")),
  })
  .superRefine((v, ctx) => {
    if (v.unitPrice == null && v.total == null) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "unitPrice or total required", path: ["unitPrice"] });
  });

export const marketEntrySchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    purchasedBy: z.string().min(1).optional(), // messMemberId
    vendorId: z.string().optional().nullable(),
    vendorName: z.string().max(60).optional().or(z.literal("")), // free form if no vendorId
    paymentMethod: z.enum(["cash", "bank", "mobile", "other"]).default("cash").optional(),
    discount: z.number().min(0).max(1000000).optional().default(0), // BDT
    transport: z.number().min(0).max(100000).optional().default(0), // গাড়ি ভাড়া BDT — alone allowed
    classification: z.enum(["food", "shared", "non_food"]).default("food").optional(),
    notes: z.string().max(500).optional().or(z.literal("")),
    referenceNumber: z.string().max(40).optional().or(z.literal("")),
    clientRefId: z.string().max(80).optional(),
    items: z.array(marketEntryItemSchema).min(0).max(50).default([]),
  })
  .superRefine((v, ctx) => {
    const hasItems = v.items && v.items.length > 0;
    const hasTransport = (v.transport || 0) > 0;
    if (!hasItems && !hasTransport) ctx.addIssue({ code: z.ZodIssueCode.custom, message: "items or transport required (পণ্য বা গাড়ি ভাড়া যেকোনো একটি)", path: ["items"] });
  });

export const marketEntryUpdateSchema = z
  .object({
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    vendorId: z.string().optional().nullable(),
    paymentMethod: z.enum(["cash", "bank", "mobile", "other"]).optional(),
    discount: z.number().min(0).max(1000000).optional(),
    transport: z.number().min(0).max(100000).optional(),
    classification: z.enum(["food", "shared", "non_food"]).optional(),
    notes: z.string().max(500).optional().or(z.literal("")),
    referenceNumber: z.string().max(40).optional().or(z.literal("")),
    items: z.array(marketEntryItemSchema.extend({ id: z.string().optional() })).min(0).max(50).optional(),
  })
  .superRefine((v, ctx) => {
    if (v.items !== undefined && v.items.length === 0 && (v.transport == null || v.transport === 0)) {
      // allow clearing items only if transport will be set — but on update we don't know existing transport, so allow empty items (caller should ensure transport or items)
    }
  });

export function calcItemTotal(quantity: number, unitPriceBDT: number): number {
  return Math.round(quantity * unitPriceBDT * 100); // paisa
}

export function toScaled(q: number): number {
  return Math.round(q * 100);
}
export function fromScaled(s: number): number {
  return s / 100;
}
export function toScaledMarket(q: number): number {
  return Math.round(q * 1000); // x1000 — preserves 42.560 (42kg 560g) exactly, market only
}
export function fromScaledMarket(s: number): number {
  return s / 1000;
}
