/* BEGIN:ARCH-COMMENT
File: public/app.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
// ===== Notes UI logic (single source of truth) =====

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

// --- value helpers ---
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

// --- format helpers (SOAP / BIRP) ---
function getFormat() {
  const el = $('noteType') || $('note-format');
  return ((el && el.value) || 'SOAP').toUpperCase();
}

// ---- list / table ----
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

// ---- load ----
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

// ---- delete ----
async function deleteNote(uuid){
  if(!uuid) return;
  if(!window.confirm('Delete this note?')) return;
  try{
    var r = await fetch('/api/notes/'+encodeURIComponent(uuid), { method:'DELETE' });
    if(r.ok && typeof refreshList==='function') await refreshList();
  }catch(_){}
}

// ---- save ----
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
      body: JSON.stringify((payload.patientName=(document.getElementById('patientName')?document.getElementById('patientName').value:''), payload.patient=payload.patientName, payload))
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


/*





// ---- export PDF ----

// helper to submit JSON via classic form POST to a new tab (no blob: URL)
function postPdfInNewTab(url, payload) {
  const form = document.createElement('form');
  form.method = 'post';
  form.action = url;
  form.target = '_blank';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'json'; // server parses req.body.json
  input.value = JSON.stringify(payload);

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  setTimeout(()=>form.remove(), 1500);
}

async function exportPdf() {
  // field reader with tolerant fallbacks
  var R = function (idA, idB, idC) {
    var e = document.getElementById(idA);
    if (!e && idB) e = document.getElementById(idB);
    if (!e && idC) e = document.getElementById(idC);
    if (!e) return "";
    return (e.type === "checkbox") ? (e.checked ? "on" : "") : (e.value || "");
  };

  var pre      = document.getElementById("soapTextOut");
  var fmtUpper = (typeof getFormat === "function" ? getFormat() : "SOAP");
  var fmtLower = (fmtUpper === "BIRP") ? "birp" : "soap";

  var uuid = (typeof getUUID === "function" && getUUID()) ||
             (window.crypto && window.crypto.randomUUID ? window.crypto.randomUUID()
              : (Date.now().toString(36) + Math.random().toString(36).slice(2)));
  var exportUuid = (window.crypto && window.crypto.randomUUID)
    ? window.crypto.randomUUID()
    : (Date.now().toString(36) + Math.random().toString(36).slice(2));

  var body = {
    uuid: uuid,
    noteType: fmtUpper,
    format: fmtLower,
    draft: true,
    exportUuid: exportUuid,

    // Core text
    text: (pre ? pre.textContent : ""),

    // Patient
    patientName: (R("patientName","patient") || "").trim(),
    patient: (R("patientName","patient") || "").trim(),
    dob: R("dob"),
    sex: R("sex"),
    mrn: R("mrn"),

    // Provider/Org
    provider: (R("provider","authorName") || "").trim(),
    credentials: R("credentials","authorCredentials"),
    authorName: R("authorName"),
    authorCredentials: R("authorCredentials"),
    npi: R("npi"),
    clinic: R("clinic"),

    // Encounter (multiple fallbacks)
    encounterDateTime: R("encounterDateTime","encounter","encounterDate"),

    // SOAP/BIRP specific
    subjective: R("subjective"),
    assessment: R("assessment"),
    plan: R("plan"),
    behavior: R("behavior"),
    intervention: R("intervention"),
    response: R("response"),

    // Extras (optional)
    chiefComplaint: R("chiefComplaint","cc"),
    hpi: R("hpi"),
    pmh: R("pmh"),
    fh: R("fh"),
    sh: R("sh"),
    ros: R("ros"),
    exam: R("exam"),
    diagnostics: R("diagnostics"),
    medications: R("medications"),
    allergies: R("allergies"),
    icd10: R("icd10"),
    cptCodes: R("cptCodes"),
    cptModifiers: R("cptModifiers"),
    posCode: R("posCode"),
    visitKind: R("visitKind"),
    procedure: R("procedure"),
    orders: R("orders"),
    followUp: R("followUp"),
    disposition: R("disposition"),
    timeIn: R("timeIn"),
    timeOut: R("timeOut"),
    timeMinutes: R("timeMinutes"),
    vBP: R("vBP"),
    vHR: R("vHR"),
    vRR: R("vRR"),
    vTemp: R("vTemp"),
    vWeight: R("vWeight"),
    vO2Sat: R("vO2Sat"),
    height: R("height"),
    painScore: R("painScore"),
    teleConsent: R("teleConsent"),
    telePlatform: R("telePlatform")
  };

  // Open new tab with classic form POST (no blob: URL)
  postPdfInNewTab('/export/pdf', body);
}

function wireExportPdf(){
  var b = $('exportPdf');
  if(b) b.addEventListener('click', function(e){ e.preventDefault(); exportPdf() }, {passive:false});
}
*/
// ---- generate ----
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

// ---- finalize ----
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

// ---- wire ----  
function wire(){
  var g = $('btnGenerate'); if(g) g.addEventListener('click', ... );
  var s = $('btn-save-note'); if(s) s.addEventListener('click', ... );
  // wireExportPdf();   // disable duplicate PDF wiring
  var f = $('btn-finalize'); if (f) f.addEventListener('click', ... );
  if (typeof refreshList==='function') refreshList();
}

// ---- admin destructive button ----
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

// window.exportPdf = exportPdf;
