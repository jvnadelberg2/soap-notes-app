document.addEventListener('DOMContentLoaded',function(){
  var btn=document.getElementById('btnClear');
  if(!btn) return;
  if(btn.dataset.boundPatientClear==='1') return;
  btn.dataset.boundPatientClear='1';
  function clearField(id){
    var el=document.getElementById(id);
    if(!el) return;
    el.value='';
    try{el.dispatchEvent(new Event('input',{bubbles:true}))}catch(e){}
    try{el.dispatchEvent(new Event('change',{bubbles:true}))}catch(e){}
  }
  btn.addEventListener('click',function(){
    ['patient','mrn','dob','sex','icd10'].forEach(clearField);
  },true);
});
