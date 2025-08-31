import express from "express"; import { lookupICD, findBestICD } from "../services/icd.js";
const router=express.Router();
router.get("/icd-lookup",(req,res)=>{ const code=String(req.query.code||"").trim(); if(!code) return res.status(400).json({error:"code required"});
  const desc=lookupICD(code); if(!desc) return res.status(404).json({error:"not found"}); res.json({code,desc}) });
router.post("/icd-best",(req,res)=>{ const text=String((req.body&&(req.body.text||req.body.query||""))||"").trim();
  const limit=Math.max(1,Math.min(200,parseInt((req.body&&req.body.limit)??"12",10))); const icd=findBestICD({text,limit})||[]; res.json({icd,total:icd.length}) });
export default router;
