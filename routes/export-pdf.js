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

/* ---------------- Helpers ---------------- */
function ensureSpace(state, linesNeeded = 5) {
  const minY = state.margin + 10 + linesNeeded * state.lineHeight;
  if (state.y < minY) {
    state.page = state.pdfDoc.addPage([595, 842]);
    state.pages.push(state.page);
    state.y = state.page.getHeight() - state.margin - 80;
  }
}

function drawWrappedText(state, text, { x, font, fontSize = 11, maxWidth, lineHeight, compact = false }) {
  if (!text) return;
  text = String(text).replace(/\r\n/g, "\n");

// Normalize and add smart breaks
text = String(text).replace(/\r\n/g, "\n");

// Always break coloned statements into visual paragraphs
text = text.replace(/([^\n]*?:)([^\n]*)/g, "\n\n$1$2");

// If compact (Plan), also add special handling for bullets and coloned headers
if (compact) {
  text = text
    .replace(/([*\-•]\s+)/g, "\n$1")
    .replace(/:\s*(?=[A-Z0-9])/g, ":\n");
}

  const paragraphs = text.split(/\n+/);

  for (let para of paragraphs) {
    para = para.trim();
    if (!para) {
      state.y -= lineHeight * 0.5;
      ensureSpace(state);
      continue;
    }

    const words = para.split(/\s+/);
    let line = "";

    const drawLine = (s) => {
      if (!s) return;
      state.page.drawText(s, { x, y: state.y, size: fontSize, font });
      state.y -= lineHeight;
      ensureSpace(state);
    };

    for (const w of words) {
      const test = line ? line + " " + w : w;
      const width = font.widthOfTextAtSize(test, fontSize);
      if (width > maxWidth && line) {
        drawLine(line);
        line = w;
      } else {
        line = test;
      }
    }

    if (line) drawLine(line);
    if (!compact) {
      state.y -= lineHeight * 0.5;
      ensureSpace(state);
    }
  }
}

/* ---------------- Drawing Helpers ---------------- */
function drawBulletedList(state, items, opts) {
  const { xBullet, xText, font, fontSize, maxWidth, lineHeight, bulletChar } = opts;
  for (let raw of items) {
    if (!raw) continue;
    let text = String(raw).trim().replace(/^([*\-•]\s+)/, "");
    const numMatch = text.match(/^(\d+[\.)])\s+(.*)$/);

    if (numMatch) {
      const label = numMatch[1];
      const rest = numMatch[2];
      state.page.drawText(label, { x: xBullet, y: state.y, size: fontSize, font });
      drawWrappedText(state, rest, { x: xText, font, fontSize, maxWidth, lineHeight });
    } else {
      state.page.drawText(bulletChar, { x: xBullet, y: state.y, size: fontSize, font });
      drawWrappedText(state, text, { x: xText, font, fontSize, maxWidth, lineHeight });
    }
  }
}

function drawCenteredWatermark(page, text, { font, fontSize, angleDeg, color, opacity }) {
  const { width: pw, height: ph } = page.getSize();
  page.drawText(text, {
    x: pw / 2 - font.widthOfTextAtSize(text, fontSize) / 2,
    y: ph / 2 - fontSize / 2,
    size: fontSize,
    font,
    color,
    opacity,
    rotate: { type: "degrees", angle: angleDeg },
  });
}

function drawWrappedCenteredFooterText(page, text, { yStart, font, fontSize, maxWidth, lineHeight }) {
  if (!text) return yStart;
  const words = String(text).split(/\s+/);
  let line = "";
  let y = yStart;

  const drawLine = (s) => {
    const w = font.widthOfTextAtSize(s, fontSize);
    const { width: pw } = page.getSize();
    const x = (pw - w) / 2;
    page.drawText(s, { x, y, size: fontSize, font });
    y -= lineHeight;
  };

  for (const w of words) {
    const test = line ? line + " " + w : w;
    const width = font.widthOfTextAtSize(test, fontSize);
    if (width > maxWidth && line) {
      drawLine(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) drawLine(line);
  return y;
}

/* ---------------- PDF Builder ---------------- */
async function buildPdf(body) {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const notoSans = await pdfDoc.embedFont(fontBytes);
  const notoSansBold = await pdfDoc.embedFont(fontBoldBytes);

  const margin = 50;
  const lineHeight = 16;
  let page = pdfDoc.addPage([595, 842]);
  const pages = [page];
  let y = page.getHeight() - margin - 80;
  const state = { pdfDoc, pages, page, y, margin, lineHeight, font: notoSans };

  const isSigned = Boolean(body.signatureId && body.signedAt && body.provider);

  function addHeaderFooter(p, pageNum, totalPages) {
    const { height, width } = p.getSize();
    const headerLineY = height - margin - 40;

    const title = "Clinical Note (SOAP)";
    p.drawText(title, {
      x: width / 2 - notoSansBold.widthOfTextAtSize(title, 16) / 2,
      y: height - margin + 10,
      size: 16,
      font: notoSansBold,
    });

    const row1Y = headerLineY + 28;
    p.drawText(`Patient: ${body.patient || ""}`, { x: margin, y: row1Y, size: 10, font: notoSans });
    const demo = `DOB: ${body.dob || ""}   Sex: ${body.sex || ""}   MRN: ${body.mrn || ""}`;
    p.drawText(demo, { x: margin + 200, y: row1Y, size: 10, font: notoSans });

    const row2Y = headerLineY + 14;
    let providerLine = `Provider: ${body.provider || ""}`;
    if (body.credentials) providerLine += `, ${body.credentials}`;
    if (body.npi) providerLine += `   NPI: ${body.npi}`;
    if (body.specialty) providerLine += `   Specialty: ${body.specialty}`;
    p.drawText(providerLine, { x: margin, y: row2Y, size: 10, font: notoSans });

    p.drawLine({
      start: { x: margin, y: headerLineY },
      end: { x: width - margin, y: headerLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    const footerLineY = margin + 70;
    p.drawLine({
      start: { x: margin, y: footerLineY },
      end: { x: width - margin, y: footerLineY },
      thickness: 1,
      color: rgb(0, 0, 0),
    });

    if (isSigned) {
      let sigLine = `Electronically signed by ${body.provider || "Provider"}`;
      if (body.credentials) sigLine += `, ${body.credentials}`;
      if (body.npi) sigLine += ` (NPI: ${body.npi})`;
      p.drawText(sigLine, { x: margin, y: footerLineY - 15, size: 9, font: notoSans });
      p.drawText(new Date(body.signedAt).toLocaleString(), { x: margin, y: footerLineY - 28, size: 9, font: notoSans });
    } else {
      p.drawText(`Clinic: ${body.clinic || ""}`, { x: margin, y: footerLineY - 15, size: 9, font: notoSans });
      p.drawText(`Location: ${body.providerLocation || ""}`, { x: margin + 200, y: footerLineY - 15, size: 9, font: notoSans });
    }

    p.drawText(`Page ${pageNum} of ${totalPages}`, {
      x: width - margin - 100,
      y: footerLineY - 15,
      size: 9,
      font: notoSans,
    });

    const maxW = width - 2 * margin;
    let dY = footerLineY - 45;
    dY = drawWrappedCenteredFooterText(p,
      "Confidentiality Notice: This document contains protected health information (PHI) under HIPAA (45 CFR §164). Unauthorized use or disclosure is strictly prohibited.",
      { yStart: dY, font: notoSans, fontSize: 7, maxWidth: maxW, lineHeight: 9 }
    );
    drawWrappedCenteredFooterText(p,
      "Medical Disclaimer: This clinical note is intended for documentation of patient care. It is not a substitute for professional medical advice, diagnosis, or treatment.",
      { yStart: dY, font: notoSans, fontSize: 7, maxWidth: maxW, lineHeight: 9 }
    );

    p.drawText(`Printed: ${new Date().toLocaleString()}`, {
      x: margin,
      y: margin - 3,
      size: 7,
      font: notoSans,
    });
  }

  function drawSectionHeader(label) {
    ensureSpace(state);
    state.page.drawText(label.toUpperCase(), { x: margin, y: state.y, size: 12, font: notoSansBold });
    state.y -= lineHeight;
  }

  function drawSectionParagraph(content) {
    drawWrappedText(state, content, {
      x: margin + 20,
      font: notoSans,
      fontSize: 11,
      maxWidth: state.page.getWidth() - 2 * margin - 20,
      lineHeight,
    });
    state.y -= lineHeight;
  }

  function drawSection(label, content) {
    if (!content || (typeof content === "string" && !content.trim())) return;
    drawSectionHeader(label);
    if (typeof content === "object") {
      for (const [k, v] of Object.entries(content)) {
        if (!v) continue;
        const line = `${k[0].toUpperCase() + k.slice(1)}: ${v}`;
        drawSectionParagraph(line);
      }
    } else {
      drawSectionParagraph(content);
    }
  }

  // --- Extract Assessment and Plan safely from generatedNote if provided ---
  const fullText = String(body.generatedNote || "").replace(/\r\n/g, "\n");
  const rxAssess = /\*\*ASSESSMENT\*\*([\s\S]*?)(?=\*\*PLAN\*\*|\[\[END\]\])/i;
  const rxPlan = /\*\*PLAN\*\*([\s\S]*?)(?=\[\[END\]\])/i;
  const assessment = (body.assessment || fullText.match(rxAssess)?.[1] || "").trim();
  const plan = (body.plan || fullText.match(rxPlan)?.[1] || "").trim();

  drawSection("Subjective", body.subjective);
  drawSection("Objective", body.objective);
  drawSection("Assessment", assessment);

  if (plan) {
    drawSectionHeader("Plan");
    drawWrappedText(state, plan, {
      x: margin + 20,
      font: notoSans,
      fontSize: 11,
      maxWidth: state.page.getWidth() - 2 * margin - 20,
      lineHeight,
      compact: true,
    });
  }

// --- ICD-10 Codes ---
if (Array.isArray(body.icd_codes) && body.icd_codes.length) {
  drawSectionHeader("ICD-10 Codes");

  for (const code of body.icd_codes) {
    drawWrappedText(state, "• " + code, {
      x: margin + 20,
      font: notoSans,
      fontSize: 11,
      maxWidth: state.page.getWidth() - 2 * margin - 20,
      lineHeight,
      compact: true  // 👈 keeps single spacing
    });
  }

  // Small extra visual gap after the ICD list
  state.y -= lineHeight * 0.5;
}

  if (!isSigned) {
    pages.forEach(p => drawCenteredWatermark(p, "DRAFT", {
      font: notoSansBold, fontSize: 100, angleDeg: 45,
      color: rgb(0.6, 0.6, 0.6), opacity: 0.3
    }));
  }

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
    res.setHeader("Content-Disposition", `inline; filename=\"${filename}\"`);
    res.send(Buffer.from(pdfBytes));
  } catch (err) {
    console.error("[export-pdf] Error:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

module.exports = router;