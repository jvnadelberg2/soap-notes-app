"use strict";

const express = require("express");
const fs = require("fs");
const path = require("path");
const fontkit = require("fontkit");
const { PDFDocument, rgb } = require("pdf-lib");

const router = express.Router();

/* ---------------- Fonts ---------------- */
const fontBytes = fs.readFileSync(path.join(__dirname, "../fonts/NotoSans-Regular.ttf"));
const fontBoldBytes = fs.readFileSync(path.join(__dirname, "../fonts/NotoSans-Bold.ttf"));

/* ---------------- Utilities ---------------- */
function drawWrappedText(page, text, options) {
  const {
    x = 50,
    y = 750,
    font,
    fontSize = 12,
    maxWidth = 495,
    lineHeight = 16,
    align = "left", // "left" | "center"
  } = options;

  if (!text) return y;

  const words = String(text).split(/\s+/);
  let line = "";
  let cursorY = y;

  function drawLine(lineText) {
    if (!lineText) return;
    const w = font.widthOfTextAtSize(lineText, fontSize);
    const xPos = align === "center" ? x + Math.max(0, (maxWidth - w) / 2) : x;
    page.drawText(lineText, { x: xPos, y: cursorY, size: fontSize, font });
    cursorY -= lineHeight;
  }

  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);
    if (width > maxWidth && line) {
      drawLine(line);
      line = word;
    } else {
      line = testLine;
    }
  }
  if (line) drawLine(line);

  return cursorY;
}

function drawCenteredWatermark(page, text, opts) {
  const {
    font,
    fontSize = 100,
    angleDeg = 45,
    color = rgb(0.6, 0.6, 0.6),
    opacity = 0.3,
    nudgeX = 30,
    nudgeY = -30,
  } = opts;

  const { width: pw, height: ph } = page.getSize();
  const angle = (angleDeg * Math.PI) / 180;
  const tw = font.widthOfTextAtSize(text, fontSize);
  const th = font.heightAtSize(fontSize);
  const rotW = Math.abs(tw * Math.cos(angle)) + Math.abs(th * Math.sin(angle));
  const rotH = Math.abs(tw * Math.sin(angle)) + Math.abs(th * Math.cos(angle));
  const x = (pw - rotW) / 2 + nudgeX;
  const y = (ph - rotH) / 2 + nudgeY;

  page.drawText(text, {
    x,
    y,
    size: fontSize,
    font,
    color,
    opacity,
    rotate: { type: "degrees", angle: angleDeg },
  });
}

/* ---------------- PDF Builder ---------------- */
async function buildPdf(body) {
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

  const isSigned = Boolean(body.signatureId && body.signedAt && body.provider);

  function addHeaderFooter(p, pageNum, totalPages) {
    // === HEADER ===
    const headerLineY = height - margin - 40;

    // Title
    const title = "Clinical Note (SOAP)";
    p.drawText(title, {
      x: width / 2 - notoSansBold.widthOfTextAtSize(title, 16) / 2,
      y: height - margin + 10,
      size: 16,
      font: notoSansBold,
    });

    // Lines above the header rule
    const row1Y = headerLineY + 28; // patient/demo
    const row2Y = headerLineY + 14; // provider line

    // Patient + demographics (left)
    p.drawText(`Patient: ${body.patient || ""}`, {
      x: margin,
      y: row1Y,
      size: 10,
      font: notoSans,
    });
    const demo = `DOB: ${body.dob || ""}   Sex: ${body.sex || ""}   MRN: ${body.mrn || ""}`;
    p.drawText(demo, { x: margin + 200, y: row1Y, size: 10, font: notoSans });

    // Provider + creds (no "Credentials:" label) + NPI + Specialty
    let providerLine = `Provider: ${body.provider || ""}`;
    if (body.credentials) providerLine += `, ${body.credentials}`;
    if (body.npi) providerLine += `   NPI: ${body.npi}`;
    if (body.specialty) providerLine += `   Specialty: ${body.specialty}`;
    p.drawText(providerLine, { x: margin, y: row2Y, size: 10, font: notoSans });

    // Header rule
    p.drawLine({
      start: { x: margin, y: headerLineY },
      end: { x: width - margin, y: headerLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // === FOOTER ===
    const footerLineY = margin + 70;
    p.drawLine({
      start: { x: margin, y: footerLineY },
      end: { x: width - margin, y: footerLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    // Signature block (if signed) ELSE clinic/location (unsigned)
    if (isSigned) {
      let sigLine = `Electronically signed by ${body.provider || "Provider"}`;
      if (body.credentials) sigLine += `, ${body.credentials}`;
      if (body.npi) sigLine += ` (NPI: ${body.npi})`;

      p.drawText(sigLine, { x: margin, y: footerLineY - 15, size: 9, font: notoSans });
      p.drawText(new Date(body.signedAt).toLocaleString(), {
        x: margin,
        y: footerLineY - 28,
        size: 9,
        font: notoSans,
      });
    } else {
      p.drawText(`Clinic: ${body.clinic || ""}`, {
        x: margin,
        y: footerLineY - 15,
        size: 9,
        font: notoSans,
      });
      p.drawText(`Location: ${body.providerLocation || ""}`, {
        x: margin + 200,
        y: footerLineY - 15,
        size: 9,
        font: notoSans,
      });
    }

    // Page number (right)
    p.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: width - margin - 100,
      y: footerLineY - 15,
      size: 9,
      font: notoSans,
    });

    // Centered disclaimers (do not overlap "Printed")
    const maxW = width - 2 * margin;
    let dY = footerLineY - 45; // start a bit lower to leave room for signature/clinic row
    dY = drawWrappedText(p, "Confidentiality Notice: This document contains protected health information (PHI) under HIPAA (45 CFR §164). Unauthorized use or disclosure is strictly prohibited.", {
      x: margin,
      y: dY,
      font: notoSans,
      fontSize: 7,
      maxWidth: maxW,
      lineHeight: 9,
      align: "center",
    });
    drawWrappedText(p, "Medical Disclaimer: This clinical note is intended for documentation of patient care. It is not a substitute for professional medical advice, diagnosis, or treatment.", {
      x: margin,
      y: dY,
      font: notoSans,
      fontSize: 7,
      maxWidth: maxW,
      lineHeight: 9,
      align: "center",
    });

    // Printed timestamp (bottom-left, below disclaimers)
    p.drawText(`Printed: ${new Date().toLocaleString()}`, {
      x: margin,
      y: margin - 3,
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
    page.drawText(label.toUpperCase(), { x: margin, y, size: 12, font: notoSansBold });
    y -= lineHeight;

    if (typeof content === "object") {
      for (const [key, val] of Object.entries(content)) {
        if (!val) continue;
        const line = `${key[0].toUpperCase() + key.slice(1)}: ${val}`;
        y = drawWrappedText(page, line, {
          x: margin + 20,
          y,
          font: notoSans,
          fontSize: 11,
          maxWidth: width - 2 * margin - 20,
          lineHeight,
        });
      }
    } else {
      y = drawWrappedText(page, content, {
        x: margin + 20,
        y,
        font: notoSans,
        fontSize: 11,
        maxWidth: width - 2 * margin - 20,
        lineHeight,
      });
    }
    y -= lineHeight;
  }

  // TELEHEALTH (if present)
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
      y = drawWrappedText(page, `${label}: ${val}`, {
        x: margin + 20,
        y,
        font: notoSans,
        fontSize: 11,
        maxWidth: width - 2 * margin - 20,
        lineHeight,
      });
    }
    y -= lineHeight;
  }

  // SOAP body
  drawSection("Subjective", body.subjective);
  drawSection("Objective", body.objective);
  drawSection("Assessment", body.assessment);
  drawSection("Plan", body.plan);

  // ICD Codes
  if (Array.isArray(body.icd_codes) && body.icd_codes.length) {
    ensureSpace();
    page.drawText("ICD-10 CODES", { x: margin, y, size: 12, font: notoSansBold });
    y -= lineHeight;
    for (const code of body.icd_codes) {
      y = drawWrappedText(page, "• " + code, {
        x: margin + 20,
        y,
        font: notoSans,
        fontSize: 11,
        maxWidth: width - 2 * margin - 20,
        lineHeight,
      });
    }
    y -= lineHeight;
  }

  // Watermark only if unsigned
  if (!isSigned) {
    drawCenteredWatermark(page, "DRAFT", {
      font: notoSansBold,
      fontSize: 100,
      angleDeg: 45,
      color: rgb(0.6, 0.6, 0.6),
      opacity: 0.3,
    });
  }

  // Headers & Footers (incl. signature/printed line)
  pages.forEach((p, i) => addHeaderFooter(p, i + 1, pages.length));

  return pdfDoc.save();
}

/* ---------------- Route ---------------- */
router.post("/export/pdf", async (req, res) => {
  try {
    const body = req.body || {};
    const pdfBytes = await buildPdf(body);
    const filename = `note-${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("[export-pdf] ❌ Error while generating PDF:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;