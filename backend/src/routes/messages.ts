import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { messageFlagSchema } from "../validations/messages.js";
import {
  listConversations,
  listMessages,
  getMessage,
  flagMessage,
  listMessageFlags
} from "../controllers/messagesController.js";

const router = Router();

router.get("/conversations", listConversations);
router.get("/messages", listMessages);
router.get("/messages/:id", getMessage);
router.post("/flags", validateBody(messageFlagSchema), flagMessage);
router.get("/flags", listMessageFlags);

export default router;
