import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

const PUBLIC_SUPABASE_URL = String(
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL || "",
).trim();
const PUBLIC_SUPABASE_ANON_KEY = String(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || "",
).trim();
const HAS_PUBLIC_SERVICE_ROLE = Boolean(
  String(
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY || "",
  ).trim(),
);
const HAS_SERVER_SERVICE_ROLE = Boolean(String(process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim());

export function getSupabaseEnv() {
  const url = PUBLIC_SUPABASE_URL;
  const anonKey = PUBLIC_SUPABASE_ANON_KEY;
  const hasServiceRoleOnly = Boolean((HAS_PUBLIC_SERVICE_ROLE || HAS_SERVER_SERVICE_ROLE) && !anonKey);
  const hasPublicServiceRole = HAS_PUBLIC_SERVICE_ROLE;

  return {
    url,
    anonKey,
    configured: Boolean(url && anonKey),
    hasServiceRoleOnly,
    hasPublicServiceRole,
  };
}

export function getSupabaseBrowserClient() {
  if (browserClient) return browserClient;

  const { url, anonKey, configured } = getSupabaseEnv();
  if (!configured) {
    throw new Error(
      "Supabase environment is missing. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }

  browserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });

  return browserClient;
}
