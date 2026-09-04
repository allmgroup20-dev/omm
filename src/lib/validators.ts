import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "নাম কমপক্ষে ২ অক্ষর").max(80),
  email: z.string().email("সঠিক ইমেইল দিন"),
  phone: z.string().min(8).max(20).optional().or(z.literal("")),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
  profilePhoto: z.string().optional(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "পাসওয়ার্ড মিলছে না",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "নতুন পাসওয়ার্ড মিলছে না",
  path: ["confirmPassword"],
});

export const forgotSchema = z.object({
  email: z.string().email(),
});

export const resetSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((d) => d.newPassword === d.confirmPassword, {
  message: "পাসওয়ার্ড মিলছে না",
  path: ["confirmPassword"],
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
