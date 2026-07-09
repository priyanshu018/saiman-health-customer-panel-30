import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { paymentUpdateSchema } from "../validations/payments.js";
import { listPayments, getPayment, updatePayment, deletePayment } from "../controllers/paymentsController.js";

const router = Router();

router.get("/", listPayments);
router.get("/:id", getPayment);
router.patch("/:id", validateBody(paymentUpdateSchema), updatePayment);
router.delete("/:id", deletePayment);

export default router;
