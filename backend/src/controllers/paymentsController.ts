import type { Request, Response } from "express";
import { normalizeListQuery } from "../utils/pagination.js";
import { listRecords, getById, updateRecord, softDeleteRecord } from "../services/crudService.js";
import { logAdminAction } from "../services/adminLogService.js";

export async function listPayments(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "payments",
    page,
    pageSize,
    search,
    searchColumns: ["provider", "provider_ref"],
    sortBy,
    sortOrder,
    filters: {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      payer_id: typeof req.query.payer_id === "string" ? req.query.payer_id : undefined,
      payee_id: typeof req.query.payee_id === "string" ? req.query.payee_id : undefined,
      campaign_id: typeof req.query.campaign_id === "string" ? req.query.campaign_id : undefined
    },
    dateFrom: typeof req.query.date_from === "string" ? req.query.date_from : undefined,
    dateTo: typeof req.query.date_to === "string" ? req.query.date_to : undefined
  });
  res.json(result);
}

export async function getPayment(req: Request, res: Response) {
  const data = await getById("payments", req.params.id);
  if (!data) return res.status(404).json({ error: "Payment not found" });
  res.json(data);
}

export async function updatePayment(req: Request, res: Response) {
  const updated = await updateRecord("payments", req.params.id, req.body);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "update",
    tableName: "payments",
    recordId: req.params.id,
    metadata: req.body
  });
  res.json(updated);
}

export async function deletePayment(req: Request, res: Response) {
  const deleted = await softDeleteRecord("payments", req.params.id);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "soft_delete",
    tableName: "payments",
    recordId: req.params.id
  });
  res.json(deleted);
}
