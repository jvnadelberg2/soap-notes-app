mkdir -p src/services src/routes

cat > src/services/icd.js <<'EOT'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
let TABLE=null;
function findFile(){
  const tries=[
    ["public","icd10cm-codes-2026.txt"],
    ["public","icd10cm.txt"],
    ["data","icd10cm-codes-2026.txt"],
    ["data","icd10cm.txt"]
  ];
  for(const parts of tries){
    const p=path.join(__dirname,"..","..",...parts);
    if(fs.existsSync(p)) return p;
  }
  const roots=[path.join(__dirname,"..","..","public"),path.join(__dirname,"..","..","data")];
  const stack=roots.filter(fs.existsSync);
  while(stack.length){
    const dir=stack.pop();
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,ent.name);
      if(ent.isDirectory()) stack.push(p);
      else if(/icd.*codes.*\.txt$/i.test(ent.name)||/^icd.*\.txt$/i.test(ent.name)) return p;
    }
  }
  return null;
}
function parseLine(line){
  const m=line.match(/^\s*([A-TV-Z][0-9A-Z]{2,7}(?:\.[0-9A-Z]{1,4})?)\s+(.+?)\s*$/);
  return m?{code:m[1].toUpperCase(),term:m[2]}:null;
}
function load(){
  if(TABLE) return TABLE;
  const f=findFile(); const map=Object.create(null);
  if(f){
    const txt=fs.readFileSync(f,"utf8");
    for(const ln of txt.split(/\r?\n/)){
      if(!ln.trim()) continue;
      const r=parseLine(ln);
      if(r && !map[r.code]) map[r.code]=r.term;
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
  const T=load(); const q=toks(text);
  if(!q.length) return [];
  const out=[];
  for(const [code,term] of Object.entries(T)){
    const c=code.toLowerCase(), d=term.toLowerCase();
    let score=0;
    for(const t of q){
      if(c===t) score+=100;
      else if(c.startsWith(t)) score+=50;
      if(d.includes(t)) score+=10;
    }
    if(score>0) out.push({code,term,score});
  }
  out.sort((a,b)=>b.score-a.score);
  return out.slice(0,Math.max(1,Math.min(200,parseInt(limit,10)||10)));
}
EOT

cat > src/routes/annotated.js <<'EOT'
import express from "express";
import { generateSoapNoteJSON } from "../services/ai.js";
import { findBestICD } from "../services/icd.js";
const router=express.Router();
router.post("/generate-soap-json-annotated", async (req,res)=>{
  try{
    const {
      rawText = "",
      patientHistory = "",
      specialty = "General Practice",
      vitals = {},
      labs = {},
      imaging = [],
      allowInference = false,
      model = null,
      provider = "ollama",
    } = req.body || {};
    const data = await generateSoapNoteJSON({rawText,patientHistory,specialty,vitals,labs,imaging,allowInference,model,provider});
    const pieces=[
      rawText,
      patientHistory,
      data?.Subjective||data?.subjective?.rawText||"",
      data?.Objective||data?.objective?.text||"",
      data?.Assessment||data?.assessment?.text||"",
      data?.Plan||data?.plan?.text||""
    ].filter(Boolean).join(" ");
    const icd = findBestICD({ text: pieces, limit: 12 }) || [];
    res.json({ data, icd });
  }catch(e){ res.status(500).json({error:String((e&&e.message)||e)}) }
});
export default router;
EOT

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
