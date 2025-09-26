const fs = require('fs');
const p = 'routes/export-pdf.js';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('draft: !note.finalizedAt')) {
  s = s.replace(
    /renderNotePDF\(note,\s*\{([\s\S]*?)\}\)/,
    "renderNotePDF(note, {$1,\n  draft: !note.finalizedAt })"
  );
  fs.writeFileSync(p, s);
}
