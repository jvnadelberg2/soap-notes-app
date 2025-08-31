mkdir -p src/services src/routes

cat > src/services/icd.js <<'EOT'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
let TABLE=null;

function pickIcdFile(){
  const roots=[path.join(__dirname,"..","..","public"),path.join(__dirname,"..","..","data")];
  const names=["icd10cm-codes-2026.txt","icd10cm.txt"];
  for(const r of roots){
    for(const n of names){
      const p=path.join(r,n);
      if(fs.existsSync(p)) return p;
    }
    if(fs.existsSync(r)){
      const cand=fs.readdirSync(r).filter(f=>/icd.*codes.*\.txt$/i.test(f));
      if(cand.length) return path.join(r,cand.sort()[0]);
    }
  }
  return null;
}

function parseLine(line){
  const m=line.match(/^\s*([A-TV-Z][0-9]{2}(?:\.[0-9A-Za-z]{1,4})?)\s+(.+?)\s*$/);
  if(!m) return null;
  return { code:m[1].toUpperCase(), desc:m[2] };
}

function loadTable(){
  if(TABLE) return TABLE;
  const file=pickIcdFile();
  const map=Object.create(null);
  if(file&&fs.existsSync(file)){
    const txt=fs.readFileSync(file,"utf8");
    for(const line of txt.split(/\r?\n/)){
      if(!line.trim()) continue;
      const row=parseLine(line);
      if(row && !map[row.code]) map[row.code]=row.desc;
    }
  }
  TABLE=map;
  return TABLE;
}

export function lookupICD(code){
  const t=loadTable();
  const c=String(code||"").toUpperCase().trim();
  return c ? (t[c] || null) : null;
}

function tokens(s){ return String(s||"").toLowerCase().match(/[a-z0-9]+/g)||[] }

function score(code,desc,q){
  const c=code.toLowerCase(), d=desc.toLowerCase();
  let s=0;
  for(const t of q){ if(c===t) s+=100; else if(c.startsWith(t)) s+=50; if(d.includes(t)) s+=10 }
  return s;
}

export function findBestICD({ text, limit=10 }){
  const t=loadTable(), q=tokens(text);
  if(!q.length) return [];
  const out=[];
  for(const [code,desc] of Object.entries(t)){
    const sc=score(code,desc,q);
    if(sc>0) out.push({ code, desc, score:sc });
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
  res.json({code,desc});
});

router.post("/icd-best",(req,res)=>{
  const text=String((req.body&&(req.body.text||req.body.query||""))||"").trim();
  const limit=Math.max(1,Math.min(200,parseInt((req.body&&req.body.limit)??"8",10)));
  const icd=findBestICD({text,limit})||[];
  res.json({icd,total:icd.length});
});

export default router;
EOT

cat > src/routes/annotated.js <<'EOT'
import express from "express";
import { lookupICD, findBestICD } from "../services/icd.js";

const router=express.Router();

router.post("/generate-soap-json-annotated",async (req,res)=>{
  try{
    const b=req.body||{};
    const rawText=String(b.rawText||"");
    const patientHistory=String(b.patientHistory||"");
    const textForICD=(rawText+" "+patientHistory).trim();
    const icd=findBestICD({text:textForICD,limit:10})||[];
    const data={ subjective:{rawText,patientHistory}, objective:{}, assessment:{}, plan:{} };
    res.json({data,icd,meta:{}});
  }catch(e){
    res.status(500).json({error:String((e&&e.message)||e)});
  }
});

export default router;
EOT

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
