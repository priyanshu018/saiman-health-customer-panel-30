import { env } from "../config/env.js";
import { supabase } from "../utils/supabase.js";
import type { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

export type AdminContext = {
  adminId: string;
  userId: string;
  email?: string;
};

declare module "express-serve-static-core" {
  interface Request {
    admin?: AdminContext;
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      if (env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.error("Missing Authorization header. Origin:", req.headers.origin);
      }
      return res.status(401).json({ error: "Missing authorization token" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    const { data, error: userError } = await supabase.auth.getUser(token);

    if (userError || !data.user) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const userId = data.user.id;
    if (!userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { data: adminRow, error } = await supabase
      .from("admin_users")
      .select("user_id, role, is_active")
      .eq("user_id", userId)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: "Admin check failed" });
    }

    if (!adminRow || adminRow.is_active === false) {
      return res.status(403).json({ error: "Admin access required" });
    }

    req.admin = {
      adminId: adminRow.user_id,
      userId: adminRow.user_id,
      email: data.user.email ?? undefined,
    };

    next();
  } catch (err) {
    const isDev = env.NODE_ENV !== "production";
    const detail = err instanceof Error ? err.message : "unknown_error";
    if (isDev) {
      // eslint-disable-next-line no-console
      console.error("Auth error:", detail);
    }
    return res
      .status(401)
      .json({ error: "Unauthorized", ...(isDev ? { detail } : {}) });
  }
}

export function requestId(req: Request, _res: Response, next: NextFunction) {
  const id = req.headers["x-request-id"]?.toString() ?? randomUUID();
  req.headers["x-request-id"] = id;
  next();
}
