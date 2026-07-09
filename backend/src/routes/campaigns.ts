import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { campaignCreateSchema, campaignUpdateSchema } from "../validations/campaigns.js";
import {
  listCampaigns,
  getCampaign,
  createCampaign,
  updateCampaign,
  deleteCampaign
} from "../controllers/campaignsController.js";

const router = Router();

router.get("/", listCampaigns);
router.get("/:id", getCampaign);
router.post("/", validateBody(campaignCreateSchema), createCampaign);
router.patch("/:id", validateBody(campaignUpdateSchema), updateCampaign);
router.delete("/:id", deleteCampaign);

export default router;
