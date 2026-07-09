import { z } from "zod";

export const bookingUpdateSchema = z
  .object({
    status: z
      .enum(["draft", "requested", "accepted", "rejected", "in_progress", "completed", "cancelled"])
      .optional(),
    offer_amount: z.number().optional().nullable(),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    price: z.number().optional().nullable(),
    deliverables: z.string().optional().nullable(),
    delivery_days: z.number().optional().nullable(),
    revisions: z.number().optional().nullable()
  })
  .strict();
