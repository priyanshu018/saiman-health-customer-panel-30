import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { userUpdateSchema, adminUserSchema, creatorVerificationSchema } from "../validations/users.js";
import { z } from "zod";
import {
  listUsers,
  getUser,
  updateUser,
  deleteUser,
  setUserBlocked,
  verifyCreator,
  listAdminUsers,
  createAdminUser
} from "../controllers/usersController.js";

const router = Router();

router.get("/admin/list", listAdminUsers);
router.post("/admin", validateBody(adminUserSchema), createAdminUser);

router.get("/", listUsers);
router.get("/:id", getUser);
router.patch("/:id", validateBody(userUpdateSchema), updateUser);
router.delete("/:id", deleteUser);
const blockSchema = z.object({ is_blocked: z.boolean() }).strict();

router.patch("/:id/block", validateBody(blockSchema), setUserBlocked);
router.patch("/:id/verify", validateBody(creatorVerificationSchema), verifyCreator);

export default router;
