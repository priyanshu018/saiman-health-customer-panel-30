import type { Request, Response } from "express";
import { normalizeListQuery } from "../utils/pagination.js";
import { listRecords, getById, updateRecord, softDeleteRecord, createRecord } from "../services/crudService.js";
import { supabase } from "../utils/supabase.js";
import { logAdminAction } from "../services/adminLogService.js";

export async function listUsers(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "users",
    page,
    pageSize,
    search,
    searchColumns: ["username", "email", "phone_number"],
    sortBy,
    sortOrder,
    filters: {
      role: typeof req.query.role === "string" ? req.query.role : undefined,
      is_blocked: typeof req.query.is_blocked === "string" ? req.query.is_blocked === "true" : undefined
    }
  });
  res.json(result);
}

export async function getUser(req: Request, res: Response) {
  const data = await getById("users", req.params.id);
  if (!data) return res.status(404).json({ error: "User not found" });
  res.json(data);
}

export async function updateUser(req: Request, res: Response) {
  const updated = await updateRecord("users", req.params.id, req.body);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "update",
    tableName: "users",
    recordId: req.params.id,
    metadata: req.body
  });
  res.json(updated);
}

export async function deleteUser(req: Request, res: Response) {
  const deleted = await softDeleteRecord("users", req.params.id);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "soft_delete",
    tableName: "users",
    recordId: req.params.id
  });
  res.json(deleted);
}

export async function setUserBlocked(req: Request, res: Response) {
  const { is_blocked } = req.body as { is_blocked: boolean };
  const updated = await updateRecord("users", req.params.id, { is_blocked });
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: is_blocked ? "block" : "unblock",
    tableName: "users",
    recordId: req.params.id
  });
  res.json(updated);
}

export async function verifyCreator(req: Request, res: Response) {
  const { status } = req.body as { status: "verified" | "rejected" | "pending" };
  const { data, error } = await supabase
    .from("creator_profiles")
    .update({ verification_status: status })
    .eq("id", req.params.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  await logAdminAction({
    adminId: req.admin!.adminId,
    action: `verify_creator:${status}`,
    tableName: "creator_profiles",
    recordId: req.params.id
  });

  res.json(data);
}

export async function listAdminUsers(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "admin_users",
    page,
    pageSize,
    search,
    searchColumns: ["user_id", "role"],
    sortBy,
    sortOrder,
    softDelete: false
  });
  res.json(result);
}

export async function createAdminUser(req: Request, res: Response) {
  const created = await createRecord("admin_users", req.body);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "create_admin",
    tableName: "admin_users",
    recordId: created.user_id
  });
  res.status(201).json(created);
}
