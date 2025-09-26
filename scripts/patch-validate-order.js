const fs = require('fs');
const p = 'routes/export-pdf.js';
let s = fs.readFileSync(p, 'utf8');

// If we've already converted the !text check into the consolidated validator, exit
if (s.includes('code: "MISSING_REQUIRED_FIELDS"') && s.includes("label: 'Note Text'")) process.exit(0);

// Ensure the helper functions exist; if not present, do nothing (assumes previous step was applied)
if (!s.includes('function collectMissing(') || !s.includes('function isEmpty(')) process.exit(0);

// Replace the early MISSING_TEXT guard with consolidated validation that also includes Note Text
s = s.replace(
  /if\s*\(!text\)\s*return\s*res\.status\(\s*422\s*\)\.json\(\s*\{\s*ok\s*:\s*false\s*,\s*error\s*:\s*\{\s*code\s*:\s*['"]MISSING_TEXT['"][\s\S]*?\}\s*\}\s*\)\s*;\s*/m,
  `
  {
    const missing = collectMissing(body, noteType);
    if (isEmpty(text)) missing.push({ field: 'text', label: 'Note Text' });
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
  `
);

fs.writeFileSync(p, s);
