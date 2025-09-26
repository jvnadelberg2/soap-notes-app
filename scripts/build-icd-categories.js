"use strict";

const fs = require("fs");
const path = require("path");

function categorize(desc = "") {
  const d = desc.toLowerCase();
  if (/asthma|pneumonia|bronch|respir|copd/.test(d)) return "Respiratory";
  if (/cardio|heart|myocard|coronary|hypertension|arrhythmia/.test(d)) return "Cardiovascular";
  if (/diabet|thyroid|endocrine/.test(d)) return "Endocrine/Metabolic";
  if (/renal|kidney|nephro/.test(d)) return "Renal/Urologic";
  if (/pregnan|maternal|obstetric/.test(d)) return "Obstetrics";
  if (/injury|fracture|trauma/.test(d)) return "Injury/Trauma";
  if (/cancer|neoplasm|carcinoma|tumor/.test(d)) return "Oncology";
  if (/depress|anxiety|psych|schizo|bipolar/.test(d)) return "Mental/Behavioral";
  return "Other";
}

const input = path.join(__dirname, "../data/icd10cm-codes-2026.txt");
const output = path.join(__dirname, "../data/icd10cm-codes-2026-categorized.txt");

const lines = fs.readFileSync(input, "utf8").split(/\r?\n/).filter(Boolean);
const outLines = lines.map(line => {
  const [code, ...descParts] = line.split(/\s+/);
  const desc = descParts.join(" ");
  return `${code}\t${desc}\t${categorize(desc)}`;
});

fs.writeFileSync(output, outLines.join("\n"));
console.log(`✅ Wrote ${outLines.length} categorized codes to ${output}`);
