mkdir -p src/services src/routes

cat > src/services/icd.js <<'EOT'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
let TABLE=null,SRC=null;

function findFile(){
  const tries=[["public","icd10cm.csv"],["public","icd10cm.txt"],["data","icd10cm.csv"],["data","icd10cm.txt"]];
  for(const parts of tries){const p=path.join(__dirname,"..","..",...parts);if(fs.existsSync(p))return p}
  for(const d of ["public","data"]){
    const dir=path.join(__dirname,"..","..",d); if(!fs.existsSync(dir)) continue;
    const xs=fs.readdirSync(dir).filter(x=>/icd.*cm.*\.(csv|txt)$/i.test(x)).sort();
    if(xs.length) return path.join(dir,xs[0]);
  }
  return null;
}

function parseLine(line){
  const i=line.indexOf(","); if(i<1) return null;
  let code=line.slice(0,i).trim(); let desc=line.slice(i+1).trim();
  if(code.startsWith('"')&&code.endsWith('"')) code=code.slice(1,-1);
  if(desc.startsWith('"')&&desc.endsWith('"')) desc=desc.slice(1,-1);
  code=code.toUpperCase();
  if(!/^[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/.test(code)) return null;
  return {code, desc};
}

function load(){
  if(TABLE) return TABLE;
  SRC=findFile(); const map=Object.create(null);
  if(SRC&&fs.existsSync(SRC)){
    const txt=fs.readFileSync(SRC,"utf8");
    for(const ln of txt.split(/\r?\n/)){
      if(!ln.trim()) continue;
      const r=parseLine(ln);
      if(r && !map[r.code]) map[r.code]=r.desc;
    }
  }
  TABLE=map; return TABLE;
}

export function lookupICD(code){
  const T=load(); const c=String(code||"").toUpperCase().trim();
  return c?(T[c]||null):null;
}

function toks(s){return String(s||"").toLowerCase().match(/[a-z0-9]+/g)||[]}

export function findBestICD({text,limit=10}){
  const T=load(); const q=toks(text); if(!q.length) return [];
  const out=[];
  for(const [code,desc] of Object.entries(T)){
    const c=code.toLowerCase(), d=desc.toLowerCase();
    let score=0;
    for(const t of q){ if(c===t) score+=120; else if(c.startsWith(t)) score+=60; if(d.includes(t)) score+=15 }
    if(score>0) out.push({code, desc, score});
  }
  out.sort((a,b)=>b.score-a.score);
  return out.slice(0,Math.max(1,Math.min(200,parseInt(limit,10)||10))).map(x=>({code:x.code, desc:x.desc}));
}
EOT

cat > src/routes/icd.js <<'EOT'
import express from "express";
import { lookupICD, findBestICD } from "../services/icd.js";
const router=express.Router();

router.get("/icd-lookup",(req,res)=>{
  const code=String(req.query.code||"").trim();
  if(!code) return res.status(400).json({error:"code required"});
  const desc=lookupICD(code);
  if(!desc) return res.status(404).json({error:"not found"});
  res.json({code, desc});
});

router.post("/icd-best",(req,res)=>{
  const text=String((req.body&&(req.body.text||req.body.query||""))||"").trim();
  const limit=Math.max(1,Math.min(200,parseInt((req.body&&req.body.limit)??"12",10)));
  const icd=findBestICD({text,limit})||[];
  res.json({icd,total:icd.length});
});

export default router;
EOT

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
