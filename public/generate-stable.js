/* BEGIN:ARCH-COMMENT
File: public/generate-stable.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
'use strict';

function collectBirpFromUI() {
  return {
    noteType: 'BIRP',
    birpBehavior: (document.getElementById('birpBehavior')?.value || '').trim(),
    birpIntervention: (document.getElementById('birpIntervention')?.value || '').trim(),
    birpResponse: (document.getElementById('birpResponse')?.value || '').trim(),
    birpPlan: (document.getElementById('birpPlan')?.value || '').trim()
  };
}

(function(){
  function $(id){ return document.getElementById(id) }
  function setOut(text){
    var pre = $('soapTextOut');
    if(pre) pre.textContent = String(text||'');
  }
  function setTitle(fmt){
    var h3 = document.querySelector('#cardNote h3'); if(!h3) return;
    h3.textContent = (fmt==='BIRP'?'BIRP Note':'SOAP Note');
  }
  function V(id){ var el=$(id); return el ? (el.value||'') : '' }

  function collectSOAP(){
    return {
      useInference: !!V('useInference'),
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
      vSpO2: V('vSpO2'),
      vWeight: V('vWeight'),
      vHeight: V('vHeight'),
      exam: V('exam'),
      diagnostics: V('diagnostics'),
      assessment: V('assessment'),
      plan: V('plan'),
      text: (document.getElementById('noteText')?.value||'').trim()
    };
  }

  function collectBIRP(){
    return {
      useInference: !!V('useInference'),
      birpBehavior: V('birpBehavior'),
      birpIntervention: V('birpIntervention'),
      birpResponse: V('birpResponse'),
      birpPlan: V('birpPlan')
    };
  }

  // core generate (no event binding here)
  async function onGenerate(){
    var fmt = (V('noteType')||'SOAP').toUpperCase();
    setTitle(fmt);
    var body = (fmt==='BIRP') ? collectBIRP() : collectSOAP();
    var url  = (fmt==='BIRP') ? '/api/birp'     : '/api/soap';
    try{
      const res = await fetch(url, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify(body)
      });
      if (!res.ok) { setOut('Error generating note.'); return; }
      const j = await res.json().catch(()=>({text:''}));
      setOut(j.text || j.noteText || j.note || '');
    }catch{
      setOut('Error generating note.');
    }
  }

  // exported stable generator used by actions-stable.js and the manager
  async function generateStable(){
    await onGenerate();
    var pre = document.getElementById('soapTextOut');
    return pre ? (pre.textContent || '') : '';
  }
  window.generateStable = generateStable;
})();

// register with the generator manager
generators.register('stable', { name: 'stable', ready: true, generate: generateStable });
