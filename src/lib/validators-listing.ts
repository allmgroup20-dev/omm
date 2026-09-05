import { z } from "zod";

export const listingTypes = ["seat", "bed", "room", "flat", "apartment", "house", "hostel", "mess", "coliving"] as const;
export const listingStatuses = ["draft", "pending", "published", "paused", "rented", "expired", "rejected", "archived"] as const;

export const listingSchema = z.object({
  title: z.string().min(5).max(80),
  description: z.string().max(2000).optional().or(z.literal("")),
  type: z.enum(listingTypes),
  price: z.number().min(500).max(1000000), // BDT per month
  deposit: z.number().min(0).max(1000000).optional().default(0),
  serviceCharge: z.number().min(0).max(100000).optional().default(0),
  division: z.string().max(40).optional().or(z.literal("")),
  district: z.string().max(40).optional().or(z.literal("")),
  upazila: z.string().max(40).optional().or(z.literal("")),
  unionName: z.string().max(60).optional().or(z.literal("")),
  area: z.string().max(60).optional().or(z.literal("")),
  address: z.string().max(300).optional().or(z.literal("")),
  postalCode: z.string().max(10).optional().or(z.literal("")),
  lat: z.string().max(20).optional().or(z.literal("")),
  lng: z.string().max(20).optional().or(z.literal("")),
  bedrooms: z.number().int().min(0).max(10).optional(),
  bathrooms: z.number().int().min(0).max(10).optional(),
  sqft: z.number().int().min(0).max(10000).optional(),
  floor: z.number().int().min(0).max(100).optional(),
  totalFloors: z.number().int().min(0).max(100).optional(),
  furnished: z.boolean().optional().default(false),
  bachelorAllowed: z.boolean().optional().default(true),
  familyAllowed: z.boolean().optional().default(false),
  genderPreference: z.enum(["male", "female", "any"]).optional().default("any"),
  availableFrom: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().or(z.literal("")),
  occupancy: z.number().int().min(0).max(100).optional(),
  totalSeats: z.number().int().min(0).max(100).optional(),
  coverImageUrl: z.string().url().max(500).optional().or(z.literal("")),
  honeypot: z.string().max(0).optional().or(z.literal("")), // must be empty (spam trap)
});

export const inquirySchema = z.object({
  message: z.string().min(10).max(1000),
  contactPhone: z.string().max(20).optional().or(z.literal("")),
  honeypot: z.string().max(0).optional().or(z.literal("")),
});
