const fs = require('fs');
const p = 'routes/export-pdf.js';
let s = fs.readFileSync(p, 'utf8');
if (s.includes('MISSING_REQUIRED_FIELDS')) process.exit(0);
const routeStart = s.indexOf("router.post('/export/pdf'");
if (routeStart < 0) process.exit(1);
const seg = s.slice(routeStart);
const i1 = seg.indexOf('if (!text)');
const i2 = seg.indexOf('if (noteType');
if (i1 < 0 || i2 < 0) process.exit(2);
const insertPos = routeStart + Math.max(i1, i2);
const header = `
const REQUIRED_BASE = [
  { key: "patientName", label: "Patient Name" },
  { key: "encounterDateTime", label: "Encounter Date/Time" },
  { key: "authorName", label: "Author Name" },
  { key: "authorCredentials", label: "Author Credentials" },
  { key: "noteType", label: "Note Type" }
];
const REQUIRED_BY_FORMAT = {
  SOAP: [
    { key: "subjective", label: "Subjective" },
    { key: "assessment", label: "Assessment" },
    { key: "plan", label: "Plan" }
  ],
  BIRP: [
    { key: "behavior", label: "Behavior" },
    { key: "intervention", label: "Intervention" },
    { key: "response", label: "Response" },
    { key: "plan", label: "Plan" }
  ]
};
function isEmpty(v){ return !v || String(v).trim().length === 0; }
function collectMissing(body, fmt){
  const list = [];
  for (const f of REQUIRED_BASE) if (isEmpty(body[f.key])) list.push(f);
  const reqFmt = REQUIRED_BY_FORMAT[fmt] || [];
  for (const f of reqFmt) if (isEmpty(body[f.key])) list.push(f);
  return list;
}
`;
const check = `
  {
    const missing = collectMissing(body, noteType);
    if (missing.length) {
      return res.status(422).json({ ok:false, error:{ code: "MISSING_REQUIRED_FIELDS", missing: missing.map(m => ({ field: m.key, label: m.label })) } });
    }
  }
`;
const beforeBodyIdx = s.indexOf('const noteType', routeStart);
if (beforeBodyIdx >= 0) s = s.slice(0, beforeBodyIdx) + header + s.slice(beforeBodyIdx);
s = s.slice(0, insertPos).replace(/(\}\);?\s*)$/, '$1') + check + s.slice(insertPos);
fs.writeFileSync(p, s);
