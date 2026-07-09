import { Router } from "express";
import { listTable, getTableRecord, createTableRecord, updateTableRecord, deleteTableRecord } from "../controllers/genericController.js";

const router = Router();

router.get("/:table", listTable);
router.get("/:table/:id", getTableRecord);
router.post("/:table", createTableRecord);
router.patch("/:table/:id", updateTableRecord);
router.delete("/:table/:id", deleteTableRecord);

export default router;
