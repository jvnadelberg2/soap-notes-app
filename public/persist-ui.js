(function(){
  function q(id){return document.getElementById(id)||document.querySelector('[name="'+id+'"]')}
  function kSel(id){return 'sel:'+id}
  function kChk(id){return 'chk:'+id}
  function kTxt(id){return 'txt:'+id}

  function getSel(id){try{return localStorage.getItem(kSel(id))||''}catch(e){return''}}
  function putSel(id,v){try{localStorage.setItem(kSel(id),String(v||''))}catch(e){}}

  function getChk(id){try{return localStorage.getItem(kChk(id))}catch(e){return null}}
  function putChk(id,on){try{localStorage.setItem(kChk(id),on?'1':'0')}catch(e){}}

  function getTxt(id){
    try{
      var v=localStorage.getItem(kTxt(id));
      if(v===null && id==='clinic'){
        var old=localStorage.getItem('txt:practice');
        if(old!==null){ localStorage.setItem(kTxt('clinic'),old); try{localStorage.removeItem('txt:practice')}catch(e){}; return old; }
      }
      if(v===null && id==='provider'){
        var old2=localStorage.getItem('txt:clinician');
        if(old2!==null){ localStorage.setItem(kTxt('provider'),old2); try{localStorage.removeItem('txt:clinician')}catch(e){}; return old2; }
      }
      return v;
    }catch(e){ return null }
  }
  function putTxt(id,v){
    try{
      localStorage.setItem(kTxt(id),String(v||''));
      if(id==='clinic'){ try{localStorage.removeItem('txt:practice')}catch(e){} }
      if(id==='provider'){ try{localStorage.removeItem('txt:clinician')}catch(e){} }
    }catch(e){}
  }

  function applySelect(el,id){
    if(!el) return false;
    var want=getSel(id); if(!want) return false;
    var wantL=String(want).toLowerCase();
    for(var i=0;i<el.options.length;i++){
      var v=String(el.options[i].value||'').toLowerCase();
      if(v===wantL){ el.selectedIndex=i; return true }
    }
    return false;
  }
  function persistSelect(id){
    var el=q(id); if(!el) return;
    applySelect(el,id);
    var tries=0, t=setInterval(function(){ if(applySelect(el,id)||++tries>=80) clearInterval(t) },50);
    var mo=new MutationObserver(function(){ applySelect(el,id) });
    mo.observe(el,{childList:true});
    el.addEventListener('change',function(){ putSel(id,el.value) },true);
    if(!getSel(id) && el.value) putSel(id,el.value);
  }

  function persistCheckbox(id){
    var el=q(id); if(!el) return;
    var v=getChk(id); if(v!==null) el.checked=(v==='1');
    var tries=0, t=setInterval(function(){ if(++tries>=10){ clearInterval(t); return } var vv=getChk(id); if(vv!==null) el.checked=(vv==='1') },50);
    el.addEventListener('change',function(){ putChk(id,el.checked) },true);
    if(getChk(id)===null) putChk(id,el.checked);
  }

  function persistTextSmart(storeKey, candidates){
    var el=null;
    for(var i=0;i<candidates.length;i++){ el=q(candidates[i]); if(el) break; }
    if(!el) return;
    var v=getTxt(storeKey);
    if(v!==null && el.value!==v) el.value=v;
    var tries=0, t=setInterval(function(){
      var vv=getTxt(storeKey);
      if(vv!==null && el.value!==vv){ el.value=vv; clearInterval(t) }
      if(++tries>=80) clearInterval(t);
    },50);
    el.addEventListener('input',function(){ putTxt(storeKey,el.value) },true);
    el.addEventListener('change',function(){ putTxt(storeKey,el.value) },true);
    if(getTxt(storeKey)===null) putTxt(storeKey,el.value);
  }

  function start(){
    persistSelect('model');
    persistSelect('specialty');
    persistCheckbox('allowInference');
    persistTextSmart('provider',['provider','clinician']);
    persistTextSmart('clinic',['clinic','practice','clinicName','practiceName']);
  }

  if(document.readyState==='complete'){ start() } else { window.addEventListener('load',start,{once:true}) }
})();
