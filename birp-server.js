"use strict";

const express = require("express");
const morgan = require("morgan");
const cors = require("cors");
const birpRoutes = require("./routes/birp");
app.use("/", birpRoutes);

// Create new Express app for BIRP
const app = express();
const PORT = process.env.BIRP_PORT || 5051;

// Middleware
app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use(morgan("dev"));

// Routes
const birpExportPdf = require("./routes/birp-export-pdf");
app.use("/", birpExportPdf);

// Health check
app.get("/health", (req, res) => {
  res.json({ ok: true, service: "BIRP server" });
});

// Start server
app.listen(PORT, () => {
  console.log(`[BIRP] Server running on http://127.0.0.1:${PORT}`);
});
