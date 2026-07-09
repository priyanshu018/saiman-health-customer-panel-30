import { z } from "zod";

export const paymentUpdateSchema = z
  .object({
    status: z.enum(["pending", "authorized", "captured", "failed", "refunded"]).optional(),
    paid_at: z.string().optional().nullable(),
    provider_ref: z.string().optional().nullable(),
    provider: z.string().optional().nullable(),
    amount: z.number().optional()
  })
  .strict();
