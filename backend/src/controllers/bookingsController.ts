import type { Request, Response } from "express";
import { normalizeListQuery } from "../utils/pagination.js";
import { listRecords, getById, updateRecord, softDeleteRecord } from "../services/crudService.js";
import { logAdminAction } from "../services/adminLogService.js";

export async function listBookings(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "campaign_bookings",
    page,
    pageSize,
    search,
    searchColumns: ["plan_name", "deliverables"],
    sortBy,
    sortOrder,
    filters: {
      status: typeof req.query.status === "string" ? req.query.status : undefined,
      campaign_id: typeof req.query.campaign_id === "string" ? req.query.campaign_id : undefined,
      creator_id: typeof req.query.creator_id === "string" ? req.query.creator_id : undefined
    },
    dateFrom: typeof req.query.date_from === "string" ? req.query.date_from : undefined,
    dateTo: typeof req.query.date_to === "string" ? req.query.date_to : undefined
  });
  res.json(result);
}

export async function getBooking(req: Request, res: Response) {
  const data = await getById("campaign_bookings", req.params.id);
  if (!data) return res.status(404).json({ error: "Booking not found" });
  res.json(data);
}

export async function updateBooking(req: Request, res: Response) {
  const updated = await updateRecord("campaign_bookings", req.params.id, req.body);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "update",
    tableName: "campaign_bookings",
    recordId: req.params.id,
    metadata: req.body
  });
  res.json(updated);
}

export async function deleteBooking(req: Request, res: Response) {
  const deleted = await softDeleteRecord("campaign_bookings", req.params.id);
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "soft_delete",
    tableName: "campaign_bookings",
    recordId: req.params.id
  });
  res.json(deleted);
}
