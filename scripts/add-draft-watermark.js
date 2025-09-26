const fs = require('fs');
const p = 'services/pdf.js';
let s = fs.readFileSync(p, 'utf8');

if (!s.includes('function addDraftWatermark')) {
  const insertAt = s.indexOf('\n');
  const helper = `
function addDraftWatermark(doc) {
  const { width, height } = doc.page;
  doc.save();
  doc.rotate(45, { origin: [width / 2, height / 2] });
  doc.fillColor('#000000').opacity(0.12);
  doc.fontSize(120).text('DRAFT', 0, height / 2 - 60, { width, align: 'center' });
  doc.opacity(1).restore();
}
`;
  s = s.slice(0, insertAt) + helper + s.slice(insertAt);
}
if (!s.includes('if (opts && opts.draft) addDraftWatermark(doc);')) {
  s = s.replace(/(doc\.addPage\(\)|doc\.pipe\(.*?\);)/, "$1\n  if (opts && opts.draft) addDraftWatermark(doc);");
}
fs.writeFileSync(p, s);
