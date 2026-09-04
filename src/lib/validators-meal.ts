import { z } from "zod";

export const mealTypeSchema = z.object({
  name: z.string().min(1).max(30),
  sortOrder: z.number().int().min(0).max(100).optional(),
  isActive: z.boolean().optional(),
});

export const mealEntrySchema = z.object({
  memberId: z.string().min(1),
  mealTypeId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  quantity: z.number().min(0).max(20), // e.g. 0, 0.5, 1, 1.5, 2
  reason: z.string().max(200).optional(),
});

export const bulkMealSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  entries: z.array(
    z.object({
      memberId: z.string().min(1),
      mealTypeId: z.string().min(1),
      quantity: z.number().min(0).max(20),
    }),
  ).min(1).max(500),
  reason: z.string().max(200).optional(),
});

export const bulkSetAllSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  mealTypeId: z.string().min(1).optional(), // if set, only that type; otherwise all types
  quantity: z.number().min(0).max(20),
  memberIds: z.array(z.string()).optional(), // subset, or all active if omitted
});

export const lockSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  reason: z.string().max(200).optional(),
});

export function toScaled(quantity: number): number {
  return Math.round(quantity * 100);
}

export function fromScaled(scaled: number): number {
  return scaled / 100;
}

export function validatePrecision(scaled: number, precision: number): boolean {
  // precision 50 => multiples of 50, 100 => multiples of 100
  return scaled % precision === 0;
}
