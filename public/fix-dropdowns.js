(function(){
  function $(id){return document.getElementById(id)}
  function v(o){return String((o&&(o.value||o.textContent))||'').trim()}
  function setOptions(sel,list){
    if(!sel)return;
    var keep=v(sel.options[sel.selectedIndex||0]);
    sel.innerHTML='';
    var f=document.createDocumentFragment();
    var first=document.createElement('option');first.value='';first.textContent='Choose...';f.appendChild(first);
    var seen=new Set();
    (list||[]).forEach(function(x){
      x=String(x||'').trim(); if(!x)return;
      var k=x.toLowerCase(); if(seen.has(k))return; seen.add(k);
      var o=document.createElement('option');o.value=x;o.textContent=x;f.appendChild(o);
    });
    sel.appendChild(f);
    if(keep) choose(sel,keep);
  }
  function choose(sel,val){
    var want=String(val||'').toLowerCase();
    for(var i=0;i<sel.options.length;i++){ if(v(sel.options[i]).toLowerCase()===want){ sel.selectedIndex=i; return } }
    sel.selectedIndex=Math.min(1,sel.options.length-1);
  }
  function relaxOverflow(n){
    var p=n&&n.parentElement;
    while(p){ try{ if(getComputedStyle(p).overflow!=='visible') p.style.overflow='visible' }catch(e){} p=p.parentElement }
  }
  async function j(u){
    try{
      var r=await fetch(u,{headers:{Accept:'application/json'},cache:'no-store'});
      if(!r.ok)throw 0; return await r.json();
    }catch(e){return null}
  }
  function toList(x,prop){
    if(!x)return[];
    if(Array.isArray(x))return x.map(String);
    if(prop&&Array.isArray(x[prop]))return x[prop].map(String);
    if(Array.isArray(x.data))return x.data.map(String);
    return [];
  }
  function save(k,vv){try{sessionStorage.setItem(k,String(vv||''))}catch(e){}}
  function load(k){try{return sessionStorage.getItem(k)||''}catch(e){return''}}
  async function run(){
    var m=$('model'), s=$('specialty');
    if(m) relaxOverflow(m);
    if(s) relaxOverflow(s);
    if(m){
      var mj=await j('/api/models');
      var ml=toList(mj,'models');
      if(!ml.length) ml=['ollama/llama3.1:8b','ollama/llama3.1:13b','gpt-4o-mini'];
      setOptions(m,ml);
      var wantM=load('sel:model'); if(wantM) choose(m,wantM);
      m.addEventListener('change',function(){save('sel:model',m.value)},true);
    }
    if(s){
      var sj=await j('/api/specialties');
      var sl=toList(sj,'specialties');
      if(!sl.length) sl=['General Practice','Internal Medicine','Family Medicine','Cardiology','Gastroenterology','Psychiatry','Urology'];
      setOptions(s,sl);
      var wantS=load('sel:specialty'); if(wantS) choose(s,wantS);
      s.addEventListener('change',function(){save('sel:specialty',s.value)},true);
    }
  }
  function start(){
    var tries=0; var t=setInterval(function(){ run(); if(++tries>=12) clearInterval(t) },300);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start,{once:true}); else start();
})();
