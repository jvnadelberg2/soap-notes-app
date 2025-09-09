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

    COMMON_FIELDS.forEach(k => note[k] = val(k));

    if (noteType === 'BIRP') {
      BIRP_FIELDS.forEach(k => note[k] = val(k));
    } else {
      SOAP_FIELDS.forEach(k => note[k] = val(k));
    }

    // generated text area
    const out = $('soapTextOut');
    note.text = out ? (out.textContent || '') : '';

    // current id if any
    const idEl = $('current-note-id');
    if (idEl && idEl.value) note.id = idEl.value.trim();

    return note;
  }

  function setFormFromNote(note) {
    if (!note || typeof note !== 'object') return;

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

    const idEl = $('current-note-id');
    if (idEl) idEl.value = note.id || '';
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
    const note = buildNoteFromForm();
    if ('id' in note) delete note.id; // always create a new note
    const j = await apiSend('/api/notes', 'POST', note);
    if (j && (j.id || (j.note && j.note.id))) {
      const idEl = $('current-note-id'); if (idEl) idEl.value = '';
    }
    await refreshList();
    return true;
  }

  async function loadNote(id) {
    if (!id) return;
    const j = await apiGet('/api/notes/' + encodeURIComponent(id) + '?_=' + Date.now());
    if (j && j.ok && j.note) {
      setFormFromNote(j.note);
    }
  }

  function refreshList() {
    return (async () => {
      const j = await apiGet('/api/notes').catch(() => ({ notes: [] }));
      const list = Array.isArray(j.notes) ? j.notes : [];
      const tbody = $('notes-tbody'); if (!tbody) return;
      tbody.innerHTML = '';

      const fmtSelect = $('noteType') || $('note-format');

      list.forEach(n => {
        const tr = document.createElement('tr');

        const tdId  = document.createElement('td'); tdId.textContent  = n.id || '';
        const tdPt  = document.createElement('td'); tdPt.textContent  = n.patient || '';
        const tdFmt = document.createElement('td'); tdFmt.textContent = (n.noteType || '').toUpperCase();
        const tdUpd = document.createElement('td'); tdUpd.textContent = pretty(n.updatedAt || n.createdAt || '');

        const tdAct = document.createElement('td');

        // Load
        const bLoad = document.createElement('button');
        bLoad.textContent = 'Load';
        bLoad.addEventListener('click', () => loadNote(n.id), { passive: true });
        tdAct.appendChild(bLoad);

        // PDF (per-row)
        const bPdf = document.createElement('button');
        bPdf.textContent = 'PDF';
        bPdf.style.marginLeft = '6px';
        bPdf.addEventListener('click', () => {
          const fmt = (fmtSelect?.value || 'soap').toLowerCase() === 'birp' ? 'birp' : 'soap';
          const url = '/notes/' + encodeURIComponent(n.id) + '/pdf?format=' + encodeURIComponent(fmt);
          window.open(url, '_blank');
        }, { passive: true });
        tdAct.appendChild(bPdf);

        // DEL (per-row)
        const bDel = document.createElement('button');
        bDel.textContent = 'DEL';
        bDel.style.marginLeft = '6px';
        bDel.addEventListener('click', async () => {
          if (!confirm('Delete this note?')) return;
          const resp = await fetch('/api/notes/' + encodeURIComponent(n.id), { method: 'DELETE' });
          if (!resp.ok) { alert('Delete failed'); return; }
          const hid = document.getElementById('current-note-id');
          if (hid && hid.value === n.id) hid.value = '';
          await refreshList();
        }, { passive: true });
        tdAct.appendChild(bDel);

        tr.appendChild(tdId);
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
    const idEl = $('current-note-id'); if (idEl) idEl.value = '';
  }

  function wire() {
    const typeEl = $('noteType') || $('note-format');
    if (typeEl) typeEl.addEventListener('change', () => refreshList(), { passive: true });
    refreshList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire, { once: true });
  } else {
    wire();
  }

  // Export for other scripts
  window.saveNote = saveNote;
  window.refreshList = refreshList;
  window.loadNote = loadNote;
  window.clearForm = clearForm;
})();
