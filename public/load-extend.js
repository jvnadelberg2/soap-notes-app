(function(){
  function g(id){return document.getElementById(id)}
  function set(id,val){var el=g(id);if(el)el.value=val||''}
  window.loadNote=async function(id){
    try{
      var r=await fetch('/api/notes/'+encodeURIComponent(id));
      var j=await r.json().catch(function(){return{}});
      var n=j.note||{};
      set('patient',n.patient);set('patientName',n.patientName);set('mrn',n.mrn);set('dob',n.dob);set('sex',n.sex);
      set('provider',n.provider);set('credentials',n.credentials);set('clinic',n.clinic);set('npi',n.npi);
      set('location',n.location);set('specialty',n.specialty);set('allergies',n.allergies);set('medications',n.medications);
      var ui=g('useInference'); if(ui){if(ui.type==='checkbox')ui.checked=!!n.useInference;else ui.value=n.useInference?'true':'false'}
      var pre=g('soapTextOut'); if(pre&&n.text) pre.textContent=String(n.text);
      var u=g('current-note-uuid'); if(!u){u=document.createElement('input');u.type='hidden';u.id='current-note-uuid';document.body.appendChild(u)}; if(j.uuid) u.value=j.uuid;
    }catch(e){}
  };
})();
