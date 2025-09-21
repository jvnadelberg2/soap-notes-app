const fs = require('fs');
const p = 'routes/export-pdf.js';
let s = fs.readFileSync(p, 'utf8');

// Remove any prior (possibly broken) helper block
const reHelpers = /const REQUIRED_BASE[\s\S]*?function collectMissing\([\s\S]*?\}\s*/m;
if (reHelpers.test(s)) {
  s = s.replace(reHelpers, '');
}

// Insert fresh helper block right before first 'const noteType'
const anchor = s.indexOf('const noteType');
if (anchor < 0) process.exit(2);
const helpers = `
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
s = s.slice(0, anchor) + helpers + s.slice(anchor);

// Ensure the consolidated check runs after exportUuid line; insert if absent
if (!s.includes('code: "MISSING_REQUIRED_FIELDS"')) {
  const marker = 'const exportUuid = crypto.randomUUID();';
  const pos = s.indexOf(marker);
  if (pos < 0) process.exit(3);
  const after = pos + marker.length;
  const block = `
  {
    const missing = collectMissing(body, noteType);
    const textForCheck = (body && (body.text ?? body.note ?? body.noteText)) || '';
    if (!textForCheck || String(textForCheck).trim().length === 0) {
      missing.push({ field: 'text', label: 'Note Text' });
    }
    if (missing.length) {
      return res.status(422).json({
        ok: false,
        error: {
          code: "MISSING_REQUIRED_FIELDS",
          missing: missing.map(m => ({ field: m.key || m.field, label: m.label }))
        }
      });
    }
  }
`;
  s = s.slice(0, after) + block + s.slice(after);
}

fs.writeFileSync(p, s);
