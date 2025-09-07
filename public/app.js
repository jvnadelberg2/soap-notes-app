// Notes UI logic 
(function () {
  const $ = (id) => document.getElementById(id);
  const T = (id) => (($(id)?.value ?? '').trim());
  const S = (id, v) => { if ($(id)) $(id).value = v ?? ''; };

  function findFormatSelect() {
    const byId = $('note-format');
    if (byId) return byId;
    // fallback: any <select> that has soap/birp
    return Array.from(document.querySelectorAll('select')).find(s => {
      const vals = Array.from(s.options).map(o => (o.value || '').toLowerCase());
      return vals.includes('soap') || vals.includes('birp');
    });
  }
  function getFormat() {
    const sel = findFormatSelect();
    const raw = (sel?.value || 'soap').toLowerCase();
    return raw === 'birp' ? 'birp' : 'soap';
  }

  // Expose for PDF Export binding (Item A)
  window.getCurrentNoteId = function getCurrentNoteId() {
    return $('current-note-id')?.value || '';
  };

  function showFieldsForFormat(fmt) {
    const soap = $('soap-fields');
    const birp = $('birp-fields');
    if (soap) soap.style.display = (fmt === 'soap') ? '' : 'none';
    if (birp) birp.style.display = (fmt === 'birp') ? '' : 'none';
  }

  function buildNoteFromForm() {
    const fmt = getFormat();
    const base = {
      patientName: T('patientName'),
      patientDob: T('patientDob'),
      patientMrn: T('patientMrn'),
      encounterDateTime: T('encounterDateTime'),
      location: T('location'),
      clinicianName: T('clinicianName'),
      clinicianCredentials: T('clinicianCredentials'),
      finalizedAt: T('finalizedAt')
    };
    if (fmt === 'birp') {
      base.birp = {
        behavior: T('birpBehavior'),
        intervention: T('birpIntervention'),
        response: T('birpResponse'),
        plan: T('birpPlan')
      };
    } else {
      base.soap = {
        subjective: [
          T('chiefComplaint') && `Chief Complaint: ${T('chiefComplaint')}`,
          T('hpi') && `HPI: ${T('hpi')}`,
          T('pmh') && `PMH: ${T('pmh')}`,
          T('fh') && `FH: ${T('fh')}`,
          T('sh') && `SH: ${T('sh')}`,
          T('ros') && `ROS: ${T('ros')}`
        ].filter(Boolean).join('\n'),
        objective: [
          (T('vBP')||T('vHR')||T('vRR')||T('vTemp')||T('vWeight')||T('vO2Sat')) &&
            `BP: ${T('vBP')||'—'}, HR: ${T('vHR')||'—'}, RR: ${T('vRR')||'—'}, Temp: ${T('vTemp')||'—'}, Weight: ${T('vWeight')||'—'}, O2 Sat: ${T('vO2Sat')||'—'}`,
          T('diagnostics') && `Diagnostics: ${T('diagnostics')}`,
          T('exam') && `Exam: ${T('exam')}`
        ].filter(Boolean).join('\n'),
        assessment: T('soapAssessment'),
        plan: T('soapPlan')
      };
    }
    // Store a hint about the format used at save time (for listing)
    base._format = fmt;
    return base;
  }

  function setFormFromNote(note) {
    S('patientName', note.patientName);
    S('patientDob', note.patientDob);
    S('patientMrn', note.patientMrn);
    S('encounterDateTime', note.encounterDateTime);
    S('location', note.location);
    S('clinicianName', note.clinicianName);
    S('clinicianCredentials', note.clinicianCredentials);
    S('finalizedAt', note.finalizedAt);

    const fmt = (note._format || getFormat()).toLowerCase() === 'birp' ? 'birp' : 'soap';
    const fmtSel = findFormatSelect();
    if (fmtSel) fmtSel.value = fmt;
    showFieldsForFormat(fmt);

    if (fmt === 'birp') {
      S('birpBehavior', note?.birp?.behavior);
      S('birpIntervention', note?.birp?.intervention);
      S('birpResponse', note?.birp?.response);
      S('birpPlan', note?.birp?.plan);
      // clear SOAP fields
      ['chiefComplaint','hpi','pmh','fh','sh','ros','vBP','vHR','vRR','vTemp','vWeight','vO2Sat','diagnostics','exam','soapAssessment','soapPlan']
        .forEach(id => S(id, ''));
    } else {
      // naive reverse-fill (we saved pre-shaped strings for subjective/objective)
      const subj = (note?.soap?.subjective || '');
      const obj  = (note?.soap?.objective || '');
      // best effort: do not parse back; set whole fields where reasonable
      S('chiefComplaint', '');
      S('hpi', '');
      S('pmh', '');
      S('fh', '');
      S('sh', '');
      S('ros', '');
      S('diagnostics', '');
      S('exam', '');
      S('vBP',''); S('vHR',''); S('vRR',''); S('vTemp',''); S('vWeight',''); S('vO2Sat','');

      S('soapAssessment', note?.soap?.assessment);
      S('soapPlan', note?.soap?.plan);

      // put the entire shaped text into HPI/Exam buckets so the user sees content
      if (subj) S('hpi', subj);
      if (obj)  S('exam', obj);

      // clear BIRP fields
      ['birpBehavior','birpIntervention','birpResponse','birpPlan'].forEach(id => S(id, ''));
    }
  }

  async function saveNote() {
    const payload = buildNoteFromForm();
    const r = await fetch('/api/notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return alert('Save failed');
    const j = await r.json();
    $('current-note-id').value = j.id || j.note?.id || '';
    $('btn-update-note').disabled = !$('current-note-id').value;
    await refreshList();
    return j;
    }

  async function updateNote() {
    const id = $('current-note-id').value;
    if (!id) return alert('No note loaded to update.');
    const payload = buildNoteFromForm();
    const r = await fetch(`/api/notes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!r.ok) return alert('Update failed');
    const j = await r.json();
    await refreshList();
    return j;
  }

  async function loadNote(id) {
    const r = await fetch(`/api/notes/${encodeURIComponent(id)}`);
    if (!r.ok) return alert('Load failed');
    const j = await r.json();
    $('current-note-id').value = j.note?.id || '';
    $('btn-update-note').disabled = !$('current-note-id').value;
    setFormFromNote(j.note || {});
  }

  async function refreshList() {
    const r = await fetch('/api/notes');
    if (!r.ok) return;
    const j = await r.json();
    const tbody = $('notes-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    (j.notes || []).forEach(n => {
      const tr = document.createElement('tr');
      const idTd = document.createElement('td');
      const ptTd = document.createElement('td');
      const fmtTd = document.createElement('td');
      const upTd = document.createElement('td');
      const actTd = document.createElement('td');

      idTd.textContent = n.id;
      ptTd.textContent = n.patientName || '';
      fmtTd.textContent = (n._format || 'soap').toUpperCase();
      upTd.textContent = n.updatedAt || n.createdAt || '';

      const loadBtn = document.createElement('button');
      loadBtn.textContent = 'Load';
      loadBtn.addEventListener('click', () => loadNote(n.id));

      const pdfSoap = document.createElement('a');
      pdfSoap.href = `/notes/${encodeURIComponent(n.id)}/pdf?format=soap`;
      pdfSoap.textContent = 'PDF SOAP';
      pdfSoap.target = '_blank';

      const pdfBirp = document.createElement('a');
      pdfBirp.href = `/notes/${encodeURIComponent(n.id)}/pdf?format=birp`;
      pdfBirp.textContent = 'PDF BIRP';
      pdfBirp.target = '_blank';

      actTd.appendChild(loadBtn);
      actTd.appendChild(document.createTextNode(' '));
      actTd.appendChild(pdfSoap);
      actTd.appendChild(document.createTextNode(' | '));
      actTd.appendChild(pdfBirp);

      tr.appendChild(idTd);
      tr.appendChild(ptTd);
      tr.appendChild(fmtTd);
      tr.appendChild(upTd);
      tr.appendChild(actTd);
      tbody.appendChild(tr);
    });
  }

  function clearForm() {
    $('current-note-id').value = '';
    $('btn-update-note').disabled = true;
    [
      'patientName','patientDob','patientMrn','encounterDateTime','location',
      'clinicianName','clinicianCredentials','finalizedAt',
      'chiefComplaint','hpi','pmh','fh','sh','ros',
      'vBP','vHR','vRR','vTemp','vWeight','vO2Sat','diagnostics','exam',
      'soapAssessment','soapPlan',
      'birpBehavior','birpIntervention','birpResponse','birpPlan'
    ].forEach(id => { if ($(id)) $(id).value = ''; });
  }

  function wire() {
    const fmtSel = findFormatSelect();
    if (fmtSel) fmtSel.addEventListener('change', () => showFieldsForFormat(getFormat()));
    $('btn-new-note')?.addEventListener('click', clearForm);
    $('btn-save-note')?.addEventListener('click', saveNote);
    $('btn-update-note')?.addEventListener('click', updateNote);
    $('btn-refresh-list')?.addEventListener('click', refreshList);
    showFieldsForFormat(getFormat());
    refreshList();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', wire);
  } else {
    wire();
  }
})();
