"use strict";

const express = require("express");
const birpRoutes = require("./routes/birp");
const birpExportPdf = require("./routes/birp-export-pdf");

const router = express.Router();

console.log("[BIRP] birp-server.js router loaded");

// Log every request that comes through this router
router.use((req, res, next) => {
  console.log(`[BIRP] Incoming request: ${req.method} ${req.originalUrl}`);
  next();
});

// Attach feature routes
router.use("/", birpRoutes);
router.use("/", birpExportPdf);

// Health check
router.get("/health", (req, res) => {
  console.log("[BIRP] /health endpoint hit");
  res.json({ ok: true, service: "BIRP router" });
});

// Error logging middleware (before passing to main app’s error handler)
router.use((err, req, res, next) => {
  console.error("[BIRP] Router error:", err);
  next(err);
});

module.exports = router;