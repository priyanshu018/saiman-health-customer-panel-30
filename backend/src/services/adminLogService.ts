import { supabase } from "../utils/supabase.js";

export async function logAdminAction(params: {
  adminId: string;
  action: string;
  tableName: string;
  recordId?: string | null;
  metadata?: Record<string, unknown> | null;
}) {
  const { adminId, action, tableName, recordId, metadata } = params;
  await supabase.from("admin_logs").insert({
    admin_id: adminId,
    action,
    table_name: tableName,
    record_id: recordId ?? null,
    metadata: metadata ?? null
  });
}
