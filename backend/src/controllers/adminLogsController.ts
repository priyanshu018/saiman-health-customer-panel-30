import type { Request, Response } from "express";
import { normalizeListQuery } from "../utils/pagination.js";
import { listRecords } from "../services/crudService.js";

export async function listAdminLogs(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "admin_logs",
    page,
    pageSize,
    search,
    searchColumns: ["action", "table_name", "record_id"],
    sortBy,
    sortOrder,
    softDelete: false
  });
  res.json(result);
}
