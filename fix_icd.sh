mkdir -p src/services src/routes
cat > src/services/icd.js <<'EOT'
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url); const __dirname=path.dirname(__filename);
let T=null,SRC=null;
function pick(){for(const p of [["public","icd10cm.csv"],["public","icd10cm.txt"],["data","icd10cm.csv"],["data","icd10cm.txt"]]){const f=path.join(__dirname,"..","..",...p);if(fs.existsSync(f))return f}
for(const d of ["public","data"]){const dir=path.join(__dirname,"..","..",d);if(!fs.existsSync(dir))continue;const xs=fs.readdirSync(dir).filter(x=>/icd.*cm.*\.(csv|txt)$/i.test(x)).sort();if(xs.length)return path.join(dir,xs[0])}return null}
function parse(line){const i=line.indexOf(",");if(i<1)return null;let code=line.slice(0,i).trim(),desc=line.slice(i+1).trim();if(code[0]==='"'&&code.at(-1)==='"')code=code.slice(1,-1);if(desc[0]==='"'&&desc.at(-1)==='"')desc=desc.slice(1,-1);code=code.toUpperCase();if(!/^[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/.test(code))return null;return{code,desc}}
function load(){if(T)return T;SRC=pick();const map=Object.create(null);if(SRC){const txt=fs.readFileSync(SRC,"utf8");for(const ln of txt.split(/\r?\n/)){if(!ln.trim())continue;const r=parse(ln);if(r&&!map[r.code])map[r.code]=r.desc}}T=map;return T}
export function lookupICD(code){const M=load();const c=String(code||"").toUpperCase().trim();return c?(M[c]||null):null}
function toks(s){return String(s||"").toLowerCase().match(/[a-z0-9]+/g)||[]}
export function findBestICD({text,limit=10}){const M=load();const q=toks(text);if(!q.length)return[];const out=[];for(const [code,desc] of Object.entries(M)){const c=code.toLowerCase(),d=desc.toLowerCase();let s=0;for(const t of q){if(c===t)s+=120;else if(c.startsWith(t))s+=60;if(d.includes(t))s+=20}if(s>0)out.push({code,desc,score:s})}out.sort((a,b)=>b.score-a.score);return out.slice(0,Math.max(1,Math.min(200,parseInt(limit,10)||10))).map(x=>({code:x.code,desc:x.desc}))}
export function icdDebug(){const M=load();return{file:SRC||null,size:Object.keys(M).length,I10:M["I10"]||null,"R51.9":M["R51.9"]||null}}
EOT
cat > src/routes/icd.js <<'EOT'
import express from "express"; import { lookupICD, findBestICD, icdDebug } from "../services/icd.js";
const router=express.Router();
router.get("/icd-lookup",(req,res)=>{const code=String(req.query.code||"").trim();if(!code)return res.status(400).json({error:"code required"});const desc=lookupICD(code);if(!desc)return res.status(404).json({error:"not found"});res.json({code,desc})});
router.post("/icd-best",(req,res)=>{const text=String((req.body&&(req.body.text||req.body.query||""))||"").trim();const limit=Math.max(1,Math.min(200,parseInt((req.body&&req.body.limit)??"12",10)));const icd=findBestICD({text,limit})||[];res.json({icd,total:icd.length})});
router.get("/icd-debug",(_req,res)=>res.json(icdDebug()));
export default router;
EOT
node -e "const fs=require('fs');let s=fs.readFileSync('index.html','utf8');s=s.replace(/icdOut\.textContent\s*=\s*.*?;/m,'icdOut.textContent=(j.icd&&j.icd.length)?j.icd.map(x=>(x.code||\"\")+\" — \"+(x.desc||x.term||\"\" )).join(\"\\n\"):\"No ICD-10 codes detected.\";');fs.writeFileSync('index.html',s)"
lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
