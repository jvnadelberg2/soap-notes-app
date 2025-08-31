mkdir -p src/services

cat > src/services/icd.js <<'EOT'
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename=fileURLToPath(import.meta.url);
const __dirname=path.dirname(__filename);
let TABLE=null;

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
  const roots=[path.join(__dirname,"..","..","public"),path.join(__dirname,"..","..","data")];
  const stack=roots.filter(fs.existsSync);
  while(stack.length){
    const dir=stack.pop();
    for(const ent of fs.readdirSync(dir,{withFileTypes:true})){
      const p=path.join(dir,ent.name);
      if(ent.isDirectory()) stack.push(p);
      else if(/icd.*cm.*\.(csv|txt)$/i.test(ent.name)) return p;
    }
  }
  return null;
}

function parseCSVLine(line){
  const i=line.indexOf(",");
  if(i<1) return null;
  let code=line.slice(0,i).trim();
  let term=line.slice(i+1).trim();
  code=code.replace(/^"(.*)"$/,"$1").toUpperCase();
  term=term.replace(/^"(.*)"$/,"$1");
  if(!/^[A-TV-Z][0-9]{2}(?:\.[0-9A-Z]{1,4})?$/.test(code)) return null;
  return {code, term};
}

function load(){
  if(TABLE) return TABLE;
  const file=findFile();
  const map=Object.create(null);
  if(file&&fs.existsSync(file)){
    const txt=fs.readFileSync(file,"utf8");
    for(const line of txt.split(/\r?\n/)){
      if(!line) continue;
      const row=parseCSVLine(line);
      if(row && !map[row.code]) map[row.code]=row.term;
    }
  }
  TABLE=map;
  return TABLE;
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
    let s=0;
    for(const t of q){ if(c===t) s+=100; else if(c.startsWith(t)) s+=50; if(d.includes(t)) s+=10 }
    if(s>0) out.push({code,term,score:s});
  }
  out.sort((a,b)=>b.score-a.score);
  return out.slice(0,Math.max(1,Math.min(200,parseInt(limit,10)||10)));
}
EOT

lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
