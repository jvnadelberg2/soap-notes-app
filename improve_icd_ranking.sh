mkdir -p src/services
cat > src/services/icd.js <<'EOT'
import fs from "fs"; import path from "path"; import { fileURLToPath } from "url";
const __filename=fileURLToPath(import.meta.url); const __dirname=path.dirname(__filename);
let T=null,SRC=null;
function pick(){for(const p of [["public","icd10cm.csv"],["public","icd10cm.txt"],["data","icd10cm.csv"],["data","icd10cm.txt"]]){const f=path.join(__dirname,"..","..",...p);if(fs.existsSync(f))return f}
for(const d of ["public","data"]){const dir=path.join(__dirname,"..","..",d);if(!fs.existsSync(dir))continue;const xs=fs.readdirSync(dir).filter(x=>/icd.*cm.*\.(csv|txt)$/i.test(x)).sort();if(xs.length)return path.join(dir,xs[0])}return null}
function canon(c){let s=String(c||"").toUpperCase().replace(/[^A-Z0-9]/g,"");if(!s)return"";if(s.length>3)s=s.slice(0,3)+"."+s.slice(3);return s}
function split1(line){const i=line.indexOf(",");if(i<1)return null;let a=line.slice(0,i).trim(),b=line.slice(i+1).trim();if(a[0]==='"'&&a.at(-1)==='"')a=a.slice(1,-1);if(b[0]==='"'&&b.at(-1)==='"')b=b.slice(1,-1);return[a,b]}
function load(){if(T)return T;SRC=pick();const m=Object.create(null);if(SRC){const txt=fs.readFileSync(SRC,"utf8");for(const ln of txt.split(/\r?\n/)){if(!ln.trim())continue;const p=split1(ln);if(!p)continue;const code=p[0].toUpperCase();const desc=p[1];if(!/^[A-TV-Z][0-9]{2}(\.[0-9A-Z]{1,4})?$/.test(canon(code)))continue;const und=code.replace(/\./g,"");const dot=code.includes(".")?code:canon(code);if(desc){if(!m[code])m[code]=desc;if(!m[und])m[und]=desc;if(!m[dot])m[dot]=desc}}}T=m;return T}
export function lookupICD(code){const M=load();const c=String(code||"").toUpperCase();const und=c.replace(/\./g,"");const dot=c.includes(".")?c:canon(c);return M[c]||M[und]||M[dot]||null}
function norm(s){return String(s||"").toLowerCase().replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim()}
function toks(s){return norm(s).split(" ").filter(Boolean)}
function ngrams(arr,n){const out=[];for(let i=0;i+ n<=arr.length;i++)out.push(arr.slice(i,i+n).join(" "));return out}
const SYN={headache:["headache","headaches","cephalalgia","head pain"],migraine:["migraine","migrainous","hemicrania"],hypertension:["hypertension","htn","high blood pressure","elevated blood pressure","bp high"],diabetes:["diabetes","diabetic","hyperglycemia"],asthma:["asthma","asthmatic","wheezing"],dizziness:["dizziness","dizzy","vertigo","lightheaded"],cough:["cough","coughing"],fever:["fever","febrile","pyrexia"],pain:["pain","ache","aches","aching","painful"]};
function expand(words){const set=new Set(words);for(const w of words){for(const [k,arr] of Object.entries(SYN)){if(k===w||arr.includes(w))for(const v of arr)set.add(norm(v))}}return[...set]}
function unspecified(desc){return /\b(unspecified|nos|not otherwise specified)\b/i.test(desc)}
function categoryOnly(code){return /^[A-Z][0-9]{2}$/.test(code)}
export function findBestICD({text,limit=10}){
  const M=load();const q0=toks(text);const q=expand(q0);if(!q.length)return[];
  const phrases=[...ngrams(q0,3),...ngrams(q0,2)];const joined=norm(text);
  const out=[];
  for(const [raw,desc] of Object.entries(M)){
    const code=canon(raw);const d=norm(desc);let s=0;
    if(!d)continue;
    for(const ph of phrases){if(ph&&d.includes(ph))s+=140}
    if(joined&&d.includes(joined))s+=120;
    for(const t of q){if(!t)continue;const cl=code.toLowerCase();if(cl===t)s+=200;else if(cl.startsWith(t))s+=90;if(d.includes(t))s+=35}
    if(categoryOnly(code))s-=15;
    if(unspecified(desc))s-=20;
    if(s>0)out.push({code,desc,score:s,unspec:unspecified(desc),cat:categoryOnly(code)});
  }
  out.sort((a,b)=>b.score-a.score);
  const seen=new Set();const res=[];for(const x of out){if(seen.has(x.code))continue;seen.add(x.code);res.push({code:x.code,desc:x.desc});if(res.length>=Math.max(1,Math.min(200,parseInt(limit,10)||10)))break}
  const hasSpecific=res.some(r=>!unspecified(M[r.code])&& !categoryOnly(r.code));
  if(hasSpecific){return res.filter(r=>!unspecified(M[r.code]))}
  return res
}
export function icdDebug(){const M=load();return{file:SRC||null,size:Object.keys(M).length,I10:lookupICD("I10"),R519:lookupICD("R51.9")}}
EOT
lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
