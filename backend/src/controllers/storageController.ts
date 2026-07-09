import type { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";
import { env } from "../config/env.js";
import { logAdminAction } from "../services/adminLogService.js";

export async function createSignedUpload(req: Request, res: Response) {
  const { path, contentType } = req.body as { path: string; contentType?: string };
  const { data, error } = await supabase.storage.from(env.ADMIN_BUCKET).createSignedUploadUrl(path);

  if (error) throw new Error(error.message);

  await logAdminAction({
    adminId: req.admin!.adminId,
    action: "create_signed_upload",
    tableName: "storage",
    recordId: path
  });

  res.json({
    uploadUrl: data?.signedUrl,
    token: data?.token,
    path,
    contentType: contentType ?? null
  });
}

export async function getPublicUrl(req: Request, res: Response) {
  const { path } = req.query as { path: string };
  const { data } = supabase.storage.from(env.ADMIN_BUCKET).getPublicUrl(path);
  res.json({ publicUrl: data.publicUrl });
}
