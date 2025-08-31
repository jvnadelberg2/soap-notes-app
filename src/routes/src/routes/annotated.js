import express from "express"; import { findBestICD } from "../services/icd.js";
const router=express.Router();
function fmtSOAP(d){
  const s=d.subjective?.rawText||""; const h=d.subjective?.patientHistory||"";
  const o=d.objective?.text||d.objective||""; const a=d.assessment?.text||d.assessment||""; const p=d.plan?.text||d.plan||"";
  const lines=[];
  lines.push("S: " + (s||"(none)")); if(h) lines.push("Hx: " + h);
  if(o) lines.push("O: " + o); if(a) lines.push("A: " + a); if(p) lines.push("P: " + p);
  return lines.join("\n");
}
router.post("/generate-soap-json-annotated", async (req,res)=>{
  const b=req.body||{}; const rawText=String(b.rawText||""); const patientHistory=String(b.patientHistory||"");
  const data={ subjective:{ rawText, patientHistory }, objective:{}, assessment:{}, plan:{} };
  const soapText=fmtSOAP(data);
  const icd=findBestICD({ text: rawText + " " + patientHistory, limit: 12 })||[];
  res.json({ soapText, icd });
});
export default router;
