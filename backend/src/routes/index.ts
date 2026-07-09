import { Router } from "express";
import users from "./users.js";
import campaigns from "./campaigns.js";
import bookings from "./bookings.js";
import messages from "./messages.js";
import payments from "./payments.js";
import storage from "./storage.js";
import dashboard from "./dashboard.js";
import adminLogs from "./admin-logs.js";
import tables from "./tables.js";
import featuredCreators from "./featuredCreators.js";

const router = Router();

router.use("/dashboard", dashboard);
router.use("/users", users);
router.use("/campaigns", campaigns);
router.use("/bookings", bookings);
router.use("/messages", messages);
router.use("/payments", payments);
router.use("/storage", storage);
router.use("/admin-logs", adminLogs);
router.use("/tables", tables);
router.use("/featured-creators", featuredCreators);

export default router;
