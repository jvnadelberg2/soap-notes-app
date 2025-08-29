import express from "express";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import PDFDocument from "pdfkit";

const router = express.Router();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function loadNoteJson(id) {
  const p = path.resolve(__dirname, "../../notes", `${id}.json`);
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function writePdf({ header, soap, outPath }) {
  const doc = new PDFDocument({ margin: 50 });
  const stream = fs.createWriteStream(outPath);
  doc.pipe(stream);

  const h = header || {};
  const s = soap || {};

  doc.fontSize(18).text(h.title || "SOAP Note", { align: "left" });
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Date: ${h.date || new Date().toLocaleString()}`);
  if (h.clinic) doc.text(`Clinic: ${h.clinic}`);
  if (h.clinician) doc.text(`Clinician: ${h.clinician}`);
  if (h.patient) doc.text(`Patient: ${h.patient}`);
  if (h.mrn) doc.text(`MRN: ${h.mrn}`);
  if (h.dob) doc.text(`DOB: ${h.dob}`);
  if (h.specialty) doc.text(`Specialty: ${h.specialty}`);
  doc.moveDown();

  function section(label, text) {
    doc.fontSize(14).text(label, { underline: true });
    doc.moveDown(0.2);
    doc.fontSize(12).text(String(text || "Not provided"), { align: "left" });
    doc.moveDown();
  }

  section("Subjective", s.Subjective);
  section("Objective", s.Objective);
  section("Assessment", s.Assessment);
  section("Plan", s.Plan);

  doc.end();
  return new Promise((resolve, reject) => {
    stream.on("finish", resolve);
    stream.on("error", reject);
  });
}

router.post("/export-pdf", async (req, res) => {
  try {
    const { id = null, header = {}, data = null } = req.body || {};
    let soap = null;
    let meta = {};

    if (id) {
      const note = loadNoteJson(id);
      soap = note.soap || note.data || note;
      meta = note.meta || {};
      if (!header.specialty && note.specialty) header.specialty = note.specialty;
      if (!header.specialty && meta.specialty) header.specialty = meta.specialty;
    } else if (data) {
      soap = data;
    } else {
      return res.status(400).json({ error: "Provide note id or data" });
    }

    const base = id || `note_${Date.now()}`;
    const outPath = path.resolve(__dirname, "../../notes", `${base}.pdf`);
    await writePdf({ header, soap, outPath });

    return res.json({
      ok: true,
      id: base,
      file: `/notes/${base}.pdf`
    });
  } catch (e) {
    return res.status(500).json({ error: "Export failed" });
  }
});

export default router;
