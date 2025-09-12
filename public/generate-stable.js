'use strict';
(function(){
  function g(id){return document.getElementById(id)}
  function V(id){var el=g(id);if(!el)return'';if(el.type==='checkbox')return!!el.checked;return el.value||''}
  function useInf(){var el=g('useInference');return!!(el&&(el.checked||el.value==='true'||el.value==='on'||el.value==='1'))}
  function patientBlock(){return{patient:V('patient'),patientName:V('patientName'),mrn:V('mrn'),dob:V('dob'),sex:V('sex'),provider:V('provider'),credentials:V('credentials'),clinic:V('clinic'),npi:V('npi'),location:V('location'),specialty:V('specialty'),allergies:V('allergies'),medications:V('medications')}}
  function out(t){var pre=g('soapTextOut');if(pre)pre.textContent=String(t||'')}
  function collectSOAP(){return Object.assign({useInference:useInf(),chiefComplaint:V('chiefComplaint'),hpi:V('hpi'),pmh:V('pmh'),fh:V('fh'),sh:V('sh'),ros:V('ros'),vBP:V('vBP'),vHR:V('vHR'),vRR:V('vRR'),vTemp:V('vTemp'),vSpO2:V('vSpO2'),vWeight:V('vWeight'),vHeight:V('vHeight'),exam:V('exam'),diagnostics:V('diagnostics'),assessment:V('assessment'),plan:V('plan'),text:(g('noteText')&&g('noteText').value||'').trim()},patientBlock())}
  function collectBIRP(){return Object.assign({useInference:useInf(),birpBehavior:V('birpBehavior'),birpIntervention:V('birpIntervention'),birpResponse:V('birpResponse'),birpPlan:V('birpPlan')},patientBlock())}
  function fmt(){var e=g('noteType')||g('note-format');return((e&&e.value)||'SOAP').toUpperCase()}
  async function gen(){var f=fmt();var body=f==='BIRP'?collectBIRP():collectSOAP();var url=f==='BIRP'?'/api/birp':'/api/soap';try{var r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});if(!r.ok)throw new Error();var j=await r.json().catch(function(){return{}});var t=j.text||j.noteText||j.note||'';out(t);return t}catch(e){out('');return''}}
  async function generateStable(){return gen()}
  window.generateStable=generateStable;
})();
