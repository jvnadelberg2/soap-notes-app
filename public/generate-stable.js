'use strict';

(function(){
  if (window.__GEN_WIRED__) return; window.__GEN_WIRED__ = true;

  function $(id){ return document.getElementById(id); }
  function V(id){
    var el=$(id); if(!el) return '';
    if (el.type === 'checkbox') return !!el.checked;
    return (el.value||'').trim();
  }
  function setOut(txt){ var pre=$('soapTextOut'); if(pre) pre.textContent=(txt||'').trim(); }
  function setTitle(fmt){ var h=$('generatedNoteTitle'); if(h) h.textContent=(fmt==='BIRP'?'BIRP':'SOAP')+' Generation'; }

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
      vWeight: V('vWeight'),
      vO2Sat: V('vO2Sat'),
      height: V('height'),
      painScore: V('painScore'),
      diagnostics: V('diagnostics'),
      exam: V('exam'),
      allergies: V('allergies'),
      medications: V('medications')
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

  async function onGenerate(){
    var fmt = (V('noteType')||'SOAP').toUpperCase();
    setTitle(fmt);
    var body = (fmt==='BIRP') ? collectBIRP() : collectSOAP();
    var url  = (fmt==='BIRP') ? '/api/birp'     : '/api/soap';
    try{
      const res = await fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) });
      if (!res.ok) { setOut('Error generating note.'); return; }
      const j = await res.json().catch(()=>({text:''}));
      setOut(j.text || j.noteText || j.note || '');
    }catch{
      setOut('Error generating note.');
    }
  }

  function wire(){
    var btn=$('btnGenerate'); if(!btn) return;
    var clone=btn.cloneNode(true); btn.parentNode.replaceChild(clone,btn); clone.id='btnGenerate';
    clone.addEventListener('click', onGenerate, {capture:true});
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', wire, {once:true});
  else wire();
})();
