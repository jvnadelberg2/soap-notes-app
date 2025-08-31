import { apiAuth } from "./src/middleware/auth.js";
import 'dotenv/config';
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";

import soapRoutes from "./src/routes/soap.js";
import healthRoutes from "./src/routes/health.js";
import icdRoutes from "./src/routes/icd.js";
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
const isDev = process.env.NODE_ENV !== "production";
app.set("trust proxy", 1);
app.use(helmet());
app.use(compression({ filter:(req,res)=>{ if(req.path==="/api/generate-soap-stream") return false; return compression.filter(req,res); } }));
app.use(morgan("tiny"));
app.use(cors({ origin: process.env.CORS_ORIGIN || true }));
app.use(express.json({ limit: "1mb" }));
function basicAuth(req, res, next) {
  if (!process.env.BASIC_AUTH_USER) return next();
  if (req.path === "/health") return next();
  const header = req.headers.authorization || "";
  const [type, token] = header.split(" ");
  if (type === "Basic" && token) {
    const [u, p] = Buffer.from(token, "base64").toString().split(":");
    if (u === process.env.BASIC_AUTH_USER && p === process.env.BASIC_AUTH_PASS) return next();
  }
  res.set("WWW-Authenticate", 'Basic realm="SOAP Notes"');
  return res.status(401).json({ error: "Auth required" });
}
app.use("/api", apiAuth);

app.use("/api", soapRoutes);
app.use("/api", healthRoutes);
app.use("/api", icdRoutes);
app.use("/api", annotatedRoutes);
app.use("/api", modelsRoutes);
app.use("/api", streamRoutes);
app.use("/api", notesRoutes);
app.use("/api", providersRoutes);
app.use("/api", exportRoutes);
app.use("/api", todoRoutes);

app.use(express.static(path.join(__dirname, "public")));
app.use("/notes", express.static(path.join(__dirname, "notes")));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
import soapStrict from './src/http/soap-strict.mjs'
app.use('/api/soap/strict', soapStrict)
