// server/icd.js
// Builds an in‑memory Fuse index from a plain text file: data/icd10cm-codes-2026.txt
// Each line: CODE<TAB>Description
import fs from 'node:fs';
import path from 'node:path';
import Fuse from 'fuse.js';

const ICD_PATH = path.resolve(process.cwd(), 'data/icd10cm-codes-2026.txt');

let fuse = null;
let records = [];

export async function loadICDIndex() {
  const raw = fs.readFileSync(ICD_PATH, 'utf8');
  records = raw
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .map(l => {
      const [code, ...rest] = l.split('\t');
      const description = rest.join(' ').trim();
      return { code, description, concat: `${code} ${description}` };
    });

  fuse = new Fuse(records, {
    includeScore: true,
    threshold: 0.35,
    ignoreLocation: true,
    minMatchCharLength: 2,
    keys: [
      { name: 'code', weight: 0.5 },
      { name: 'description', weight: 1.0 },
      { name: 'concat', weight: 0.3 },
    ],
  });

  return { count: records.length };
}

export function searchICD(q, { limit = 5, ageYears = null, sex = null } = {}) {
  if (!fuse) throw new Error('ICD index not loaded');
  const query = (q || '').trim();
  if (!query) return [];

  const results = fuse.search(query, { limit: Math.max(5, limit) });

  let items = results.map(r => r.item);

  // Age/sex filtering placeholder: if you later add metadata like minAge, maxAge, allowedSex,
  // plug it here. For now this pass‑through keeps API stable.
  if (ageYears != null || sex) {
    items = items.filter(_ => true);
  }

  return items.slice(0, limit).map(it => ({
    code: it.code,
    description: it.description,
    label: `${it.code} — ${it.description}`,
  }));
}