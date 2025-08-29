import fs from "fs";
import path from "path";

const root = "data/tmp/icd2026";
function walk(d){ return fs.readdirSync(d).flatMap(f=>{
  const p = path.join(d,f);
  return fs.statSync(p).isDirectory()? walk(p) : [p];
});}
const files = walk(root).filter(f=>/\.txt$/i.test(f));
const candidates = files
  .filter(f=>/codes?/i.test(path.basename(f)) && !/order/i.test(f))
  .sort((a,b)=>a.length-b.length);
const source = candidates[0] || files[0];
if(!source){ console.error("No .txt files found"); process.exit(1); }

const lines = fs.readFileSync(source,"utf8").split(/\r?\n/).filter(Boolean);
function splitSmart(line){
  // Try tab, pipe, comma; fallback to first whitespace block
  for (const sep of ["\t","|",","]) {
    const parts = line.split(sep);
    if (parts.length >= 2) return [parts[0].trim(), parts.slice(1).join(sep).trim()];
  }
  const m = line.match(/^(\S+)\s+(.+)$/);
  return m ? [m[1], m[2]] : [line.trim(), ""];
}
const out = [];
for (const ln of lines){
  const [code, term] = splitSmart(ln);
  if (!/^[A-TV-Z][0-9A-Z.]{2,}$/.test(code)) continue; // skip headers/invalid
  out.push([code, term.replace(/\s+/g," ").trim()]);
}
out.sort((a,b)=>a[0].localeCompare(b[0]));
const dest = "data/icd10cm_codes_2026.csv";
const csv = ["code,term", ...out.map(([c,t])=>`${c},"${t.replace(/"/g,'""')}"`)].join("\n");
fs.writeFileSync(dest, csv);
console.log("Wrote", dest, "rows:", out.length);
