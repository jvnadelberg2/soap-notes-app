import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url); const __dirname=path.dirname(__filename);
let T=null,SRC=null;
function pick(){for(const p of [["public","icd10cm.csv"],["public","icd10cm.txt"],["data","icd10cm.csv"],["data","icd10cm.txt"]]){const f=path.join(__dirname,"..","..",...p);if(fs.existsSync(f))return f}
for(const d of ["public","data"]){const dir=path.join(__dirname,"..","..",d);if(!fs.existsSync(dir))continue;const xs=fs.readdirSync(dir).filter(x=>/icd.*cm.*\.(csv|txt)$/i.test(x)).sort();if(xs.length)return path.join(dir,xs[0])}return null}
function split1(line){const i=line.indexOf(",");if(i<1)return null;let a=line.slice(0,i).trim(),b=line.slice(i+1).trim();if(a[0]==='"'&&a.at(-1)==='"')a=a.slice(1,-1);if(b[0]==='"'&&b.at(-1)==='"')b=b.slice(1,-1);return[a,b]}
function canon(c){let s=String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!s)return"";if(s.length>3)s=s.slice(0,3)+"."+s.slice(3);return s}
function load(){if(T)return T;SRC=pick();const m=Object.create(null);if(SRC){const txt=fs.readFileSync(SRC,"utf8");for(const ln of txt.split(/\r?\n/)){if(!ln.trim())continue;const p=split1(ln);if(!p)continue;const raw=p[0].toUpperCase();const desc=p[1];if(!raw||!desc)continue;const und=raw.replace(/\./g,"");const dot=raw.includes(".")?raw:canon(raw);m[raw]=m[raw]||desc;m[und]=m[und]||desc;m[dot]=m[dot]||desc}}T=m;return T}
export function lookupICD(code){const M=load();const c=String(code||"").toUpperCase();const und=c.replace(/\./g,"");const dot=c.includes(".")?c:canon(c);return M[c]||M[und]||M[dot]||null}
function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
function toks(s){return norm(s).split(" ").filter(Boolean)}
function bigrams(ws){const out=[];for(let i=0;i+1<ws.length;i++)out.push(ws.slice(i,i+2).join(" "));return out}
function unspecified(desc){return /\b(unspecified|nos|not otherwise specified)\b/i.test(desc)}
function categoryOnly(code){return /^[A-Z][0-9]{2}$/.test(code)}
function chapterPenalty(code,desc,text){const c=code[0];const d=norm(desc);const t=norm(text);
  if(c==="Q"&&!/congenit|chromosom|trisomy|syndrome|down|turner/.test(d+t))return -80;
  if(c==="P"&&!/newborn|neonat|birth|perinat/.test(d+t))return -80;
  if(c==="O"&&!/pregnan|gestat|prenat|obstet/.test(d+t))return -80;
  if("VWXY".includes(c)&&!/injur|trauma|accident|fall|collision|assault|poison|burn|fracture/.test(d+t))return -70;
  if(c==="Z"&&!/encounter|screening|history|follow|aftercare|counsel|immuniz|exam|prevent|status/.test(d+t))return -40;
  return 0
}
export function findBestICD({text,limit=10}){const M=load();const words=toks(text);if(!words.length)return[];const bis=bigrams(words);const joined=norm(text);
  const out=[];for(const [k,desc] of Object.entries(M)){const code=canon(k);const d=norm(desc);let s=0,hit=0;
    for(const bg of bis){if(bg&&d.includes(bg)){s+=120;hit+=2}}
    for(const w of words){if(d.includes(w)){s+=40;hit++}}
    const cl=code.toLowerCase();for(const w of words){if(cl===w)s+=90;else if(cl.startsWith(w))s+=30}
    if(joined&&joined.length>6&&d.includes(joined)){s+=140;hit++}
    if(categoryOnly(code))s-=25;
    if(unspecified(desc))s-=25;
    const afterDot=code.includes(".")?code.split(".")[1].length:0; s+=afterDot*8;
    s+=chapterPenalty(code,desc,text);
    if(s>0&&hit>0)out.push({code,desc,score:s})
  }
  out.sort((a,b)=>b.score-a.score);
  const seen=new Set();const res=[];for(const x of out){const key=x.code; if(seen.has(key))continue; seen.add(key); res.push({code:x.code,desc:x.desc}); if(res.length>=Math.max(1,Math.min(200,parseInt(limit,10)||10)))break}
  return res
}
export function icdDebug(){const M=load();return{file:SRC||null,size:Object.keys(M).length,I10:lookupICD("I10"),R519:lookupICD("R51.9")}}
