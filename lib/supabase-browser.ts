import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | null = null;

function readEnv(name: string) {
  if (typeof process === "undefined") return "";
  return String(process.env[name] || "").trim();
}

export function getSupabaseEnv() {
  const url = readEnv("NEXT_PUBLIC_SUPABASE_URL") || readEnv("EXPO_PUBLIC_SUPABASE_URL");
  const anonKey =
    readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY") || readEnv("EXPO_PUBLIC_SUPABASE_ANON_KEY");

  return { url, anonKey, configured: Boolean(url && anonKey) };
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
