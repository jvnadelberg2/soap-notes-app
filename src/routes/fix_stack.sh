mkdir -p src/services src/routes

cat > src/services/icd.js <<'EOT'
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url); const __dirname=path.dirname(__filename);
let TABLE=null;
function findFile(){
  const c=[["public","icd10cm-codes-2026.txt"],["public","icd10cm.txt"],["data","icd10cm-codes-2026.txt"],["data","icd10cm.txt"]];
  for(const [d,f] of c){const p=path.join(__dirname,"..","..",d,f); if(fs.existsSync(p)) return p}
  for(const d of ["public","data"]){
    const dir=path.join(__dirname,"..","..",d); if(!fs.existsSync(dir)) continue;
    const xs=fs.readdirSync(dir).filter(x=>/icd.*\.txt$/i.test(x)).sort(); if(xs.length) return path.join(dir,xs[0]);
  }
  return null;
}
function parseLine(line){ const m=line.match(/^(\S+)\s+(.+)$/); return m?{code:m[1].toUpperCase(),desc:m[2]}:null }
function load(){
  if(TABLE) return TABLE;
  const f=findFile(); const map=Object.create(null);
  if(f){ const txt=fs.readFileSync(f,"utf8");
    for(const ln of txt.split(/\r?\n/)){ if(!ln.trim()) continue; const r=parseLine(ln); if(r && !map[r.code]) map[r.code]=r.desc }
  }
  TABLE=map; return TABLE;
}
export function lookupICD(code){ const T=load(); const c=String(code||"").toUpperCase().trim(); return c?(T[c]||null):null }
export function findBestICD({text,limit=10}){ const T=load(); const q=String(text||"").toLowerCase().split(/\s+/).filter(Boolean);
  const out=[]; for(const [code,desc] of Object.entries(T)){ let s=0; for(const t of q){ if(code.toLowerCase().startsWith(t)) s+=50; if(desc.toLowerCase().includes(t)) s+=10 } if(s>0) out.push({code,desc,score:s}) }
  out.sort((a,b)=>b.score-a.score); return out.slice(0,limit).map(x=>({code:x.code,desc:x.desc})) }
EOT

cat > src/routes/icd.js <<'EOT'
import express from "express"; import { lookupICD, findBestICD } from "../services/icd.js";
const router=express.Router();
router.get("/icd-lookup",(req,res)=>{ const code=String(req.query.code||"").trim(); if(!code) return res.status(400).json({error:"code required"});
  const desc=lookupICD(code); if(!desc) return res.status(404).json({error:"not found"}); res.json({code,desc}) });
router.post("/icd-best",(req,res)=>{ const text=String((req.body&&(req.body.text||req.body.query||""))||"").trim();
  const limit=Math.max(1,Math.min(200,parseInt((req.body&&req.body.limit)??"12",10))); const icd=findBestICD({text,limit})||[]; res.json({icd,total:icd.length}) });
export default router;
EOT

cat > src/routes/annotated.js <<'EOT'
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
EOT

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
