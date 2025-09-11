/* BEGIN:ARCH-COMMENT
File: public/discipline-loader.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
(function(){
  function byId(id){ return document.getElementById(id); }
  function addOpt(sel,label){ if(!label) return; var o=document.createElement('option'); o.value=label; o.textContent=label; sel.appendChild(o); }

  function flatNames(data){
    var arr = Array.isArray(data) ? data
            : (Array.isArray(data && data.disciplines) ? data.disciplines
            :  (Array.isArray(data && data.data) ? data.data : []));
    var out=[];
    for(var i=0;i<arr.length;i++){
      var it=arr[i];
      if(typeof it==='string'){ var s=it.trim(); if(s) out.push(s); continue; }
      if(it && typeof it==='object'){
        var cand = it.name || it.label || it.title || it.discipline || it.value || it.text || it.displayName || it.alias || it.short || it.id;
        if(!cand){
          for(var k in it){ if(typeof it[k]==='string' && it[k].trim()){ cand=it[k].trim(); break; } }
        }
        if(cand){ out.push(String(cand).trim()); }
      }
    }
    // de-dupe
    var seen={}, uniq=[];
    for(var j=0;j<out.length;j++){ var v=out[j]; if(v && !seen[v]){ seen[v]=1; uniq.push(v); } }
    return uniq;
  }

  // allow ONLY clinical roles (positive match)
  var CLINICAL_RE = /\b(physician|doctor|nurse practitioner|nurse\b|rn\b|lpn\b|lvn\b|physician assistant|pa\b|physical therapist|occupational therapist|speech|slp|psycholog|psychiatr|social worker|pharmacist|respiratory therapist|dietiti|dentist|hygienist|chiropract|podiat|midwife|paramedic|emt\b|medical assistant|radiolog|x-?ray|ultrasound|sonograph|lab tech|phlebot|audiolog|optomet|ophthalmolog)\b/i;

  async function load(){
    var sel=byId('discipline'); if(!sel) return;
    var saved = localStorage.getItem('discipline') || '';
    var list=[];
    try{
      var r=await fetch('/disciplines.json',{cache:'no-store'});
      var j=await r.json();
      list = flatNames(j).filter(function(n){ return CLINICAL_RE.test(n); });
    }catch(e){ list=[]; }

    if(!list.length){
      list=[
        'Physician','Nurse','Nurse Practitioner','Physician Assistant',
        'Physical Therapist','Occupational Therapist','Speech-Language Pathologist',
        'Psychologist','Psychiatrist','Social Worker','Medical Assistant',
        'Pharmacist','Respiratory Therapist','Dietitian','Dentist'
      ];
    }

    list = Array.from(new Set(list)).sort();
    sel.innerHTML='';
    var blank=document.createElement('option'); blank.value=''; blank.textContent=''; sel.appendChild(blank);
    list.forEach(function(n){ addOpt(sel,n); });

    if(saved && Array.prototype.some.call(sel.options, function(o){return o.value===saved;})){
      sel.value=saved;
    }else{
      localStorage.removeItem('discipline');
    }

    sel.addEventListener('change', function(){ localStorage.setItem('discipline', sel.value); });
  }

  // inject discipline into payload + top of Subjective (once)
  var _stringify=JSON.stringify;
  JSON.stringify=function(arg, rep, sp){
    try{
      var sel=byId('discipline'); var d=sel?String(sel.value||'').trim():'';
      if(d && arg && typeof arg==='object'){
        var looksPayload = ('Subjective' in arg) || ('Objective' in arg) || ('Plan' in arg) || ('allowInference' in arg) || ('model' in arg) || ('complaint' in arg);
        if(looksPayload){
          if(!arg.discipline) arg.discipline=d;
          var already=/(^|\n)\s*Discipline\s*:/i;
          if(typeof arg.Subjective==='string'){
            if(!already.test(arg.Subjective)){
              arg.Subjective='Discipline: '+d+(arg.Subjective?'\n'+arg.Subjective:'');
            }
          }else if(typeof arg.body==='string'){
            if(!already.test(arg.body)){
              arg.body='Discipline: '+d+(arg.body?'\n'+arg.body:'');
            }
          }
        }
      }
    }catch(e){}
    return _stringify.call(this,arg,rep,sp);
  };

  document.addEventListener('DOMContentLoaded', load);
})();
