"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const fontkit = require("fontkit");
const { PDFDocument, rgb } = require("pdf-lib");

const router = express.Router();

/* ---------------- Fonts ---------------- */
const fontBytes = fs.readFileSync(
  path.join(__dirname, "../fonts/NotoSans-Regular.ttf")
);
const fontBoldBytes = fs.readFileSync(
  path.join(__dirname, "../fonts/NotoSans-Bold.ttf")
);

/* ---------------- Utilities ---------------- */
function drawWrappedCenteredText(page, text, options) {
  const {
    y,
    font,
    fontSize = 7,
    maxWidth = 495,
    lineHeight = 9,
  } = options;

  if (!text) return y;

  const words = String(text).split(/\s+/);
  let line = "";
  let cursorY = y;

  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && line) {
      const x = (page.getWidth() - font.widthOfTextAtSize(line, fontSize)) / 2;
      page.drawText(line, { x, y: cursorY, size: fontSize, font });
      line = word;
      cursorY -= lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    const x = (page.getWidth() - font.widthOfTextAtSize(line, fontSize)) / 2;
    page.drawText(line, { x, y: cursorY, size: fontSize, font });
    cursorY -= lineHeight;
  }
  return cursorY;
}

/* ---------------- PDF Builder ---------------- */
async function buildBirpPdf(body) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);

  const notoSans = await pdfDoc.embedFont(fontBytes);
  const notoSansBold = await pdfDoc.embedFont(fontBoldBytes);

  const margin = 50;
  const lineHeight = 16;

  let page = pdfDoc.addPage([595, 842]); // A4
  const { height, width } = page.getSize();
  let y = height - margin - 80;
  const pages = [page];

  function addHeaderFooter(p, pageNum, totalPages) {
    // --- Header ---
    p.drawLine({
      start: { x: margin, y: height - margin - 30 },
      end: { x: width - margin, y: height - margin - 30 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    p.drawText("Clinical Note (BIRP)", {
      x: width / 2 - 60,
      y: height - margin + 10,
      size: 16,
      font: notoSansBold,
    });

    p.drawText(`Patient: ${body.patient || ""}`, {
      x: margin,
      y: height - margin - 15,
      size: 10,
      font: notoSans,
    });
    p.drawText(
      `DOB: ${body.dob || ""}   Sex: ${body.sex || ""}   MRN: ${body.mrn || ""}`,
      { x: margin + 200, y: height - margin - 15, size: 10, font: notoSans }
    );

    let providerLine = `Provider: ${body.provider || ""}`;
    if (body.credentials) providerLine += ` Credentials: ${body.credentials}`;
    if (body.npi) providerLine += ` NPI: ${body.npi}`;
    p.drawText(providerLine, {
      x: margin,
      y: height - margin - 28,
      size: 10,
      font: notoSans,
    });

    p.drawText(`Specialty: ${body.specialty || ""}`, {
      x: margin + 200,
      y: height - margin - 28,
      size: 10,
      font: notoSans,
    });

    const dateStr = body.date || new Date().toLocaleDateString();
    const dateWidth = notoSans.widthOfTextAtSize(dateStr, 10);
    p.drawText(dateStr, {
      x: width - margin - dateWidth,
      y: height - margin - 28,
      size: 10,
      font: notoSans,
    });

    // --- Footer ---
    p.drawLine({
      start: { x: margin, y: margin + 70 },
      end: { x: width - margin, y: margin + 70 },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    p.drawText(`Clinic: ${body.clinic || ""}`, {
      x: margin,
      y: margin + 55,
      size: 9,
      font: notoSans,
    });
    p.drawText(`Location: ${body.providerLocation || ""}`, {
      x: margin + 200,
      y: margin + 55,
      size: 9,
      font: notoSans,
    });
    p.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: width - margin - 100,
      y: margin + 55,
      size: 9,
      font: notoSans,
    });

    // --- Centered Disclaimers ---
    const hipaa =
      "Confidentiality Notice: This document contains protected health information (PHI) under HIPAA (45 CFR §164). Unauthorized use or disclosure is strictly prohibited.";
    const disclaimer =
      "Medical Disclaimer: This clinical note is intended for documentation of patient care. It is not a substitute for professional medical advice, diagnosis, or treatment.";

    let discY = margin + 40;
    discY = drawWrappedCenteredText(p, hipaa, {
      y: discY,
      font: notoSans,
      fontSize: 7,
      maxWidth: width - 2 * margin,
    });
    drawWrappedCenteredText(p, disclaimer, {
      y: discY,
      font: notoSans,
      fontSize: 7,
      maxWidth: width - 2 * margin,
    });

    // Printed timestamp (left-aligned)
    p.drawText(`Printed: ${new Date().toLocaleString()}`, {
      x: margin,
      y: margin + 10,
      size: 7,
      font: notoSans,
    });
  }

  function ensureSpace(lines = 5) {
    if (y < margin + 100 + lines * lineHeight) {
      page = pdfDoc.addPage([595, 842]);
      pages.push(page);
      y = height - margin - 80;
    }
  }

  function drawSection(label, content) {
    if (!content || (typeof content === "string" && !content.trim())) return;
    ensureSpace();
    page.drawText(label.toUpperCase(), {
      x: margin,
      y,
      size: 12,
      font: notoSansBold,
    });
    y -= lineHeight;

    if (typeof content === "object") {
      for (const [key, val] of Object.entries(content)) {
        if (!val) continue;
        const line = `${key[0].toUpperCase() + key.slice(1)}: ${val}`;
        y = drawWrappedCenteredText(page, line, {
          y,
          font: notoSans,
          fontSize: 11,
          maxWidth: width - 2 * margin - 20,
        });
      }
    } else {
      y = drawWrappedCenteredText(page, content, {
        y,
        font: notoSans,
        fontSize: 11,
        maxWidth: width - 2 * margin - 20,
      });
    }

    y -= lineHeight;
  }

  // ---------------- TELEHEALTH ----------------
  const tele = [
    ["Platform", body.telePlatform],
    ["Consent", body.teleConsent ? "Yes" : ""],
    ["Consent At", body.teleConsentAt],
    ["Patient Location", body.telePatientLocation],
    ["Modality", body.teleModality],
  ].filter(([_, val]) => val);

  if (tele.length) {
    ensureSpace();
    page.drawText("TELEHEALTH", { x: margin, y, size: 12, font: notoSansBold });
    y -= lineHeight;
    for (const [label, val] of tele) {
      y = drawWrappedCenteredText(page, `${label}: ${val}`, {
        y,
        font: notoSans,
        fontSize: 11,
        maxWidth: width - 2 * margin - 20,
      });
    }
    y -= lineHeight;
  }

  // ---------------- BIRP BODY ----------------
  drawSection("Behavior", body.behavior);
  drawSection("Intervention", body.intervention);
  drawSection("Response", body.response);
  drawSection("Plan", body.plan);

  // ---------------- ICD Codes ----------------
  if (Array.isArray(body.icd_codes) && body.icd_codes.length) {
    ensureSpace();
    page.drawText("ICD-10 CODES", {
      x: margin,
      y,
      size: 12,
      font: notoSansBold,
    });
    y -= lineHeight;
    for (const code of body.icd_codes) {
      y = drawWrappedCenteredText(page, "• " + code, {
        y,
        font: notoSans,
        fontSize: 11,
        maxWidth: width - 2 * margin - 20,
      });
    }
    y -= lineHeight;
  }

  // ---------------- Draft Watermark ----------------
  if (!body.finalized) {
    pages.forEach((p) =>
      p.drawText("DRAFT", {
        x: width / 2 - 100,
        y: height / 2,
        size: 100,
        font: notoSansBold,
        color: rgb(0.6, 0.6, 0.6),
        opacity: 0.3,
        rotate: { type: "degrees", angle: 45 },
      })
    );
  }

  // ---------------- Signature Block ----------------
  if (body.finalized) {
    ensureSpace(3);
    page.drawLine({
      start: { x: margin, y },
      end: { x: width - margin, y },
      thickness: 0.5,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight;

    let sigLine = `Electronically signed by ${body.provider || "Provider"}`;
    if (body.credentials) sigLine += `, ${body.credentials}`;
    if (body.npi) sigLine += ` (NPI: ${body.npi})`;

    page.drawText(sigLine, {
      x: margin,
      y,
      size: 10,
      font: notoSans,
    });

    y -= lineHeight;
    page.drawText(`${body.date || new Date().toLocaleString()}`, {
      x: margin,
      y,
      size: 10,
      font: notoSans,
    });
  }

  // Add headers/footers
  pages.forEach((p, i) => addHeaderFooter(p, i + 1, pages.length));

  return pdfDoc.save();
}

/* ---------------- Route ---------------- */
router.post("/export/pdf/birp", async (req, res) => {
  try {
    const body = req.body || {};
    console.log("[birp-export-pdf] received payload keys:", Object.keys(body));

    const pdfBytes = await buildBirpPdf(body);
    const filename = `birp-note-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("[birp-export-pdf] ❌ Error while generating PDF:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;