mkdir -p src/services src/routes

cat > src/services/icd.js <<'EOT'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
let TABLE=null;

function pickFile(){
  const roots=[path.join(__dirname,"..","..","public"),path.join(__dirname,"..","..","data")];
  for(const r of roots){
    if(!fs.existsSync(r)) continue;
    const files=fs.readdirSync(r).filter(f=>/icd.*\.txt$/i.test(f));
    if(files.length) return path.join(r,files.sort()[0]);
  }
  return null;
}

function parseLine(line){
  const m=line.match(/^(\S+)\s+(.+)$/);
  if(!m) return null;
  return {code:m[1].toUpperCase(),desc:m[2]};
}

function loadTable(){
  if(TABLE) return TABLE;
  const f=pickFile();
  const map=Object.create(null);
  if(f&&fs.existsSync(f)){
    const txt=fs.readFileSync(f,"utf8");
    for(const line of txt.split(/\r?\n/)){
      if(!line.trim()) continue;
      const row=parseLine(line);
      if(row&&!map[row.code]) map[row.code]=row.desc;
    }
  }
  TABLE=map;
  return TABLE;
}

export function lookupICD(code){
  const t=loadTable();
  const c=String(code||"").toUpperCase().trim();
  return c? (t[c]||null):null;
}

export function findBestICD({text,limit=10}){
  const t=loadTable();
  const q=String(text||"").toLowerCase().split(/\s+/);
  const out=[];
  for(const [code,desc] of Object.entries(t)){
    let score=0;
    for(const w of q){
      if(code.toLowerCase().startsWith(w)) score+=50;
      if(desc.toLowerCase().includes(w)) score+=10;
    }
    if(score>0) out.push({code,desc,score});
  }
  out.sort((a,b)=>b.score-a.score);
  return out.slice(0,limit).map(x=>({code:x.code,desc:x.desc}));
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

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
