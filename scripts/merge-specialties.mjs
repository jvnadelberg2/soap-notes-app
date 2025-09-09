import fs from "fs";
import path from "path";

const ROOT = process.cwd();
const DISC_FILE = path.join(ROOT, "public", "disciplines.json");
const IN_PATH = process.argv[2];
if (!IN_PATH) { console.error("usage: node scripts/merge-specialties.mjs <path-to-new-list.(txt|json)>"); process.exit(2); }

function readJSON(p){
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch { return null; }
}
function readTXT(p){
  try { return fs.readFileSync(p, "utf8").split(/\r?\n/).map(s=>s.trim()).filter(Boolean); } catch { return null; }
}
function flattenFromDisciplines(obj){
  if (!obj) return [];
  const groups = Array.isArray(obj) ? obj
    : Array.isArray(obj.disciplines) ? obj.disciplines
    : Array.isArray(obj.data) ? obj.data
    : [];
  const out = [];
  for (const g of groups){
    const opts = Array.isArray(g?.options) ? g.options : [];
    for (const o of opts){
      const label = (o?.label || o?.name || o?.title || o?.text || o?.value || "").toString().trim();
      if (label) out.push(label);
    }
  }
  return out;
}
function normalize(list){
  const uniq = Array.from(new Set((list||[]).map(s=>String(s).trim()).filter(Boolean)));
  uniq.sort((a,b)=>a.localeCompare(b));
  return uniq;
}

const currentDisc = readJSON(DISC_FILE);
if (!currentDisc) { console.error("public/disciplines.json not found or invalid"); process.exit(1); }
const current = normalize(flattenFromDisciplines(currentDisc));

let incoming = [];
if (IN_PATH.endsWith(".json")){
  const j = readJSON(IN_PATH);
  incoming = Array.isArray(j) ? j
           : Array.isArray(j?.specialties) ? j.specialties
           : flattenFromDisciplines(j);
} else {
  incoming = readTXT(IN_PATH) || [];
}
incoming = normalize(incoming);

const merged = normalize([...current, ...incoming]);

const output = { disciplines: [ { group: "All Specialties", options: merged.map(s=>({ label: s })) } ] };

const ts = new Date().toISOString().replace(/[:.]/g,"-");
const bak = DISC_FILE.replace(/\.json$/i, `.bak.${ts}.json`);
fs.copyFileSync(DISC_FILE, bak);
fs.writeFileSync(DISC_FILE, JSON.stringify(output, null, 2));
console.log("Merged specialties:", merged.length);
console.log("Backup:", path.relative(ROOT, bak));
console.log("Wrote:", path.relative(ROOT, DISC_FILE));
