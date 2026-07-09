import { z } from "zod";

export const campaignCreateSchema = z
  .object({
    brand_id: z.string().uuid(),
    title: z.string().min(1),
    description: z.string().optional().nullable(),
    status: z.enum(["draft", "active", "completed", "cancelled"]).optional()
  })
  .strict();

export const campaignUpdateSchema = campaignCreateSchema.partial().strict();
