const fs = require('fs');
const p = 'routes/export-pdf.js';
let s = fs.readFileSync(p, 'utf8');

// If already consolidated, do nothing
if (s.includes('code: "MISSING_REQUIRED_FIELDS"')) process.exit(0);

// Replace the early MISSING_TEXT guard with a consolidated check
const re = /if\s*\(!text\)\s*return\s*res\.status\(\s*422\s*\)\.json\(\s*\{[\s\S]*?code\s*:\s*['"]MISSING_TEXT['"][\s\S]*?\}\s*\)\s*;\s*/m;
if (!re.test(s)) process.exit(0);

const block = `
{
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
  const missing = [];
  const isEmpty = v => !v || String(v).trim().length === 0;
  for (const f of REQUIRED_BASE) if (isEmpty(body[f.key])) missing.push({ field: f.key, label: f.label });
  for (const f of (REQUIRED_BY_FORMAT[noteType] || [])) if (isEmpty(body[f.key])) missing.push({ field: f.key, label: f.label });
  if (isEmpty(text)) missing.push({ field: 'text', label: 'Note Text' });
  if (missing.length) {
    return res.status(422).json({
      ok: false,
      error: { code: "MISSING_REQUIRED_FIELDS", missing }
    });
  }
}
`;
s = s.replace(re, block);
fs.writeFileSync(p, s);
