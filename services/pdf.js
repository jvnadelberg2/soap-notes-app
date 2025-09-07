'use strict';

const PDFDocument = require('pdfkit');

const nz = x => (x ?? '').toString();
const yes = x => !!(x && String(x).trim());
const clean = x => nz(x).replace(/\s+/g, ' ').trim();
const bullets = a => a.filter(Boolean).join('  •  ');
const cw = doc => doc.page.width - doc.page.margins.left - doc.page.margins.right;
const leftX = doc => doc.page.margins.left;

function ndate(s){
  const t = clean(s);
  if (!t) return '';
  const d = new Date(t);
  if (isNaN(d)) return t;
  const p = n => String(n).padStart(2,'0');
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

function subjFromFields(n){
  const L = [];
  if (yes(n.chiefComplaint)) L.push(`Chief Complaint: ${clean(n.chiefComplaint)}`);
  if (yes(n.hpi))            L.push(`HPI: ${clean(n.hpi)}`);
  if (yes(n.pmh))            L.push(`PMH: ${clean(n.pmh)}`);
  if (yes(n.fh))             L.push(`FH: ${clean(n.fh)}`);
  if (yes(n.sh))             L.push(`SH: ${clean(n.sh)}`);
  if (yes(n.ros))            L.push(`ROS: ${clean(n.ros)}`);
  return L.length ? L.join('\n') : 'None provided.';
}

function objFromFields(n){
  const L = [];
  const anyV = [n.vBP,n.vHR,n.vRR,n.vTemp,n.vWeight,n.vO2Sat,n.height,n.painScore].some(yes);
  if (anyV){
    const v = [
      `BP: ${clean(n.vBP)||'—'}`, `HR: ${clean(n.vHR)||'—'}`, `RR: ${clean(n.vRR)||'—'}`,
      `Temp: ${clean(n.vTemp)||'—'}`, `Weight: ${clean(n.vWeight)||'—'}`, `O2 Sat: ${clean(n.vO2Sat)||'—'}`
    ];
    if (yes(n.height))    v.push(`Height: ${clean(n.height)}`);
    if (yes(n.painScore)) v.push(`Pain: ${clean(n.painScore)}`);
    L.push(`Vitals: ${v.join(', ')}`);
  }
  if (yes(n.allergies))   L.push(`Allergies: ${clean(n.allergies)}`);
  if (yes(n.medications)) L.push(`Medications: ${clean(n.medications)}`);
  if (yes(n.diagnostics)) L.push(`Diagnostics: ${clean(n.diagnostics)}`);
  if (yes(n.exam))        L.push(`Exam: ${clean(n.exam)}`);
  return L.length ? L.join('\n') : 'None provided.';
}

function parseSections(text){
  const T = (text||'').replace(/\r\n/g,'\n');
  const out = {};
  ['Subjective','Objective','Assessment','Plan'].forEach(name=>{
    const re = new RegExp(
      String.raw`(?:^|\n)\s*${name}\s*:?\s*\n?` +
      String.raw`([\s\S]*?)(?=(?:^|\n)\s*(?:Subjective|Objective|Assessment|Plan)\s*:?\s*\n?|$)`,
      'i'
    );
    const m = T.match(re);
    if (m) out[name.toLowerCase()] = m[1].trim();
  });
  return out;
}

function heading(doc, txt, gap){
  if (gap) doc.moveDown(gap);
  doc.x = leftX(doc);
  doc.font('Helvetica-Bold').fontSize(12).fillColor('#000')
     .text(txt, leftX(doc), undefined, { width: cw(doc), align: 'left' });
  doc.moveDown(0.15);
  doc.font('Helvetica').fontSize(10).fillColor('#000');
  doc.x = leftX(doc);
}

function header(doc, n, fmt){
  doc.font('Helvetica-Bold').fontSize(16)
     .text(`${(fmt||'SOAP').toUpperCase()} Note`, leftX(doc), undefined, { width: cw(doc), align:'left' });
  doc.moveDown(0.3);

  const innerW = cw(doc);
  const colW = innerW/2 - 6;
  const y0 = doc.y;

  doc.font('Helvetica').fontSize(10).fillColor('#000')
     .text(
       [
         yes(n.patient) && `Patient: ${clean(n.patient)}`,
         yes(n.dob)     && `DOB: ${clean(n.dob)}`,
         yes(n.sex)     && `Sex: ${clean(n.sex)}`,
         yes(n.mrn)     && `MRN: ${clean(n.mrn)}`
       ].filter(Boolean).join('\n'),
       leftX(doc),
       y0,
       { width: colW, align:'left' }
     );
  const yL = doc.y;

  doc.text(
    [
      yes(n.provider)    && `Clinician: ${clean(n.provider)}`,
      yes(n.credentials) && `Credentials: ${clean(n.credentials)}`,
      yes(n.npi)         && `NPI: ${clean(n.npi)}`,
      yes(n.clinic)      && `Clinic: ${clean(n.clinic)}`
    ].filter(Boolean).join('\n'),
    leftX(doc) + colW + 12,
    y0,
    { width: colW, align:'left' }
  );
  const yR = doc.y;

  doc.x = leftX(doc);
  doc.y = Math.max(yL, yR) + 6;

  const enc = bullets([
    yes(n.encounter)   && `Encounter: ${ndate(n.encounter)}`,
    yes(n.finalizedAt) && `Finalized: ${ndate(n.finalizedAt)}`,
    yes(n.encounterType) && `Type: ${clean(n.encounterType)}`,
    yes(n.telePlatform)  && `Platform: ${clean(n.telePlatform)}`,
    yes(n.teleConsent)   && `Telehealth Consent: ${clean(n.teleConsent)}`
  ]);
  if (enc) doc.fontSize(9).fillColor('#333')
          .text(enc, leftX(doc), undefined, { width: cw(doc), align:'left' });

  const bill = bullets([
    yes(n.icd10)        && `ICD-10: ${clean(n.icd10)}`,
    yes(n.cptCodes)     && `CPT: ${clean(n.cptCodes)}`,
    yes(n.cptModifiers) && `Modifiers: ${clean(n.cptModifiers)}`,
    yes(n.posCode)      && `POS: ${clean(n.posCode)}`,
    yes(n.visitKind)    && `Visit: ${clean(n.visitKind)}`,
    (yes(n.timeIn)&&yes(n.timeOut)) ? `Time: ${clean(n.timeIn)}–${clean(n.timeOut)}`
      : (yes(n.timeMinutes) && `Time (min): ${clean(n.timeMinutes)}`),
    yes(n.procedure)    && `Procedure: ${clean(n.procedure)}`
  ]);
  if (bill) doc.fontSize(9).fillColor('#333')
           .text(bill, leftX(doc), undefined, { width: cw(doc), align:'left' });

  doc.moveDown(0.3);
  doc.strokeColor('#ccc')
     .moveTo(leftX(doc), doc.y)
     .lineTo(leftX(doc) + cw(doc), doc.y)
     .stroke();
  doc.moveDown(0.2);
  doc.fillColor('#000');
  doc.x = leftX(doc);
}

function footer(doc, n, pageNum, pageCount){
  const y = doc.page.height - doc.page.margins.bottom - 22;
  const xL = leftX(doc);
  const innerW = cw(doc);
  const colW = innerW/3;

  doc.save();
  doc.strokeColor('#ddd').lineWidth(0.5)
     .moveTo(xL, y - 6).lineTo(xL + innerW, y - 6).stroke();

  const left = bullets([
    yes(n.patient) && `Patient: ${clean(n.patient)}`,
    yes(n.mrn) && `MRN: ${clean(n.mrn)}`
  ]);
  const mid = bullets([
    yes(n.encounter) && `Encounter: ${ndate(n.encounter)}`,
    yes(n.clinic) && `Clinic: ${clean(n.clinic)}`
  ]);
  const right = `Page ${pageNum} of ${pageCount}`;
  const noBreak = { lineBreak:false };

  doc.font('Helvetica').fontSize(8).fillColor('#555');
  doc.text(left, xL, y, { width: colW, align:'left',   ...noBreak });
  doc.text(mid,  xL+colW, y, { width: colW, align:'center', ...noBreak });
  doc.text(right,xL+colW*2,y, { width: colW, align:'right',  ...noBreak });

  const metaL = `Generated: ${new Date().toLocaleString()}`;
  const metaR = bullets([
    yes(n.provider)    && `Clinician: ${clean(n.provider)}`,
    yes(n.credentials) && `${clean(n.credentials)}`
  ]);
  doc.fontSize(7).fillColor('#888');
  doc.text(metaL, xL, y+10, { width: innerW/2, align:'left',  ...noBreak });
  doc.text(metaR, xL+innerW/2, y+10, { width: innerW/2, align:'right', ...noBreak });
  doc.restore();
}

function renderBodySOAP(doc, note){
  const parsed = parseSections(note.noteText||'');
  const S = yes(parsed.subjective) ? parsed.subjective : subjFromFields(note);
  const O = yes(parsed.objective)  ? parsed.objective  : objFromFields(note);
  const A = yes(parsed.assessment) ? parsed.assessment : 'None provided.';
  const P = yes(parsed.plan)       ? parsed.plan       : 'None provided.';

  heading(doc, 'Subjective', 0.6);
  doc.text(S, leftX(doc), undefined, { width: cw(doc), align:'left' });

  heading(doc, 'Objective',  0.6);
  doc.text(O, leftX(doc), undefined, { width: cw(doc), align:'left' });

  heading(doc, 'Assessment', 0.6);
  doc.text(A, leftX(doc), undefined, { width: cw(doc), align:'left' });

  heading(doc, 'Plan',       0.6);
  doc.text(P, leftX(doc), undefined, { width: cw(doc), align:'left' });
}

function renderBodyBIRP(doc, note){
  const sec = (lbl, v) => { heading(doc, lbl, 0.6); doc.text(yes(v)?clean(v):'None provided.', leftX(doc), undefined, { width: cw(doc), align:'left' }); };
  sec('Behavior', note.birpBehavior);
  sec('Intervention', note.birpIntervention);
  sec('Response', note.birpResponse);
  sec('Plan', note.birpPlan);
}

async function renderNotePDF(note, opts = {}) {
  const fmt = (opts.format || note.noteType || 'SOAP').toString().toUpperCase();
  return await new Promise((resolve, reject)=>{
    const doc = new PDFDocument({ size:'LETTER', margins:{top:54,bottom:54,left:54,right:54}, bufferPages:true });
    const chunks = [];
    doc.on('data', c=>chunks.push(c));
    doc.on('end', ()=>resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    header(doc, note, fmt);
    if (fmt === 'BIRP') renderBodyBIRP(doc, note);
    else                renderBodySOAP(doc, note);

    const extras = [];
    if (yes(note.orders))      extras.push(`Orders: ${clean(note.orders)}`);
    if (yes(note.followUp))    extras.push(`Follow-up: ${clean(note.followUp)}`);
    if (yes(note.disposition)) extras.push(`Disposition: ${clean(note.disposition)}`);
    if (extras.length){ heading(doc, 'Additional', 0.8); doc.text(extras.join('\n'), leftX(doc), undefined, { width: cw(doc), align:'left' }); }

    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++){
      doc.switchToPage(i);
      footer(doc, note, (i - range.start) + 1, range.count);
    }
    doc.end();
  });
}

module.exports = { renderNotePDF };
