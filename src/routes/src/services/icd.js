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
