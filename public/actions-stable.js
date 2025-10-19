'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const noteTypeSel = document.getElementById('noteType');
  const generateBtn = document.getElementById('generateNote');
  const exportBtn = document.getElementById('exportPdf');
  const redactChk = document.getElementById('redact');
  const assistSel = document.getElementById('assistLevel');
  const modelSel = document.getElementById('llmModel');
  const specialtySel = document.getElementById('specialty');
  const outputBox = document.getElementById('generatedNote');
  const signBtn = document.getElementById('signNote');

  if (!generateBtn) return;

  async function callAPI(url, data) {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return res.json();
  }

  function gatherTelehealth() {
    return {
      telePlatform: document.getElementById('telePlatform')?.value || '',
      teleModality: document.getElementById('teleModality')?.value || '',
      telePatientLocation: document.getElementById('telePatientLocation')?.value || '',
      teleConsentAt: document.getElementById('teleConsentAt')?.value || '',
      teleConsent: document.getElementById('teleConsent')?.checked || false
    };
  }

  function gatherClinician() {
    return {
      provider: document.getElementById('provider')?.value || '',
      credentials: document.getElementById('credentials')?.value || '',
      npi: document.getElementById('npi')?.value || '',
      clinic: document.getElementById('clinic')?.value || '',
      providerLocation: document.getElementById('providerLocation')?.value || ''
    };
  }

  async function generateNote() {
    const noteType = noteTypeSel.value;
    const model = modelSel.value;
    const assistLevel = assistSel.value;
    outputBox.value = 'Generating note... please wait.';

    try {
      let result;

      if (noteType === 'ICU Progress') {
        const data = {
          icuInterval: document.getElementById('icuInterval')?.value || '',
          icuObjective: document.getElementById('icuObjective')?.value || '',
          icuAssessment: document.getElementById('icuAssessment')?.value || '',
          icuPlan: document.getElementById('icuPlan')?.value || '',
          model,
          assistLevel
        };
        result = await callAPI('/api/icu-enhance', data);
      }

      else if (noteType === 'BIRP') {
        const data = {
          behavior: document.getElementById('birpBehavior')?.value || '',
          intervention: document.getElementById('birpIntervention')?.value || '',
          response: document.getElementById('birpResponse')?.value || '',
          plan: document.getElementById('birpPlan')?.value || '',
          model,
          assistLevel
        };
        result = await callAPI('/api/birp', data);
      }

      else {
        // SOAP note
        const rosChecked = Array.from(document.querySelectorAll('#ros input[type=checkbox]:checked')).map(c => c.value);
        const rosComments = document.getElementById('rosComments')?.value || '';

        const data = {
          chiefComplaint: document.getElementById('chiefComplaint')?.value || '',
          hpi: document.getElementById('hpi')?.value || '',
          pmh: document.getElementById('pmh')?.value || '',
          psh: document.getElementById('psh')?.value || '',
          familyHistory: document.getElementById('familyHistory')?.value || '',
          socialHistory: document.getElementById('socialHistory')?.value || '',
          allergies: document.getElementById('allergies')?.value || '',
          medications: document.getElementById('medications')?.value || '',
          physicalExam: document.getElementById('physicalExam')?.value || '',
          bp: document.getElementById('bp')?.value || '',
          hr: document.getElementById('hr')?.value || '',
          temp: document.getElementById('temp')?.value || '',
          rr: document.getElementById('rr')?.value || '',
          spo2: document.getElementById('spo2')?.value || '',
          height: document.getElementById('height')?.value || '',
          weight: document.getElementById('weight')?.value || '',
          labs: document.getElementById('labs')?.value || '',
          ros: rosChecked.join(', '),
          rosComments,
          model,
          assistLevel,
          specialty: specialtySel.value
        };
        result = await callAPI('/api/soap', data);
      }

      if (result?.ok) {
        outputBox.value = result.generatedNote || '(No note generated)';
      } else {
        outputBox.value = `Error: ${result?.error || 'Unknown failure'}`;
      }
    } catch (err) {
      outputBox.value = `Error: ${err.message}`;
    }
  }

  async function exportPdf() {
    const text = outputBox.value.trim();
    if (!text) return alert('No generated note to export.');
    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          noteType: noteTypeSel.value,
          content: text,
          patient: {
            name: document.getElementById('patient')?.value || '',
            dob: document.getElementById('dob')?.value || '',
            sex: document.getElementById('sex')?.value || '',
            mrn: document.getElementById('mrn')?.value || ''
          },
          clinician: gatherClinician(),
          telehealth: gatherTelehealth()
        })
      });
      if (!res.ok) throw new Error(`PDF export failed: ${res.status}`);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      window.open(url, '_blank');
    } catch (err) {
      alert(err.message);
    }
  }

  async function signNote() {
    const text = outputBox.value.trim();
    if (!text) return alert('Generate a note before signing.');

    const clinician = gatherClinician();
    if (!clinician.provider) return alert('Please enter provider name before signing.');

    const now = new Date().toLocaleString();
    const signedText = `${text}\n\n---\nSigned electronically by ${clinician.provider}, ${clinician.credentials || ''}\n${clinician.clinic || ''}\n${now}`;
    outputBox.value = signedText;
    alert('Note signed and timestamped.');
  }

  if (generateBtn) generateBtn.addEventListener('click', generateNote);
  if (exportBtn) exportBtn.addEventListener('click', exportPdf);
  if (signBtn) signBtn.addEventListener('click', signNote);
});