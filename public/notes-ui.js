/* BEGIN:ARCH-COMMENT
File: public/notes-ui.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';

(function(){
  if (window.__NOTES_UI_WIRED__) return; window.__NOTES_UI_WIRED__=true;

  function $(id){ return document.getElementById(id); }
  function V(id){ var el=$(id); if(!el) return ''; return (el.value||'').trim(); }
  function S(id,val){ var el=$(id); if(el) el.value = val==null?'':String(val); }

  function currentFormat(){ var el=$('noteType'); return (el && el.value || 'SOAP').toUpperCase(); }

  function collectCommon(){
    return {
      noteType: currentFormat(),
      patient: V('patient'),
      mrn: V('mrn'),
      dob: V('dob'),
      sex: V('sex'),
      provider: V('provider'),
      clinic: V('clinic'),
      npi: V('npi'),
      credentials: V('credentials'),
      encounter: V('encounter'),
      finalizedAt: V('finalizedAt'),
      icd10: V('icd10'),
      cptCodes: V('cpt'),
      timeMinutes: V('timeMinutes'),
      timeIn: V('timeIn'),
      timeOut: V('timeOut'),
      procedure: V('procedure'),
      medications: V('medications'),
      allergies: V('allergies'),
      location: V('location')
    };
  }

  function collectSOAP(){
    return Object.assign(collectCommon(), {
      chiefComplaint: V('chiefComplaint'),
      hpi: V('hpi'),
      pmh: V('pmh'),
      fh: V('fh'),
      sh: V('sh'),
      ros: V('ros'),
      vBP: V('vBP'),
      vHR: V('vHR'),
      vRR: V('vRR'),
      vTemp: V('vTemp'),
      vWeight: V('vWeight'),
      vO2Sat: V('vO2Sat'),
      height: V('height'),
      painScore: V('painScore'),
      diagnostics: V('diagnostics'),
      exam: V('exam'),
      noteText: (document.getElementById('soapTextOut')?.textContent||'')
    });
  }

  function collectBIRP(){
    return Object.assign(collectCommon(), {
      birpBehavior: V('birpBehavior'),
      birpIntervention: V('birpIntervention'),
      birpResponse: V('birpResponse'),
      birpPlan: V('birpPlan'),
      noteText: (document.getElementById('soapTextOut')?.textContent||'')
    });
  }

  async function saveNote(){
    const body = (currentFormat()==='BIRP') ? collectBIRP() : collectSOAP();
    const res = await fetch('/api/notes', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json().catch(()=>({}));
    if (j && j.ok && j.id){ $('current-note-id').value = j.id; $('btn-update-note').disabled=false; refresh(); }
  }

  async function updateNote(){
    const id = $('current-note-id').value.trim();
    if (!id) return;
    const body = (currentFormat()==='BIRP') ? collectBIRP() : collectSOAP();
    const res = await fetch('/api/notes/'+encodeURIComponent(id), { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
    const j = await res.json().catch(()=>({}));
    if (j && j.ok){ refresh(); }
  }

  async function refresh(){
    const q = ($('notes-search')?.value||'').trim().toLowerCase();
    const res = await fetch('/api/notes');
    const j = await res.json().catch(()=>({notes:[]}));
    const list = Array.isArray(j.notes) ? j.notes : [];
    const tbody = $('notes-tbody'); if (!tbody) return;
    tbody.innerHTML = '';
    list.forEach(n=>{
      const id = n.id||'';
      const tr=document.createElement('tr');
      const idTd=document.createElement('td'); idTd.textContent=id;
      const ptTd=document.createElement('td'); ptTd.textContent=n.patient||'';
      const fmtTd=document.createElement('td'); fmtTd.textContent=(n.noteType||'').toUpperCase();
      const upTd=document.createElement('td'); upTd.textContent=n.updatedAt||'';
      const actTd=document.createElement('td');
      const btn=document.createElement('button'); btn.textContent='Load';
      btn.addEventListener('click',async function(){
        const r = await fetch('/api/notes/'+encodeURIComponent(id)); const jj = await r.json().catch(()=>({}));
        if (jj && jj.ok && jj.note){
          const note = jj.note;
          ['patient','mrn','dob','sex','provider','clinic','npi','credentials','encounter','finalizedAt','icd10','cpt','timeMinutes','timeIn','timeOut','procedure','medications','allergies','location'].forEach(k=>S(k, note[k]||''));
          if ((note.noteType||'').toUpperCase()==='BIRP'){
            S('birpBehavior', note.birpBehavior||'');
            S('birpIntervention', note.birpIntervention||'');
            S('birpResponse', note.birpResponse||'');
            S('birpPlan', note.birpPlan||'');
          } else {
            S('chiefComplaint', note.chiefComplaint||'');
            S('hpi', note.hpi||'');
            S('pmh', note.pmh||'');
            S('fh', note.fh||'');
            S('sh', note.sh||'');
            S('ros', note.ros||'');
            S('vBP', note.vBP||'');
            S('vHR', note.vHR||'');
            S('vRR', note.vRR||'');
            S('vTemp', note.vTemp||'');
            S('vWeight', note.vWeight||'');
            S('vO2Sat', note.vO2Sat||'');
            S('height', note.height||'');
            S('painScore', note.painScore||'');
            S('diagnostics', note.diagnostics||'');
            S('exam', note.exam||'');
          }
          if ($('soapTextOut')) $('soapTextOut').textContent = note.noteText||'';
          $('noteType').value = (note.noteType||'SOAP').toUpperCase();
          $('current-note-id').value = id;
          $('btn-update-note').disabled=false;
        }
      });
      actTd.appendChild(btn);
      tr.appendChild(idTd); tr.appendChild(ptTd); tr.appendChild(fmtTd); tr.appendChild(upTd); tr.appendChild(actTd);
      if (!q || [id, (n.patient||''), (n.mrn||''), (n.provider||''), (n.clinic||''), (n.noteType||''), (n.icd10||''), (n.cptCodes||'')].join(' ').toLowerCase().includes(q)) {
        tbody.appendChild(tr);
      }
    });
  }

  function wire(){
    var b1=$('btn-new-note'); if(b1) b1.addEventListener('click', function(){ $('current-note-id').value=''; $('btn-update-note').disabled=true; });
    var b2=$('btn-save-note'); if(b2) b2.addEventListener('click', saveNote);
    var b3=$('btn-update-note'); if(b3) b3.addEventListener('click', updateNote);
    var b4=$('btn-refresh-list'); if(b4) b4.addEventListener('click', refresh);
    var q=$('notes-search'); if(q) q.addEventListener('input', refresh, {capture:true});
    refresh();
  }

  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();
})();
