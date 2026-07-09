import type { Request, Response } from "express";
import { normalizeListQuery } from "../utils/pagination.js";
import { listRecords, getById, createRecord, updateRecord, softDeleteRecord } from "../services/crudService.js";
import { logAdminAction } from "../services/adminLogService.js";

export async function listCampaigns(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "campaigns",
    page,
    pageSize,
    search,
    searchColumns: ["title", "description"],
    sortBy,
    sortOrder,
    filters: {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      brand_id: typeof req.query.brand_id === "string" ? req.query.brand_id : undefined
    },
    dateFrom: typeof req.query.date_from === "string" ? req.query.date_from : undefined,
    dateTo: typeof req.query.date_to === "string" ? req.query.date_to : undefined
  });
  res.json(result);
}

export async function getCampaign(req: Request, res: Response) {
  const data = await getById("campaigns", req.params.id);
  if (!data) return res.status(404).json({ error: "Campaign not found" });
  res.json(data);
}

export async function createCampaign(req: Request, res: Response) {
  const created = await createRecord("campaigns", req.body);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "create",
    tableName: "campaigns",
    recordId: created.id
  });
  res.status(201).json(created);
}

export async function updateCampaign(req: Request, res: Response) {
  const updated = await updateRecord("campaigns", req.params.id, req.body);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "update",
    tableName: "campaigns",
    recordId: req.params.id,
    metadata: req.body
  });
  res.json(updated);
}

export async function deleteCampaign(req: Request, res: Response) {
  const deleted = await softDeleteRecord("campaigns", req.params.id);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "soft_delete",
    tableName: "campaigns",
    recordId: req.params.id
  });
  res.json(deleted);
}
