import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "public", "disciplines.json");

function readDisc() {
  const raw = fs.readFileSync(FILE, "utf8");
  return JSON.parse(raw);
}
function flatten(obj){
  const groups = Array.isArray(obj) ? obj
    : Array.isArray(obj?.disciplines) ? obj.disciplines
    : Array.isArray(obj?.data) ? obj.data
    : [];
  const out = [];
  for (const g of groups){
    const opts = Array.isArray(g?.options) ? g.options : [];
    for (const o of opts){ const lab = (o?.label || o?.name || o?.title || o?.text || o?.value || "").toString().trim(); if (lab) out.push(lab); }
  }
  return out;
}
function writeDisc(list){
  const sorted = Array.from(new Set(list)).sort((a,b)=>a.localeCompare(b));
  const out = { disciplines: [ { group: "All Specialties", options: sorted.map(s=>({ label:s })) } ] };
  const ts = new Date().toISOString().replace(/[:.]/g,"-");
  const bak = FILE.replace(/\.json$/i, `.bak.${ts}.json`);
  fs.copyFileSync(FILE, bak);
  fs.writeFileSync(FILE, JSON.stringify(out, null, 2));
  return { sorted, bak };
}

const alias = new Map([
  ["Psychologist (Clinical)", "Clinical Psychologist"],
  ["Geneticist (Medical)", "Medical Geneticist"]
]);

const beforeObj = readDisc();
const before = flatten(beforeObj);
const beforeSet = new Set(before);

const removed = [];
const mapped = before.map(s => {
  if (alias.has(s)) { removed.push(s); return alias.get(s); }
  return s;
});

const { sorted, bak } = writeDisc(mapped);

console.log("before_count", before.length);
console.log("after_count", sorted.length);
console.log("removed_aliases", JSON.stringify(removed));
console.log("backup", bak);
