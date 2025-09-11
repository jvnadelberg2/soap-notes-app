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
    if (isNaN(d)) return ts;
    return d.toLocaleString([], {
      year:'numeric', month:'short', day:'2-digit',
      hour:'2-digit', minute:'2-digit'
    }).replace(',', '');
  }catch(e){ return ts; }
}

(function () {
  'use strict';

  // --- tiny utils ---
  const $ = (id) => document.getElementById(id);
  const val = (id) => {
    const el = $(id);
    if (!el) return '';
    if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT') {
      return (el.value || '').trim();
    }
    return (el.textContent || '').trim();
  };
  const setVal = (id, v) => { const el = $(id); if (el) el.value = v == null ? '' : String(v); };

  // --- UUID helpers ---
  function ensureUUID(){
    const el = $('current-note-uuid');
    if (!el) return '';
    if (!el.value) {
      if (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function') {
        el.value = globalThis.crypto.randomUUID();
      } else {
        el.value = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c){
          const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
          return v.toString(16);
        });
      }
    }
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

  // --- form <-> note mapping ---
  const COMMON_FIELDS = [
    'patient','mrn','dob','sex','provider','clinic','npi','location'
  ];

  const SOAP_FIELDS = [
    'chiefComplaint','hpi','pmh','fh','sh','ros',
    'vBP','vHR','vRR','vTemp','vWeight','vO2Sat','height','painScore',
    'diagnostics','exam','allergies','medications'
  ];

  const BIRP_FIELDS = ['birpBehavior','birpIntervention','birpResponse','birpPlan'];

  function buildNoteFromForm() {
    const noteType = getFormat();
    const note = { noteType };

    // dataset UUID (must exist for Save/Load/Export)
    const uuid = getUUID();
    if (uuid) note.uuid = uuid;

    COMMON_FIELDS.forEach(k => note[k] = val(k));

    if (noteType === 'BIRP') {
      BIRP_FIELDS.forEach(k => note[k] = val(k));
    } else {
      SOAP_FIELDS.forEach(k => note[k] = val(k));
    }

    // generated text area
    const out = $('soapTextOut');
    note.text = out ? (out.textContent || '') : '';

    return note;
  }

  function setFormFromNote(note) {
    if (!note || typeof note !== 'object') return;

    // keep uuid stable in the form
    const uuidEl = $('current-note-uuid');
    if (uuidEl) uuidEl.value = note.uuid || uuidEl.value || '';

    const type = (note.noteType || 'SOAP').toUpperCase();
    const typeEl = $('noteType') || $('note-format');
    if (typeEl) typeEl.value = type;

    COMMON_FIELDS.forEach(k => setVal(k, note[k] || ''));

    if (type === 'BIRP') {
      BIRP_FIELDS.forEach(k => setVal(k, note[k] || ''));
    } else {
      SOAP_FIELDS.forEach(k => setVal(k, note[k] || ''));
    }

    const out = $('soapTextOut');
    if (out) out.textContent = note.text || '';
  }

  // --- server API helpers ---
  async function apiGet(url) {
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('GET ' + url + ' failed');
    return r.json();
  }
  async function apiSend(url, method, body) {
    const r = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.ok === false) throw new Error(method + ' ' + url + ' failed');
    return j;
  }

  // --- public actions ---
  async function saveNote() {
    // Make sure the dataset has a UUID (backstop even if Generate missed it)
    const uuid = ensureUUID();

    const note = buildNoteFromForm();
    note.uuid = uuid;

    // UUID-first: single idempotent upsert
    const url = '/api/notes/' + encodeURIComponent(uuid);
    const method = 'PUT';
    await apiSend(url, method, note);

    await refreshList();
    return true;
  }

  async function loadNote(uuid) {
    if (!uuid) return;
    const j = await apiGet('/api/notes/' + encodeURIComponent(uuid) + '?_=' + Date.now());
    if (j && j.ok && j.note) {
      setFormFromNote(j.note);
      // ensure the hidden field carries the loaded uuid
      const el = $('current-note-uuid'); if (el) el.value = j.note.uuid || el.value || '';
    }
  }
function refreshList() {
  return (async () => {
    // 1) Fetch notes
    const j = await apiGet('/api/notes').catch(() => ({ notes: [] }));
    let list = Array.isArray(j.notes) ? j.notes : [];

    // 2) Backfill any notes missing a uuid (one-time)
    const missing = list.filter(n => !n.uuid || !String(n.uuid).trim());
    if (missing.length) {
      const mk = () => (globalThis.crypto && crypto.randomUUID)
        ? crypto.randomUUID()
        : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
            const r = Math.random()*16|0, v = c === 'x' ? r : (r&0x3|0x8);
            return v.toString(16);
          });

      for (const n of missing) {
        const newUuid = mk();
        // PUT upsert using the note’s existing fields + the new uuid
        const payload = { ...n, uuid: newUuid };
        await apiSend('/api/notes/' + encodeURIComponent(newUuid), 'PUT', payload);
      }

      // Re-fetch after backfill so the table renders with UUIDs
      const j2 = await apiGet('/api/notes').catch(() => ({ notes: [] }));
      list = Array.isArray(j2.notes) ? j2.notes : [];
    }

    // 3) Render table
    const tbody = document.getElementById('notes-tbody'); if (!tbody) return;
    tbody.innerHTML = '';

    const fmtSelect = document.getElementById('noteType') || document.getElementById('note-format');

    list.forEach(n => {
      const tr = document.createElement('tr');

      const tdUUID = document.createElement('td'); tdUUID.textContent  = n.uuid || '';
      const tdPt   = document.createElement('td'); tdPt.textContent    = n.patient || '';
      const tdFmt  = document.createElement('td'); tdFmt.textContent   = (n.noteType || '').toUpperCase();
      const tdUpd  = document.createElement('td'); tdUpd.textContent   = pretty(n.updatedAt || n.createdAt || '');

      const tdAct = document.createElement('td');

      // Load
      const bLoad = document.createElement('button');
      bLoad.textContent = 'Load';
      bLoad.addEventListener('click', () => loadNote(n.uuid), { passive: true });
      tdAct.appendChild(bLoad);

      // PDF
      const bPdf = document.createElement('button');
      bPdf.textContent = 'PDF';
      bPdf.style.marginLeft = '6px';
      bPdf.addEventListener('click', () => {
        const fmt = ((fmtSelect?.value || 'soap').toLowerCase() === 'birp') ? 'birp' : 'soap';
        const url = '/notes/' + encodeURIComponent(n.uuid) + '/pdf?format=' + encodeURIComponent(fmt);
        window.open(url, '_blank');
      }, { passive: true });
      tdAct.appendChild(bPdf);

      // DEL
      const bDel = document.createElement('button');
      bDel.textContent = 'DEL';
      bDel.style.marginLeft = '6px';
      bDel.addEventListener('click', async (e) => {
        e.preventDefault();
        if (!confirm('Delete this note?')) return;
        const resp = await fetch('/api/notes/' + encodeURIComponent(n.uuid), { method: 'DELETE' });
        if (!resp.ok) { alert('Delete failed'); return; }
        const hid = document.getElementById('current-note-uuid');
        if (hid && hid.value === n.uuid) hid.value = '';
        await refreshList();
      }, { passive: true });
      tdAct.appendChild(bDel);

      tr.appendChild(tdUUID);
      tr.appendChild(tdPt);
      tr.appendChild(tdFmt);
      tr.appendChild(tdUpd);
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
  })();
}


  function clearForm() {
    [...COMMON_FIELDS, ...SOAP_FIELDS, ...BIRP_FIELDS].forEach(k => setVal(k, ''));
    const out = $('soapTextOut'); if (out) out.textContent = '';
    const uuidEl = $('current-note-uuid'); if (uuidEl) uuidEl.value = '';
  }

  // Heuristic: when generated text changes from empty → non-empty, mint a UUID
  function observeGeneratedText() {
    const out = $('soapTextOut');
    if (!out || window.__uuidObserverHooked) return;
    window.__uuidObserverHooked = true;
    const mo = new MutationObserver(() => {
      if (out.textContent && out.textContent.trim() && !getUUID()) ensureUUID();
    });
    mo.observe(out, { childList: true, subtree: true, characterData: true });
  }

  function wire() {
    const typeEl = $('noteType') || $('note-format');
    if (typeEl) typeEl.addEventListener('change', () => refreshList(), { passive: true });
    observeGeneratedText();
    refreshList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }

  // Export the canonical API for other scripts
  window.saveNote = saveNote;
  window.refreshList = refreshList;
  window.loadNote = loadNote;
  window.clearForm = clearForm;
  window.ensureUUID = ensureUUID;
})();
(function(){
  async function finalizeCurrent(){
    try{
      const uel=document.getElementById("uuid");
      const uuid=(uel&&uel.value||"").trim();
      if(!uuid){alert("No UUID present for this note.");return}
      const signedBy=(document.getElementById("authorName")&&document.getElementById("authorName").value)||"";
      const attEl=document.getElementById("attestationText")||document.getElementById("attestation");
      const attestationText=(attEl&&attEl.value)||"";
      const r=await fetch("/api/notes/"+encodeURIComponent(uuid)+"/finalize",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({signedBy,attestationText})});
      if(!r.ok){const t=await r.text();alert("Finalize failed: "+t);return}
      const data=await r.json();
      if(data&&data.note&&data.note.finalizedAt){
        const fin=document.getElementById("finalizedAt");
        if(fin)fin.value=(data.note.finalizedAt||"").replace("T"," ").replace("Z","")
      }
      if(typeof refreshList==="function")await refreshList();
      const fmtEl=(document.getElementById("noteType")||document.getElementById("note-format"));
      const fmt=((fmtEl&&(fmtEl.value||"").toLowerCase())==="birp")?"birp":"soap";
      const url="/api/notes/"+encodeURIComponent(uuid)+"/pdf?format="+encodeURIComponent(fmt);
      window.open(url,"_blank")
    }catch(e){alert("Finalize error")}
  }
  window.finalizeCurrent=finalizeCurrent;
  function ensureFinalizeButton(){
    var f=document.getElementById("btn-finalize");
    if(!f){
      var save=document.getElementById("btn-save-note");
      f=document.createElement("button");
      f.id="btn-finalize";
      f.type="button";
      f.className="btn";
      f.textContent="Finalize & PDF";
      if(save&&save.parentNode){save.parentNode.insertBefore(f,save.nextSibling)}else{document.body.appendChild(f)}
    }
    f.addEventListener("click",function(e){e.preventDefault();finalizeCurrent()},{passive:true})
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",ensureFinalizeButton);else ensureFinalizeButton()
})();
