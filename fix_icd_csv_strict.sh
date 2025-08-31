mkdir -p src/services src/routes

cat > src/services/icd.js <<'EOT'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
let TABLE=null, SRC=null;

function findFile(){
  const tries=[
    ["public","icd10cm.csv"],
    ["public","icd10cm.txt"],
    ["data","icd10cm.csv"],
    ["data","icd10cm.txt"]
  ];
  for(const parts of tries){
    const p=path.join(__dirname,"..","..",...parts);
    if(fs.existsSync(p)) return p;
  }
  for(const d of ["public","data"]){
    const dir=path.join(__dirname,"..","..",d);
    if(!fs.existsSync(dir)) continue;
    const xs=fs.readdirSync(dir).filter(x=>/icd.*cm.*\.(csv|txt)$/i.test(x)).sort();
    if(xs.length) return path.join(dir,xs[0]);
  }
  return null;
}

function unquote(s){ return s.replace(/^"(.*)"$/,"$1").trim() }

function parseLine(line){
  const i=line.indexOf(",");
  if(i<1) return null;
  let code=line.slice(0,i).trim();
  let rest=line.slice(i+1).trim();
  rest=rest.replace(/^"?\s*,\s*"?/,"");       // handle code,",",desc variant
  code=unquote(code).toUpperCase();
  let term=unquote(rest);
  if(!/^[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/.test(code)) return null;
  return { code, term };
}

function load(){
  if(TABLE) return TABLE;
  SRC=findFile();
  const map=Object.create(null);
  if(SRC&&fs.existsSync(SRC)){
    const txt=fs.readFileSync(SRC,"utf8");
    for(const line of txt.split(/\r?\n/)){
      if(!line.trim()) continue;
      const r=parseLine(line);
      if(r && !map[r.code]) map[r.code]=r.term;
    }
  }
  TABLE=map; return TABLE;
}

export function lookupICD(code){
  const T=load();
  const c=String(code||"").toUpperCase().trim();
  return c?(T[c]||null):null;
}

function toks(s){return String(s||"").toLowerCase().match(/[a-z0-9]+/g)||[]}

export function findBestICD({text,limit=10}){
  const T=load(); const q=toks(text);
  if(!q.length) return [];
  const out=[];
  for(const [code,term] of Object.entries(T)){
    const c=code.toLowerCase(), d=term.toLowerCase();
    let score=0;
    for(const t of q){ if(c===t) score+=100; else if(c.startsWith(t)) score+=50; if(d.includes(t)) score+=10 }
    if(score>0) out.push({code,term,score});
  }
  out.sort((a,b)=>b.score-a-score);
  return out.slice(0,Math.max(1,Math.min(200,parseInt(limit,10)||10)));
}

export function icdDebug(){
  const T=load();
  const sample=["I10","E11.9","J45.909","A000","I2721"].map(c=>({code:c,term:T[c]||null}));
  return { file:SRC||null, size:Object.keys(T).length, sample };
}
EOT

cat > src/routes/icd.js <<'EOT'
import express from "express";
import { lookupICD, findBestICD, icdDebug } from "../services/icd.js";
const router=express.Router();

router.get("/icd-lookup",(req,res)=>{
  const code=String(req.query.code||"").trim();
  if(!code) return res.status(400).json({error:"code required"});
  const term=lookupICD(code);
  if(!term) return res.status(404).json({error:"not found"});
  res.json({code,term});
});

router.post("/icd-best",(req,res)=>{
  const text=String((req.body&&(req.body.text||req.body.query||""))||"").trim();
  const limit=Math.max(1,Math.min(200,parseInt((req.body&&req.body.limit)??"12",10)));
  const icd=findBestICD({text,limit})||[];
  res.json({icd,total:icd.length});
});

router.get("/icd-debug",(req,res)=>{ res.json(icdDebug()) });

export default router;
EOT

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
