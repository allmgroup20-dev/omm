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
});

export const vendorSchema = z.object({
  name: z.string().min(1).max(60),
  phone: z.string().max(20).optional().or(z.literal("")),
  address: z.string().max(200).optional().or(z.literal("")),
  category: z.string().max(40).optional().or(z.literal("")),
  notes: z.string().max(500).optional().or(z.literal("")),
});

export const marketEntryItemSchema = z.object({
  productId: z.string().optional().nullable(),
  productName: z.string().min(1).max(60), // if productId absent, free form
  categoryName: z.string().max(40).optional().or(z.literal("")),
  quantity: z.number().min(0.01).max(100000),
  unit: z.enum(UNITS),
  unitPrice: z.number().min(0).max(1000000), // BDT per unit
  notes: z.string().max(200).optional().or(z.literal("")),
});

export const marketEntrySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  purchasedBy: z.string().min(1).optional(), // messMemberId
  vendorId: z.string().optional().nullable(),
  vendorName: z.string().max(60).optional().or(z.literal("")), // free form if no vendorId
  paymentMethod: z.enum(["cash", "bank", "mobile", "other"]).default("cash").optional(),
  discount: z.number().min(0).max(1000000).optional().default(0), // BDT
  classification: z.enum(["food", "shared", "non_food"]).default("food").optional(),
  notes: z.string().max(500).optional().or(z.literal("")),
  referenceNumber: z.string().max(40).optional().or(z.literal("")),
  clientRefId: z.string().max(80).optional(),
  items: z.array(marketEntryItemSchema).min(1).max(50),
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
