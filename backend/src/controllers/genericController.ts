import type { Request, Response } from "express";
import { normalizeListQuery } from "../utils/pagination.js";
import { listRecords, createRecord } from "../services/crudService.js";
import { logAdminAction } from "../services/adminLogService.js";
import { supabase } from "../utils/supabase.js";

export const allowedTables = new Set([
  "users",
  "campaigns",
  "campaign_bookings",
  "payments",
  "brand_profiles",
  "conversations",
  "conversation_participants",
  "creator_directory",
  "creator_profiles",
  "creator_packages",
  "creator_package_platform_prices",
  "creator_niches",
  "creator_socials",
  "messages",
  "promo_codes",
  "promo_redemptions",
  "admin_users",
  "admin_logs",
  "message_flags"
]);

function getTable(req: Request) {
  const table = req.params.table;
  if (!allowedTables.has(table)) {
    throw new Error("Table not allowed");
  }
  return table;
}

const keyConfig: Record<string, { keys: string[]; separator?: string }> = {
  admin_users: { keys: ["user_id"] },
  conversation_participants: { keys: ["conversation_id", "user_id"], separator: ":" }
};

function parseKeys(table: string, idParam: string) {
  const config = keyConfig[table] ?? { keys: ["id"], separator: ":" };
  if (config.keys.length === 1) {
    return { [config.keys[0]]: idParam };
  }
  const parts = idParam.split(config.separator ?? ":");
  if (parts.length !== config.keys.length) {
    throw new Error(`Invalid id format for ${table}. Expected ${config.keys.join(config.separator ?? ":")}`);
  }
  return Object.fromEntries(config.keys.map((key, index) => [key, parts[index]]));
}

function buildKeyQuery(table: string, idParam: string) {
  const keys = parseKeys(table, idParam);
  let query = supabase.from(table).select("*");
  for (const [key, value] of Object.entries(keys)) {
    query = query.eq(key, value as never);
  }
  return query;
}

export async function listTable(req: Request, res: Response) {
  const table = getTable(req);
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table,
    page,
    pageSize,
    search,
    searchColumns: [],
    sortBy,
    sortOrder,
    softDelete: table !== "admin_logs" && table !== "admin_users" && table !== "message_flags"
  });
  res.json(result);
}

export async function getTableRecord(req: Request, res: Response) {
  const table = getTable(req);
  const softDelete = table !== "admin_logs" && table !== "admin_users" && table !== "message_flags";
  let query = buildKeyQuery(table, req.params.id);
  if (softDelete) query = query.is("deleted_at", null);
  const { data, error } = await query.maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return res.status(404).json({ error: "Record not found" });
  res.json(data);
}

export async function createTableRecord(req: Request, res: Response) {
  const table = getTable(req);
  const created = await createRecord(table, req.body);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "create",
    tableName: table,
    recordId: (created as any).id ?? (created as any).user_id ?? null
  });
  res.status(201).json(created);
}

export async function updateTableRecord(req: Request, res: Response) {
  const table = getTable(req);
  let query = supabase.from(table).update(req.body);
  const keys = parseKeys(table, req.params.id);
  for (const [key, value] of Object.entries(keys)) {
    query = query.eq(key, value as never);
  }
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(error.message);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "update",
    tableName: table,
    recordId: req.params.id,
    metadata: req.body
  });
  res.json(data);
}

export async function deleteTableRecord(req: Request, res: Response) {
  const table = getTable(req);
  const keys = parseKeys(table, req.params.id);
  let query = supabase.from(table).update({ deleted_at: new Date().toISOString() });
  for (const [key, value] of Object.entries(keys)) {
    query = query.eq(key, value as never);
  }
  const { data, error } = await query.select("*").single();
  if (error) throw new Error(error.message);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "soft_delete",
    tableName: table,
    recordId: req.params.id
  });
  res.json(data);
}
