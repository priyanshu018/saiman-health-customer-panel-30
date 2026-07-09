import { z } from "zod";

export const userUpdateSchema = z
  .object({
    username: z.string().min(1).optional(),
    email: z.string().email().optional(),
    phone_number: z.string().optional().nullable(),
    role: z.enum(["brand", "creator"]).optional(),
    gender: z.enum(["male", "female", "other"]).optional().nullable(),
    is_onboarded: z.boolean().optional(),
    address: z.string().optional().nullable(),
    description: z.string().optional().nullable(),
    is_blocked: z.boolean().optional()
  })
  .strict();

export const adminUserSchema = z
  .object({
    user_id: z.string().uuid(),
    role: z.enum(["super_admin", "staff"]).default("staff"),
    is_active: z.boolean().default(true)
  })
  .strict();

export const creatorVerificationSchema = z
  .object({
    status: z.enum(["verified", "rejected", "pending"])
  })
  .strict();
