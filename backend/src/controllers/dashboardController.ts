import type { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";

async function countTable(table: string) {
  const { count, error } = await supabase.from(table).select("id", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return count ?? 0;
}

export async function getDashboardStats(_req: Request, res: Response) {
  const [users, campaigns, bookings, payments] = await Promise.all([
    countTable("users"),
    countTable("campaigns"),
    countTable("campaign_bookings"),
    countTable("payments")
  ]);

  const { data: recentLogs, error } = await supabase
    .from("admin_logs")
    .select("id, admin_id, action, table_name, record_id, created_at")
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) throw new Error(error.message);

  res.json({
    totals: { users, campaigns, bookings, payments },
    recentActivity: recentLogs ?? []
  });
}
