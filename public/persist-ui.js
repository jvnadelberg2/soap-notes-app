(function(){
  var keys={
    provider:'clinician.provider',
    credentials:'clinician.credentials',
    npi:'clinician.npi',
    clinic:'clinician.clinic',
    providerLocation:'clinician.location',
    specialty:'workflow.specialty',
    assistLevel:'workflow.assistLevel',
    redact:'workflow.redact',
    noteType:'workflow.noteType',
    modelName:'workflow.modelName'
  };

  function save(id,key,isBool){
    var el=document.getElementById(id);if(!el)return;
    var v=isBool?!!el.checked:(el.value||"");
    try{localStorage.setItem(key,JSON.stringify(v))}catch(e){}
  }

  function load(id,key,isBool){
    var el=document.getElementById(id);if(!el)return;
    try{
      var v=localStorage.getItem(key);if(v==null)return;
      var parsed=JSON.parse(v);
      if(isBool){el.checked=!!parsed}else{el.value=parsed||""}
    }catch(e){}
  }

  function bindPersist(id,key,isBool){
    var el=document.getElementById(id);if(!el)return;
    el.addEventListener('change',function(){save(id,key,isBool)},{passive:true});
  }

  async function populateSpecialty(){
    var sel=document.getElementById('specialty'); if(!sel) return;
    sel.innerHTML="";
    var list=[];
    try{
      var r=await fetch('/api/specialties'); 
      if(r.ok){ var j=await r.json(); if(j&&Array.isArray(j.specialties)) list=j.specialties; }
    }catch(e){}
    if(!list.length){
      list=["General Practice","Family Medicine Physician","Internal Medicine Physician","Pediatrician","Cardiologist","Endocrinologist","Gastroenterologist","Pulmonologist","Psychiatrist","Dermatologist"];
    }
    list.forEach(function(name){
      var o=document.createElement('option'); o.value=name; o.textContent=name; sel.appendChild(o);
    });
    var saved=localStorage.getItem(keys.specialty);
    if(saved){ try{ saved=JSON.parse(saved)||""; if(saved && [].some.call(sel.options,function(o){return o.value===saved})) sel.value=saved; }catch(e){} }
    sel.addEventListener('change',function(){ try{localStorage.setItem(keys.specialty,JSON.stringify(sel.value||""))}catch(e){} }, {passive:true});
    window.getSpecialty=function(){ return sel.value||""; };
  }

  function onReady(fn){ if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded',fn,{once:true})} else {fn()} }

  onReady(function(){
    load('noteType',keys.noteType,false);
    load('provider',keys.provider,false);
    load('credentials',keys.credentials,false);
    load('npi',keys.npi,false);
    load('clinic',keys.clinic,false);
    load('providerLocation',keys.providerLocation,false);
    load('redact',keys.redact,true);
    load('assistLevel',keys.assistLevel,false);
    var m=localStorage.getItem(keys.modelName); if(m){ try{ m=JSON.parse(m)||""; var selM=document.getElementById('llmModel'); if(selM){ selM.value=m } }catch(e){} }

    bindPersist('noteType',keys.noteType,false);
    bindPersist('provider',keys.provider,false);
    bindPersist('credentials',keys.credentials,false);
    bindPersist('npi',keys.npi,false);
    bindPersist('clinic',keys.clinic,false);
    bindPersist('providerLocation',keys.providerLocation,false);
    bindPersist('redact',keys.redact,true);
    bindPersist('assistLevel',keys.assistLevel,false);

    populateSpecialty();
  });
})();