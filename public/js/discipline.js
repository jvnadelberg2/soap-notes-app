(function(){
  async function populate(){
    var sel=document.getElementById('discipline');
    if(!sel) return;
    sel.innerHTML='';
    var ph=document.createElement('option');
    ph.value=''; ph.textContent='— Select discipline / role —';
    sel.appendChild(ph);
    try{
      var r=await fetch('/disciplines.json',{cache:'no-store'});
      var data=await r.json();
      (data||[]).forEach(function(grp){
        var og=document.createElement('optgroup');
        og.label=grp.label||'';
        var items=(grp.options||[]).slice().sort(function(a,b){
          return String(a.label||'').localeCompare(String(b.label||'')); });
        items.forEach(function(it){
          var o=document.createElement('option');
          o.value=it.value||'';
          o.textContent=it.label||it.value||'';
          og.appendChild(o);
        });
        sel.appendChild(og);
      });
    }catch(e){}
    var saved=localStorage.getItem('discipline');
    if(saved) sel.value=saved;
    sel.addEventListener('change', function(){
      try{ localStorage.setItem('discipline', sel.value); }catch(e){}
    });
  }
  document.addEventListener('DOMContentLoaded', populate);
})();
