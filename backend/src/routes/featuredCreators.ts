import { Router } from "express";
import type { Request, Response } from "express";
import { supabase } from "../utils/supabase.js";

const router = Router();

// GET all featured creators
router.get("/", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("featured_creators")
    .select("*, creator_directory(id, creator_name, niche)")
    .order("display_order");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// GET creator list for dropdown
router.get("/creators-list", async (_req: Request, res: Response) => {
  const { data, error } = await supabase
    .from("creator_directory")
    .select("id, creator_name, niche")
    .not("creator_name", "is", null)
    .order("creator_name");
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// POST add featured creator
router.post("/", async (req: Request, res: Response) => {
  const { creator_directory_id, display_order } = req.body;
  const { data, error } = await supabase
    .from("featured_creators")
    .insert({ creator_directory_id, display_order })
    .select()
    .single();
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// DELETE remove featured creator
router.delete("/:id", async (req: Request, res: Response) => {
  const { error } = await supabase
    .from("featured_creators")
    .delete()
    .eq("id", req.params.id);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

export default router;
