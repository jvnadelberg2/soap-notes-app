'use strict';

function byId(id){ return document.getElementById(id); }
function setStatus(msg){ const s = byId('status'); if (s) s.textContent = msg; }

function getNoteText(){
  const out = byId('soapTextOut');
  return out ? (out.textContent || out.innerText || '') : '';
}

function download(name, mime, text){
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click();
  URL.revokeObjectURL(url); a.remove();
}

function onPrint(){ window.print(); }
function onSaveWord(){ download('soap-note.doc','application/msword',getNoteText()); }
function onExportPdf(){ window.print(); }

function clearElements(els){
  els.forEach(el => {
    if (!el) return;
    if (el.tagName === 'SELECT') el.selectedIndex = 0;
    else if ('checked' in el && el.type === 'checkbox') el.checked = false;
    else if ('value' in el) el.value = '';
    el.dispatchEvent(new Event('input',  { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function purgeStorage(){
  const KEYS = ['soap_notes_form_v2','soap_notes_form','soap_notes_form_v1'];
  for (const k of KEYS){ try{ localStorage.removeItem(k); }catch{} }
  try { sessionStorage.clear(); } catch {}
}

function clearSoapOutput(){
  const out = byId('soapTextOut');
  if (out){ out.innerHTML = ''; }
}

function performClear(){
  window.__suppressPersist = true;

  const patientInfo = document.querySelectorAll(
    '#patient-name-mrn-row input'
  );
  const extraInfo = document.querySelectorAll(
    '#patient-info-extra-row input'
  );
  const subjective = document.querySelectorAll(
    '#belowBtnsData textarea#chiefComplaint, #belowBtnsData textarea#hpi, #belowBtnsData textarea#pmh, #belowBtnsData textarea#fh, #belowBtnsData textarea#sh, #belowBtnsData textarea#ros'
  );
  const vitals = document.querySelectorAll(
    '#belowBtnsData input#vBP, #belowBtnsData input#vHR, #belowBtnsData input#vRR, #belowBtnsData input#vTemp, #belowBtnsData input#vWeight, #belowBtnsData input#vO2Sat'
  );
  const objective = document.querySelectorAll(
    '#belowBtnsData textarea#diagnostics, #belowBtnsData textarea#exam'
  );

  clearElements(patientInfo);
  clearElements(extraInfo);
  clearElements(subjective);
  clearElements(vitals);
  clearElements(objective);

  purgeStorage();
  clearSoapOutput();

  // Re-clear on next tick to defeat any late repopulation from other scripts.
  setTimeout(() => {
    clearElements(patientInfo);
    clearElements(extraInfo);
    clearElements(subjective);
    clearElements(vitals);
    clearElements(objective);
    window.__suppressPersist = false;
  }, 50);
}

function onClearPatientData(){
  performClear();
  setStatus('Patient data cleared.');
}

function wire(){
  const btnPrint = byId('genStream') || byId('btnPrint');
  const btnSave  = byId('saveNote');
  const btnPdf   = byId('exportPdf');
  const btnClear = byId('btnClear');

  if (btnPrint) btnPrint.addEventListener('click', onPrint);
  if (btnSave)  btnSave.addEventListener('click', onSaveWord);
  if (btnPdf)   btnPdf.addEventListener('click', onExportPdf);
  if (btnClear) btnClear.addEventListener('click', onClearPatientData);
}

document.addEventListener('DOMContentLoaded', wire);
