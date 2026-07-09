import type { Request, Response } from "express";
import { normalizeListQuery } from "../utils/pagination.js";
import { listRecords, getById, createRecord } from "../services/crudService.js";
import { logAdminAction } from "../services/adminLogService.js";

export async function listConversations(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "conversations",
    page,
    pageSize,
    search,
    searchColumns: ["id"],
    sortBy,
    sortOrder,
    filters: {
      booking_id: typeof req.query.booking_id === "string" ? req.query.booking_id : undefined
    }
  });
  res.json(result);
}

export async function listMessages(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "messages",
    page,
    pageSize,
    search,
    searchColumns: ["body"],
    sortBy,
    sortOrder,
    filters: {
      conversation_id: typeof req.query.conversation_id === "string" ? req.query.conversation_id : undefined,
      sender_id: typeof req.query.sender_id === "string" ? req.query.sender_id : undefined,
      message_type: typeof req.query.message_type === "string" ? req.query.message_type : undefined
    }
  });
  res.json(result);
}

export async function getMessage(req: Request, res: Response) {
  const data = await getById("messages", req.params.id);
  if (!data) return res.status(404).json({ error: "Message not found" });
  res.json(data);
}

export async function flagMessage(req: Request, res: Response) {
  const created = await createRecord("message_flags", {
    message_id: req.body.message_id,
    reason: req.body.reason,
    notes: req.body.notes ?? null,
    flagged_by: req.admin!.adminId
  });
  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "flag_message",
    tableName: "message_flags",
    recordId: created.id
  });
  res.status(201).json(created);
}

export async function listMessageFlags(req: Request, res: Response) {
  const { page, pageSize, search, sortBy, sortOrder } = normalizeListQuery(req.query as Record<string, unknown>);
  const result = await listRecords({
    table: "message_flags",
    page,
    pageSize,
    search,
    searchColumns: ["reason", "notes"],
    sortBy,
    sortOrder,
    softDelete: false
  });
  res.json(result);
}
