mkdir -p src/services

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

function parseLine(line){
  const i=line.indexOf(",");
  if(i<1) return null;
  let code=line.slice(0,i).trim();
  let term=line.slice(i+1).trim();
  if(code.startsWith('"')&&code.endsWith('"')) code=code.slice(1,-1);
  if(term.startsWith('"')&&term.endsWith('"')) term=term.slice(1,-1);
  code=code.toUpperCase();
  if(!/^[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/.test(code)) return null;
  return {code, term};
}

function loadTable(){
  if(TABLE) return TABLE;
  SRC=findFile();
  const map=Object.create(null);
  if(SRC&&fs.existsSync(SRC)){
    const txt=fs.readFileSync(SRC,"utf8");
    for(const line of txt.split(/\r?\n/)){
      if(!line.trim()) continue;
      const row=parseLine(line);
      if(row && !map[row.code]) map[row.code]=row.term;
    }
  }
  TABLE=map;
  return TABLE;
}

export function lookupICD(code){
  const T=loadTable();
  const c=String(code||"").toUpperCase().trim();
  return c?(T[c]||null):null;
}

function toks(s){return String(s||"").toLowerCase().match(/[a-z0-9]+/g)||[]}

export function findBestICD({text,limit=10}){
  const T=loadTable();
  const q=toks(text);
  if(!q.length) return [];
  const out=[];
  for(const [code,term] of Object.entries(T)){
    const c=code.toLowerCase(), d=term.toLowerCase();
    let s=0;
    for(const t of q){
      if(c===t) s+=120;
      else if(c.startsWith(t)) s+=60;
      if(d.includes(t)) s+=15;
    }
    if(s>0) out.push({code, term, score:s});
  }
  out.sort((a,b)=>b.score-a.score);
  return out.slice(0, Math.max(1, Math.min(200, parseInt(limit,10)||10)));
}

export function icdDebug(){
  const T=loadTable();
  return {
    file:SRC||null,
    size:Object.keys(T).length,
    sample:{
      I10:T["I10"]||null,
      "R51.9":T["R51.9"]||null,
      "J45.909":T["J45.909"]||null
    }
  };
}
EOT
