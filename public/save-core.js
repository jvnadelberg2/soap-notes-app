(function(){
  function g(id){return document.getElementById(id)}
  function V(id){var el=g(id);if(!el)return'';if(el.type==='checkbox')return!!el.checked;return el.value||''}
  function fmt(){var e=g('noteType')||g('note-format');return((e&&e.value)||'SOAP').toUpperCase()}
  function ensureUUID(){var el=g('current-note-uuid');if(!el){el=document.createElement('input');el.type='hidden';el.id='current-note-uuid';document.body.appendChild(el)};if(!el.value||!el.value.trim()){el.value=(crypto&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2));}return el.value}
  function patientBlock(){return{patient:V('patient'),patientName:V('patientName'),mrn:V('mrn'),dob:V('dob'),sex:V('sex'),provider:V('provider'),credentials:V('credentials'),clinic:V('clinic'),npi:V('npi'),location:V('location'),specialty:V('specialty'),allergies:V('allergies'),medications:V('medications')}}
  async function saveNoteNow(){
    var id=ensureUUID(); if(!id)return;
    var pre=g('soapTextOut'); var text=(pre&&pre.textContent)||'';
    var u=V('useInference'); var useInference=(u===true||u==='true'||u==='on'||u==='1');
    var f=fmt();
    var base=f==='BIRP'
      ? {noteType:'BIRP',birpBehavior:V('birpBehavior'),birpIntervention:V('birpIntervention'),birpResponse:V('birpResponse'),birpPlan:V('birpPlan')}
      : {noteType:'SOAP',chiefComplaint:V('chiefComplaint'),hpi:V('hpi'),pmh:V('pmh'),fh:V('fh'),sh:V('sh'),ros:V('ros'),vitals:{BP:V('vBP'),HR:V('vHR'),RR:V('vRR'),Temp:V('vTemp'),SpO2:V('vSpO2'),Weight:V('vWeight'),Height:V('vHeight')},exam:V('exam'),diagnostics:V('diagnostics'),assessment:V('assessment'),plan:V('plan')};
    var pl=Object.assign({}, base, patientBlock(), {useInference:useInference, text:text});
    try{await fetch('/api/notes/'+encodeURIComponent(id),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(pl)})}catch(e){}
    if(typeof window.refreshList==='function'){try{await window.refreshList()}catch(e){}}
  }
  window.saveNote=saveNoteNow;
  function bindSave(){
    var ids=['btnSave','save','saveNote','btn-save'];
    var el=null; for(var i=0;i<ids.length;i++){var x=g(ids[i]);if(x){el=x;break}}
    if(!el)return;
    var c=el.cloneNode(true); el.replaceWith(c);
    c.addEventListener('click',function(e){e.preventDefault();saveNoteNow()},{passive:false});
  }
  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',bindSave,{once:true})}else{bindSave()}
})();
