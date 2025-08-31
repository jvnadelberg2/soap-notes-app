import express from "express";
import { lookupICD, findBestICD, icdDebug } from "../services/icd.js";

const router = express.Router();

router.get("/icd-lookup",(req,res)=>{
  const code = String(req.query.code||"").trim();
  if(!code) return res.status(400).json({error:"code required"});
  const desc = lookupICD(code);
  if(!desc) return res.status(404).json({error:"not found"});
  res.json({code,desc});
});

router.post("/icd-best",(req,res)=>{
  const b = req.body || {};
  const text = String((b.text ?? b.query ?? "")).trim();
  const raw = (b.limit ?? req.query.limit ?? req.get("x-limit"));
  const n = Number(raw);
  const limit = Number.isFinite(n) ? Math.max(1, Math.min(200, n)) : 12;
  const icd = findBestICD({ text, limit }) || [];
  res.json({ icd, total: icd.length, limit });
});

router.get("/icd-debug",(_req,res)=>res.json(icdDebug()));

export default router;
