// public/app.js
// Ensures Chief Complaint + HPI + History land in Subjective,
// and Labs/Imaging/Vitals are reflected in the note.

(function(){
  const d=document;
  const get=(id)=>{ const el=d.getElementById(id); return el?String(('value' in el?el.value:el.textContent)||'').trim():'' };
  const first=(ids)=>{ for(const id of ids){ const v=get(id); if(v) return v } return '' };
  const ensureStr=(v)=> typeof v==='string' ? v : (v ? String(v) : '');
  const esc=(s)=> s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  function addToSubjective(p){
    p = p || {};
    const complaint = first(['complaint','chiefComplaint','cc']);
    const history   = first(['patientHistory','hpi','history','rawText']);

    let subj = ensureStr(p.Subjective || '');

    const has = (label)=> new RegExp('(^|\\n)\\s*' + esc(label) + '\\s*:', 'i').test(subj);
    if (complaint && !has('Chief Complaint')) {
      subj += (subj ? '\n\n' : '') + 'Chief Complaint: ' + complaint;
    }
    if (history && !has('HPI')) {
      subj += (subj ? '\n\n' : '') + 'HPI: ' + history;
    }
    if (subj) p.Subjective = subj;
    return p;
  }

  if (window.enrichFromUI) {
    const orig = window.enrichFromUI;
    window.enrichFromUI = (p)=> addToSubjective(orig(p));
  } else {
    window.enrichFromUI = (p)=> addToSubjective(p);
  }
})();

(function(){
  const d=document;
  const get=(id)=>{ const el=d.getElementById(id); return el?String(('value' in el?el.value:el.textContent)||'').trim():'' };
  const ensureStr=(v)=> typeof v==='string' ? v : (v ? String(v) : '');
  const esc=(s)=> s.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');

  function addLabsImaging(p){
    p = p || {};
    const labs = get('labs');       // freeform lines "A1C=6.4"
    const imaging = get('imaging'); // freeform lines

    if (labs || imaging) {
      // Subjective section gets a simple echo so nothing is lost
      let subj = ensureStr(p.Subjective);
      const has = (label)=> new RegExp('(^|\\n)\\s*' + esc(label) + '\\s*:', 'i').test(subj);
      if (labs && !has('Labs'))    subj += (subj?'\n\n':'') + 'Labs:\n' + labs;
      if (imaging && !has('Imaging')) subj += (subj?'\n\n':'') + 'Imaging:\n' + imaging;
      if (subj) p.Subjective = subj;
    }

    if (labs) {
      let obj = ensureStr(p.Objective);
      if (!/(^|\n)\s*Labs:/i.test(obj)) {
        obj += (obj?'\n':'') + 'Labs: ' + labs.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).join(', ');
      }
      p.Objective = obj;
    }

    if (imaging) {
      let obj = ensureStr(p.Objective);
      if (!/(^|\n)\s*Imaging:/i.test(obj)) {
        obj += (obj?'\n':'') + 'Imaging: ' + imaging.split(/\r?\n/).map(s=>s.trim()).filter(Boolean).join('; ');
      }
      p.Objective = obj;
    }

    return p;
  }

  if (window.enrichFromUI) {
    const orig = window.enrichFromUI;
    window.enrichFromUI = (p)=> addLabsImaging(orig(p));
  } else {
    window.enrichFromUI = (p)=> addLabsImaging(p);
  }
})();

(function(){
  const d=document;
  const get=(id)=>{ const el=d.getElementById(id); return el?String(('value' in el?el.value:el.textContent)||'').trim():'' };

  function addVitals(p){
    p = p || {};
    const bp = get('vBP'), hr = get('vHR'), rr = get('vRR');
    if(!bp && !hr && !rr) return p;

    p.vitals = p.vitals || {};
    if(bp){ p.vitals.BP = bp; if(!p.bp) p.bp = bp; }
    if(hr){ p.vitals.HR = hr; if(!p.hr) p.hr = hr; }
    if(rr){ p.vitals.RR = rr; if(!p.rr) p.rr = rr; }

    const lines=[];
    if(bp) lines.push('BP: ' + bp);
    if(hr) lines.push('HR: ' + hr);
    if(rr) lines.push('RR: ' + rr);

    const targets=['Objective','body','text','input','prompt','bodyTxt','note','Subjective'];
    targets.forEach(function(k){
      if(typeof p[k]==='string'){
        if(!/(^|\n)\s*Vitals\s*:/i.test(p[k])){
          p[k] += (p[k]?'\n\n':'') + 'Vitals: ' + lines.join(', ');
        }
      }
    });
    return p;
  }

  if (window.enrichFromUI) {
    const orig = window.enrichFromUI;
    window.enrichFromUI = (p)=> addVitals(orig(p));
  } else {
    window.enrichFromUI = (p)=> addVitals(p);
  }
})();
