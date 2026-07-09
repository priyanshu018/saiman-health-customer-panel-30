import { Router } from "express";
import { validateBody } from "../middleware/validate.js";
import { bookingUpdateSchema } from "../validations/bookings.js";
import { listBookings, getBooking, updateBooking, deleteBooking } from "../controllers/bookingsController.js";

const router = Router();

router.get("/", listBookings);
router.get("/:id", getBooking);
router.patch("/:id", validateBody(bookingUpdateSchema), updateBooking);
router.delete("/:id", deleteBooking);

export default router;
