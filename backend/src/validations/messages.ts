import { z } from "zod";

export const messageFlagSchema = z
  .object({
    message_id: z.string().uuid(),
    reason: z.string().min(2),
    notes: z.string().optional().nullable()
  })
  .strict();
