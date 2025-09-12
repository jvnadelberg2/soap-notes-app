

function pretty(ts){
  if(!ts) return '';
  try{
    var t = String(ts).trim().replace(' ', 'T');
    var d = new Date(t);
    if (!isFinite(d.valueOf())) return '';
    var mm = String(d.getMonth()+1).padStart(2,'0');
    var dd = String(d.getDate()).padStart(2,'0');
    var yyyy = d.getFullYear();
    var hh = String(d.getHours()).padStart(2,'0');
    var mi = String(d.getMinutes()).padStart(2,'0');
    return yyyy+'-'+mm+'-'+dd+' '+hh+':'+mi;
  }catch(e){ return '' }
}

function setTitle(fmt){
  var h3 = document.querySelector('#cardNote h3'); if(!h3) return;
  h3.textContent = (fmt==='BIRP'?'BIRP Note':'SOAP Note');
}

function $(id){ return document.getElementById(id) }

function setStatus(msg){
  var s = $('status');
  if (s) s.textContent = String(msg||'');
}

function V(id){
  var el = $(id);
  if (!el) return '';
  if (el.tagName === 'SELECT') return el.value||'';
  return el.value;
}

function getUUID(){
  const el = $('current-note-uuid');
  return el ? (el.value || '') : '';
}

function getFormat() {
  const el = $('noteType') || $('note-format');
  return ((el && el.value) || 'SOAP').toUpperCase();
}

async function refreshList(){
  try{
    var res = await fetch('/api/notes');
    if (!res.ok) return;
    var j = await res.json().catch(function(){return []});
    var tbody = document.querySelector('#notesList tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (j||[]).forEach(function(n){
      var tr = document.createElement('tr');
      var tdUUID = document.createElement('td'); tdUUID.textContent = n.uuid||'';
      if(n.finalizedAt){
        const badge=document.createElement("span"); badge.textContent="  • FINAL"; badge.style.marginLeft="6px"; badge.style.fontSize="12px"; badge.style.color="#0a7"; tdUUID.appendChild(badge);
      }
      var tdUpdated = document.createElement('td'); tdUpdated.textContent = pretty(n.updatedAt||'');
      var tdFmt = document.createElement('td'); tdFmt.textContent = (n.noteType||'');
      var tdAct = document.createElement('td');
      var bLoad = document.createElement('button'); bLoad.textContent='Load'; bLoad.addEventListener('click', function(){ loadNote(n.uuid) }, {passive:true});
      var bPdf  = document.createElement('button'); bPdf.textContent='PDF'; bPdf.style.marginLeft='6px'; bPdf.addEventListener('click', function(){ $('current-note-uuid').value = n.uuid; $('exportPdf') && $('exportPdf').click() }, {passive:true});
      tdAct.appendChild(bLoad); tdAct.appendChild(bPdf);
      if(!n.finalizedAt){
        var bDel  = document.createElement('button'); bDel.textContent='Delete'; bDel.style.marginLeft='6px'; bDel.addEventListener('click', function(){ deleteNote(n.uuid) }, {passive:true});
        tdAct.appendChild(bDel);
      }
      tr.appendChild(tdUUID); tr.appendChild(tdUpdated); tr.appendChild(tdFmt); tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
  }catch(_){}
}
window.refreshList = refreshList;

async function loadNote(uuid){
  if(!uuid) return;
  try{
    var res = await fetch('/api/notes/'+encodeURIComponent(uuid));
    if(!res.ok) return;
    var j = await res.json().catch(function(){return {}});
    if (!j || !j.note) return;
    $('current-note-uuid').value = j.note.uuid || uuid;
    var fmt = (j.note.noteType||'SOAP').toUpperCase();
    (function apply(){
      setTitle(fmt);
      if() .value = j.note.patient||'';
      if() .value = j.note.patientName||'';
      if() .value = j.note.mrn||'';
      if() .value = j.note.dob||'';
      if() .value = j.note.sex||'';
      if() .value = j.note.provider||'';
      if() .value = j.note.credentials||'';
      if() .value = j.note.clinic||'';
      if() .value = j.note.npi||'';
      if() .value = j.note.location||'';
      if() .value = j.note.specialty||'';
      if() .value = j.note.allergies||'';
      if() .value = j.note.medications||'';
      if(fmt==='BIRP'){
        if($('birpBehavior')) $('birpBehavior').value = j.note.birp?.behavior||'';
        if($('birpIntervention')) $('birpIntervention').value = j.note.birp?.intervention||'';
        if($('birpResponse')) $('birpResponse').value = j.note.birp?.response||'';
        if($('birpPlan')) $('birpPlan').value = j.note.birp?.plan||'';
      }else{
        $('chiefComplaint') && ($('chiefComplaint').value = j.note.chiefComplaint||'');
        $('hpi') && ($('hpi').value = j.note.hpi||'');
        $('pmh') && ($('pmh').value = j.note.pmh||'');
        $('fh') && ($('fh').value = j.note.fh||'');
        $('sh') && ($('sh').value = j.note.sh||'');
        $('ros') && ($('ros').value = j.note.ros||'');
        $('vBP') && ($('vBP').value = j.note.vitals?.BP||'');
        $('vHR') && ($('vHR').value = j.note.vitals?.HR||'');
        $('vRR') && ($('vRR').value = j.note.vitals?.RR||'');
        $('vTemp') && ($('vTemp').value = j.note.vitals?.Temp||'');
        $('vSpO2') && ($('vSpO2').value = j.note.vitals?.SpO2||'');
        $('vWeight') && ($('vWeight').value = j.note.vitals?.Weight||'');
        $('vHeight') && ($('vHeight').value = j.note.vitals?.Height||'');
        $('exam') && ($('exam').value = j.note.exam||'');
        $('diagnostics') && ($('diagnostics').value = j.note.diagnostics||'');
        $('assessment') && ($('assessment').value = j.note.assessment||'');
        $('plan') && ($('plan').value = j.note.plan||'');
      }
      var pre = $('soapTextOut'); if (pre) pre.textContent = j.note.text||'';
      if($('finalizedAt')) $('finalizedAt').value = (j.note.finalizedAt||'').replace('T',' ').replace('Z','');
    })();
  }catch(_){}
}
window.loadNote = loadNote;

async function deleteNote(uuid){
  if(!uuid) return;
  if(!window.confirm('Delete this note?')) return;
  try{
    var r = await fetch('/api/notes/'+encodeURIComponent(uuid), { method:'DELETE' });
    if(r.ok && typeof refreshList==='function') await refreshList();
  }catch(_){}
}

async function saveNote(){
  try{
    const fmt = getFormat();
    const uuid = getUUID() || (crypto?.randomUUID?.() || (Date.now().toString(36)+Math.random().toString(36).slice(2)));
    $('current-note-uuid').value = uuid;

    let payload = { noteType: fmt };
    if(fmt==='BIRP'){
      payload.birp = {
        behavior: V('birpBehavior'),
        intervention: V('birpIntervention'),
        response: V('birpResponse'),
        plan: V('birpPlan')
      };
    }else{
      payload = {
        noteType: 'SOAP',
        chiefComplaint: V('chiefComplaint'),
        hpi: V('hpi'),
        pmh: V('pmh'),
        fh: V('fh'),
        sh: V('sh'),
        ros: V('ros'),
        vitals: {
          BP: V('vBP'), HR: V('vHR'), RR: V('vRR'), Temp: V('vTemp'), SpO2: V('vSpO2'), Weight: V('vWeight'), Height: V('vHeight')
        },
        exam: V('exam'),
        diagnostics: V('diagnostics'),
        assessment: V('assessment'),
        plan: V('plan')
      };
    }

    const pre = $('soapTextOut');
    if (pre && pre.textContent && !payload.text) payload.text = pre.textContent;

    const res = await fetch('/api/notes/'+encodeURIComponent(uuid), {
      method:'PUT',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload)
    });
    const j = await res.json().catch(function(){return {}});
    if (res.ok && j && j.ok){
      setStatus('Saved.');
      if (typeof refreshList==='function') await refreshList();
    } else {
      setStatus('Save failed.');
    }
  }catch(e){ setStatus('Save failed.') }
}
window.saveNote = saveNote;

async function exportPdf(){
  try{
    const fmt = (getFormat()==='BIRP')?'birp':'soap';
    const uuid = getUUID();
    if(!uuid){ alert('Generate or save a note first.'); return; }
    const w = window.open('/api/notes/'+encodeURIComponent(uuid)+'/pdf?format='+fmt, '_blank');
    if(!w) alert('Popup blocked. Please allow popups for this site to view the PDF.');
  }catch(_){}
}
function wireExportPdf(){
  var b = $('exportPdf');
  if(b) b.addEventListener('click', function(e){ e.preventDefault(); exportPdf() }, {passive:false});
}

async function generateNote(){
  const btn = $('btnGenerate');
  if(!btn) return;
  btn.disabled = true;
  setStatus('Generating…');
  try{
    if (typeof window.generateStable !== 'function'){
      console.error('[actions] window.generateStable is not defined');
      setStatus('Error: generator not loaded.');
      return;
    }
    const noteText = await window.generateStable();
    const pre = $('soapTextOut');
    if (pre) pre.textContent = noteText || pre.textContent || '';
    await saveNote();
    setStatus('Done.');
  }catch(e){
    console.error('[actions] generate failed', e);
    setStatus('Generation failed. See console for details.');
  }finally{
    btn.disabled = false;
  }
}

async function finalizeCurrent(){
  try{
    const uuid = getUUID();
    if(!uuid){ alert('No current note to finalize.'); return; }
    const signedBy = ( $('signedBy')?.value || ( $('provider')?.value ? ($('provider').value+' '+($('credentials')?.value||'').trim()) : '' ) ).trim();
    const attestationText = ($('attestationText')?.value || '').trim();
    const r = await fetch('/api/notes/'+encodeURIComponent(uuid)+'/finalize', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ signedBy, attestationText })
    });
    if(!r.ok){
      let code = ''+r.status;
      try{ const j = await r.json(); if (j && j.error && j.error.code) code = j.error.code }catch(_){}
      alert('Finalize failed: '+code);
      return;
    }
    const j = await r.json();
    if ($('finalizedAt')) $('finalizedAt').value = (j.note?.finalizedAt||'').replace('T',' ').replace('Z','');
    if (typeof refreshList==='function') await refreshList();
    alert('Note finalized.');
  }catch(err){
    console.error('Finalize failed', err);
    alert('Finalize failed.');
  }
}

function wire(){
  var g = $('btnGenerate'); if(g) g.addEventListener('click', function(e){ e.preventDefault(); generateNote() }, {passive:false});
  var s = $('btn-save-note'); if(s) s.addEventListener('click', function(e){ e.preventDefault(); saveNote() }, {passive:false});
  wireExportPdf();
  var f = $('btn-finalize'); if (f) f.addEventListener('click', function(e){ e.preventDefault(); finalizeCurrent() }, {passive:false});
  if (typeof refreshList==='function') refreshList();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wire, { once:true });
else wire();

(function wireDangerDeleteAll(){
  var btn = document.getElementById('btnDeleteAllNotes');
  if(!btn) return;
  btn.addEventListener('click', async (e)=>{
    e.preventDefault();
    const t = window.prompt('This will delete ALL notes (drafts + finalized). Type DELETE to continue.');
    if(t!=='DELETE') return;
    btn.disabled = true;
    try{
      const r = await fetch('/api/notes?all=1', { method:'DELETE' });
      const j = await r.json().catch(()=>({}));
      if(r.ok && j && typeof j.deleted !== 'undefined') alert('Deleted '+j.deleted+' notes.'); else alert('Delete failed.');
    }catch(e){ alert('Delete failed.'); }
    finally{ btn.disabled = false; if (typeof refreshList==='function') refreshList(); }
  }, { passive:false });
})();
