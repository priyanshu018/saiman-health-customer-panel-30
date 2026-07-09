import { Router } from "express";
import { listAdminLogs } from "../controllers/adminLogsController.js";

const router = Router();

router.get("/", listAdminLogs);

export default router;
