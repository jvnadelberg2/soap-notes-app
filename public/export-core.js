(function(){
  function g(id){return document.getElementById(id)}
  function V(id){var el=g(id);if(!el)return'';if(el.type==='checkbox')return!!el.checked;return el.value||''}
  function fmt(){var e=g('noteType')||g('note-format');return((e&&e.value)||'SOAP').toUpperCase()}
  function ensureUUID(){var el=g('current-note-uuid');if(!el){el=document.createElement('input');el.type='hidden';el.id='current-note-uuid';document.body.appendChild(el)};if(!el.value||!el.value.trim()){el.value=(crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));}return el.value}
  function patientBlock(){return{patient:V('patient'),patientName:V('patientName'),mrn:V('mrn'),dob:V('dob'),sex:V('sex'),provider:V('provider'),credentials:V('credentials'),clinic:V('clinic'),npi:V('npi'),location:V('location'),specialty:V('specialty'),allergies:V('allergies'),medications:V('medications')}}
  async function saveNow(){
    var id=ensureUUID(); if(!id) return;
    var pre=g('soapTextOut'); var text=(pre&&pre.textContent)||'';
    var u=V('useInference'); var useInference=(u===true||u==='true'||u==='on'||u==='1');
    var f=fmt();
    var base=f==='BIRP'
      ? {noteType:'BIRP',birpBehavior:V('birpBehavior'),birpIntervention:V('birpIntervention'),birpResponse:V('birpResponse'),birpPlan:V('birpPlan')}
      : {noteType:'SOAP',chiefComplaint:V('chiefComplaint'),hpi:V('hpi'),pmh:V('pmh'),fh:V('fh'),sh:V('sh'),ros:V('ros'),vitals:{BP:V('vBP'),HR:V('vHR'),RR:V('vRR'),Temp:V('vTemp'),SpO2:V('vSpO2'),Weight:V('vWeight'),Height:V('vHeight')},exam:V('exam'),diagnostics:V('diagnostics'),assessment:V('assessment'),plan:V('plan')};
    var pl=Object.assign({}, base, patientBlock(), {useInference:useInference, text:text});
    try{await fetch('/api/notes/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(pl)})}catch(e){}
  }
  async function exportPDF(){
    var id=ensureUUID();
    await saveNow();
    var f=(fmt()==='BIRP')?'birp':'soap';
    var w=window.open('/api/notes/'+encodeURIComponent(id)+'/pdf?format='+f,'_blank');
    if(!w) alert('Popup blocked');
  }
  async function exportFHIR(){
    var id=ensureUUID();
    await saveNow();
    var pre=g('soapTextOut'); var text=(pre&&pre.textContent)||'';
    var body={uuid:id,noteType:fmt(),text:text,patient:Object.assign({uuid:id}, patientBlock())};
    try{await fetch('/api/notes/'+encodeURIComponent(id)+'/fhir',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})}catch(e){}
  }
  function wire(){
    var b=g('exportPdf'); if(b){var c=b.cloneNode(true);b.replaceWith(c);c.addEventListener('click',function(e){e.preventDefault();exportPDF()},{passive:false})}
    var f=g('exportFhir'); if(f){var d=f.cloneNode(true);f.replaceWith(d);d.addEventListener('click',function(e){e.preventDefault();exportFHIR()},{passive:false})}
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',wire,{once:true})}else{wire()}
  window.__exportCore={exportPDF:exportPDF,exportFHIR:exportFHIR};
})();
