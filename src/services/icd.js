import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const IDX_PATH = path.resolve(__dirname, "../../data/icd10_index.json");

function tokenize(s){
  return String(s||"")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g," ")
    .split(/\s+/)
    .filter(w => w.length >= 3 && !["and","the","with","without","unspecified","acute","chronic","other"].includes(w));
}
function buildKeywords(term){
  const base = tokenize(term);
  const extra = [];
  if (/myocardial infarction|mi\b/.test(term.toLowerCase())) extra.push("mi","myocardial infarction","heart attack","stemi","nstemi","troponin");
  if (/hypertension|high blood pressure|htn/.test(term.toLowerCase())) extra.push("hypertension","htn","high bp","elevated blood pressure");
  if (/chest pain/.test(term.toLowerCase())) extra.push("chest pain","cp","angina","pressure");
  return Array.from(new Set([...base, ...extra]));
}
function scoreFor(text, entry){
  const t = String(text||"").toLowerCase();
  let s = 0;
  for (const k of entry.keywords || []) if (t.includes(String(k).toLowerCase())) s++;
  return s;
}
export function loadIndex(){
  try { return JSON.parse(fs.readFileSync(IDX_PATH,"utf8")); } catch { return []; }
}
export function writeICDIndex(entries){
  fs.writeFileSync(IDX_PATH, JSON.stringify(entries, null, 2));
  return true;
}
export function buildIndexFromSimpleCSV(csv){
  const out = [];
  const lines = String(csv||"").split(/\r?\n/).filter(Boolean);
  let i = 0;
  for (const line of lines){
    i++;
    if (i === 1 && /^code\s*,\s*term/i.test(line)) continue;
    const m = line.split(",");
    if (m.length < 2) continue;
    const code = m.shift().trim();
    const term = m.join(",").trim();
    if (!code || !term) continue;
    out.push({ code, term, keywords: buildKeywords(term) });
  }
  return out;
}
export function suggestICD({ text, limit = 8 }){
  const INDEX = loadIndex();
  const scored = INDEX.map(e => ({ ...e, score: scoreFor(text, e) })).filter(e => e.score > 0);
  scored.sort((a,b) => b.score - a.score || a.code.localeCompare(b.code));
  return scored.slice(0, limit);
}
