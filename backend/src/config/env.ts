import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(8080),
  NODE_ENV: z.string().default("development"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  SUPABASE_JWT_SECRET: z.string().min(1),
  ADMIN_BUCKET: z.string().default("admin-uploads"),
  CORS_ORIGIN: z.string().default("*")
});

export const env = envSchema.parse(process.env);
