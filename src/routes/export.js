import express from "express";
import PDFDocument from "pdfkit";
import { PassThrough } from "stream";

const router = express.Router();

function drawHeader(doc, meta){
  const left = 50;
  const right = 562;
  doc.fontSize(16).text(meta.title || "SOAP Note", left, 40, { width: right-left, align: "left" });
  doc.moveDown(0.3);
  doc.fontSize(10);
  doc.text(`Provider: ${meta.provider || ""}`, left, 68);
  doc.text(`Clinic: ${meta.clinic || ""}`, left, 82);
  doc.text(`Discipline: ${meta.discipline || ""}`, left, 96);
  doc.text(`Patient: ${meta.patientName || ""}`, 320, 68);
  doc.text(`MRN: ${meta.mrn || ""}`, 320, 82);
  doc.text(`ICD-10: ${meta.icd || ""}`, 320, 96);
  doc.text(`Date/Time: ${meta.createdAt || ""}`, 320, 110);
  doc.moveTo(left, 128).lineTo(right,128).strokeColor("#dddddd").stroke();
  doc.fillColor("black");
}

function drawFooter(doc, meta){
  const left = 50;
  const right = 562;
  const bottom = doc.page.height - 40;
  doc.moveTo(left, bottom-14).lineTo(right, bottom-14).strokeColor("#dddddd").stroke();
  doc.fontSize(9).fillColor("#444");
  doc.text(`Provider: ${meta.provider || ""}   Clinic: ${meta.clinic || ""}   Discipline: ${meta.discipline || ""}`, left, bottom-10, { width: right-left, align:"left" });
  doc.text(`Patient: ${meta.patientName || ""}   MRN: ${meta.mrn || ""}   ICD-10: ${meta.icd || ""}`, left, bottom, { width: right-left, align:"left" });
  const cur = doc.page.margins ? doc.page.margins.bottom : 72;
  doc.fillColor("black");
}

function writeSoap(doc, soap){
  const left = 50;
  const top = 140;
  doc.fontSize(12).fillColor("black");
  const sections = String(soap||"").split(/\n/);
  let y = top;
  let boldNext = false;
  for(let i=0;i<sections.length;i++){
    const line = sections[i];
    if(/^Subjective:/i.test(line) || /^Objective:/i.test(line) || /^Assessment:/i.test(line) || /^Plan:/i.test(line)){
      doc.font("Helvetica-Bold").text(line, left, y, { width: 512 });
      y = doc.y;
      doc.font("Helvetica");
      continue;
    }
    doc.text(line, left, y, { width: 512 });
    y = doc.y;
  }
}

router.post("/export-pdf", async function(req, res){
  try{
    const b = req.body || {};
    const meta = {
      title: String(b.title || "SOAP Note"),
      provider: String(b.provider || ""),
      clinic: String(b.clinic || ""),
      discipline: String(b.discipline || ""),
      patientName: String(b.patientName || ""),
      mrn: String(b.mrn || ""),
      icd: String(b.icd || ""),
      createdAt: String(b.createdAt || ""),
      modelUsed: String(b.modelUsed || "")
    };
    const soap = String(b.soap || "");

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${(meta.title||"soap-note").replace(/[^A-Za-z0-9._-]+/g,"_")}.pdf"`);

    const stream = new PassThrough();
    const doc = new PDFDocument({ size: "LETTER", margin: 50, autoFirstPage: true });
    doc.pipe(stream);

    drawHeader(doc, meta);
    writeSoap(doc, soap);

    doc.on("pageAdded", function(){
      drawHeader(doc, meta);
    });

    const addFooter = function(){
      drawFooter(doc, meta);
    };

    addFooter();
    doc.end();
    stream.on("error", function(){});
    stream.pipe(res);
  }catch(e){
    res.status(500).type("text/plain").send("PDF error");
  }
});

function rtfEscape(s){
  return String(s||"").replace(/[\\{}]/g, function(m){ return "\\"+m }).replace(/\n/g, "\\par\n");
}

router.post("/save-note", async function(req, res){
  try{
    const b = req.body || {};
    const title = String(b.title || "SOAP Note");
    const meta = [
      `Provider: ${b.provider||""}`,
      `Clinic: ${b.clinic||""}`,
      `Discipline: ${b.discipline||""}`,
      `Patient: ${b.patientName||""}`,
      `MRN: ${b.mrn||""}`,
      `ICD-10: ${b.icd||""}`,
      `Date/Time: ${b.createdAt||""}`,
      `Model: ${b.modelUsed||""}`
    ].join("\n");
    const soap = String(b.soap || "");
    const rtf = [
      "{\\rtf1\\ansi\\deff0",
      "{\\fonttbl{\\f0 Helvetica;}}",
      "\\fs24 ",
      rtfEscape(title), "\\par\\par",
      rtfEscape(meta), "\\par\\par",
      rtfEscape(soap),
      "}"
    ].join("");

    const fname = `${title.replace(/[^A-Za-z0-9._-]+/g,"_")}.rtf`;
    res.setHeader("Content-Type", "application/rtf");
    res.setHeader("Content-Disposition", `attachment; filename="${fname}"`);
    res.send(rtf);
  }catch(e){
    res.status(500).json({ ok:false });
  }
});

export default router;

