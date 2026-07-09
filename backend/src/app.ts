import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import swaggerUi from "swagger-ui-express";
import { env } from "./config/env.js";
import { requestId, requireAdmin } from "./middleware/auth.js";
import { errorHandler, notFound } from "./middleware/error.js";
import apiRoutes from "./routes/index.js";
import openApiDoc from "../docs/openapi.json";

const app = express();

app.use(requestId);
app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

app.get("/health", (_req, res) => res.json({ status: "ok" }));

app.use("/docs", swaggerUi.serve, swaggerUi.setup(openApiDoc));

app.use("/api", requireAdmin, apiRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
