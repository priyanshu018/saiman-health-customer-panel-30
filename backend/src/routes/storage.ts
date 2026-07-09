import { Router } from "express";
import { createSignedUpload, getPublicUrl } from "../controllers/storageController.js";
import { validateBody } from "../middleware/validate.js";
import { z } from "zod";

const router = Router();

const signSchema = z
  .object({
    path: z.string().min(1),
    contentType: z.string().optional()
  })
  .strict();

router.post("/sign-upload", validateBody(signSchema), createSignedUpload);
router.get("/public-url", getPublicUrl);

export default router;
