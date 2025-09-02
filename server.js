import { apiAuth } from "./src/middleware/auth.js";
import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import soapRoutes from "./src/routes/soap.js";
import healthRoutes from "./src/routes/health.js";
// ICD routes intentionally removed
import annotatedRoutes from "./src/routes/annotated.js";
import modelsRoutes from "./src/routes/models.js";
import streamRoutes from "./src/routes/stream.js";
import notesRoutes from "./src/routes/notes.js";
import providersRoutes from "./src/routes/providers.js";
import exportRoutes from "./src/routes/export.js";
import todoRoutes from "./src/routes/todo.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Basic hardening
app.use(helmet({
  contentSecurityPolicy: false, // keep simple for local app
}));
app.use(compression());
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true }));

// CORS (adjust origin as needed)
const allowOrigin = process.env.CORS_ORIGIN || "*";
app.use(cors({ origin: allowOrigin }));

// Rate limit (lightweight default)
app.use(rateLimit({
  windowMs: 60_000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
}));

app.use(morgan("tiny"));

// Health first
app.use("/api", healthRoutes);

// Auth middleware (keep available; apply selectively if desired)
// Example to require auth on selected routes:
// app.use("/api/soap", apiAuth);

app.use("/api", soapRoutes);
app.use("/api", annotatedRoutes);
app.use("/api", modelsRoutes);
app.use("/api", streamRoutes);
app.use("/api", notesRoutes);
app.use("/api", providersRoutes);
app.use("/api", exportRoutes);
app.use("/api", todoRoutes);

// Static assets
app.use(express.static(path.join(__dirname, "public")));
app.use("/notes", express.static(path.join(__dirname, "notes")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

