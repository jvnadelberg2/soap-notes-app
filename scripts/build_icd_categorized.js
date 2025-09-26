// Node.js CommonJS script
// Run with: node scripts/build_icd_categorized.js

const fs = require("fs");
const path = require("path");

const inputFile = path.join(__dirname, "../data/icd10cm-codes-2026.txt");
const outputFile = path.join(__dirname, "../data/icd10cm-codes-2026-categorized.txt");

// Map keywords to categories (basic starter map — can refine later)
const CATEGORY_MAP = [
  { cat: "Infectious Diseases", keywords: ["infection", "influenza", "tb", "hiv", "aids", "sepsis"] },
  { cat: "Neoplasms", keywords: ["carcinoma", "cancer", "neoplasm", "sarcoma", "tumor", "malignant"] },
  { cat: "Endocrine / Metabolic", keywords: ["diabetes", "thyroid", "obesity", "metabolic", "endocrine"] },
  { cat: "Mental & Behavioral", keywords: ["depression", "anxiety", "psych", "bipolar", "schizophrenia"] },
  { cat: "Cardiovascular", keywords: ["hypertension", "heart", "cardiac", "mi", "angina", "arrhythmia"] },
  { cat: "Respiratory", keywords: ["asthma", "copd", "pneumonia", "respiratory", "lung", "bronchitis"] },
  { cat: "Digestive", keywords: ["gastritis", "colitis", "liver", "pancreas", "gallbladder", "digestive"] },
  { cat: "Musculoskeletal", keywords: ["arthritis", "fracture", "sprain", "back pain", "scoliosis"] },
  { cat: "Genitourinary", keywords: ["uti", "renal", "kidney", "urinary", "bladder", "prostate"] },
  { cat: "Neurological", keywords: ["stroke", "cva", "migraine", "epilepsy", "neuropathy", "dementia"] },
  { cat: "Symptoms & Signs", keywords: ["pain", "fever", "cough", "fatigue", "nausea", "vomiting"] }
];

function guessCategory(desc) {
  const lower = desc.toLowerCase();
  for (const { cat, keywords } of CATEGORY_MAP) {
    if (keywords.some(k => lower.includes(k))) return cat;
  }
  return "Uncategorized";
}

function buildCategorized() {
  if (!fs.existsSync(inputFile)) {
    console.error("❌ Input file not found:", inputFile);
    process.exit(1);
  }

  const lines = fs.readFileSync(inputFile, "utf8").split(/\r?\n/);
  const out = [];

  for (const line of lines) {
    if (!line.trim()) continue;
    const [code, ...rest] = line.split(/\t/); // tab-separated
    const desc = rest.join(" ").trim();
    if (!code || !desc) continue;

    const category = guessCategory(desc);
    out.push(`${code}\t${desc}\t${category}`);
  }

  fs.writeFileSync(outputFile, out.join("\n"), "utf8");
  console.log(`✅ Wrote categorized ICD file with ${out.length} entries → ${outputFile}`);
}

buildCategorized();
import fs from "fs";
import path from "path";

// Input file (2 columns: code<TAB>description)
const INPUT = path.resolve("data/icd10cm-codes-2026.txt");
// Output file (3 columns: code<TAB>description<TAB>category)
const OUTPUT = path.resolve("data/icd10cm-codes-2026-categorized.txt");

// ICD-10-CM Chapters (ranges mapped to categories)
const CHAPTERS = [
  { range: ["A00", "B99"], category: "Certain infectious and parasitic diseases" },
  { range: ["C00", "D49"], category: "Neoplasms" },
  { range: ["D50", "D89"], category: "Diseases of the blood and blood-forming organs" },
  { range: ["E00", "E89"], category: "Endocrine, nutritional and metabolic diseases" },
  { range: ["F01", "F99"], category: "Mental, Behavioral and Neurodevelopmental disorders" },
  { range: ["G00", "G99"], category: "Diseases of the nervous system" },
  { range: ["H00", "H59"], category: "Diseases of the eye and adnexa" },
  { range: ["H60", "H95"], category: "Diseases of the ear and mastoid process" },
  { range: ["I00", "I99"], category: "Diseases of the circulatory system" },
  { range: ["J00", "J99"], category: "Diseases of the respiratory system" },
  { range: ["K00", "K95"], category: "Diseases of the digestive system" },
  { range: ["L00", "L99"], category: "Diseases of the skin and subcutaneous tissue" },
  { range: ["M00", "M99"], category: "Diseases of the musculoskeletal system and connective tissue" },
  { range: ["N00", "N99"], category: "Diseases of the genitourinary system" },
  { range: ["O00", "O9A"], category: "Pregnancy, childbirth and the puerperium" },
  { range: ["P00", "P96"], category: "Certain conditions originating in the perinatal period" },
  { range: ["Q00", "Q99"], category: "Congenital malformations, deformations and chromosomal abnormalities" },
  { range: ["R00", "R99"], category: "Symptoms, signs and abnormal clinical/lab findings" },
  { range: ["S00", "T88"], category: "Injury, poisoning and other consequences of external causes" },
  { range: ["V00", "Y99"], category: "External causes of morbidity" },
  { range: ["Z00", "Z99"], category: "Factors influencing health status" },
  { range: ["U00", "U85"], category: "Codes for special purposes" },
];

// Compare two ICD codes (e.g. "A15" < "B99")
function compareCodes(a, b) {
  return a.localeCompare(b, "en", { numeric: true });
}

// Find category by code
function findCategory(code) {
  const clean = code.replace(/[^A-Z0-9]/gi, "").toUpperCase();
  for (const { range, category } of CHAPTERS) {
    if (compareCodes(clean, range[0]) >= 0 && compareCodes(clean, range[1]) <= 0) {
      return category;
    }
  }
  return "Uncategorized";
}

// Main
function buildCategorized() {
  if (!fs.existsSync(INPUT)) {
    console.error(`Input file not found: ${INPUT}`);
    process.exit(1);
  }

  const lines = fs.readFileSync(INPUT, "utf8").split(/\r?\n/).filter(Boolean);
  const outLines = lines.map(line => {
    const [code, description] = line.split("\t");
    const category = findCategory(code);
    return `${code}\t${description}\t${category}`;
  });

  fs.writeFileSync(OUTPUT, outLines.join("\n"), "utf8");
  console.log(`✅ Categorized ICD file written to ${OUTPUT}`);
}

buildCategorized();
