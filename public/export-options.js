/* Handles Export PDF action; posts the full note JSON to /export/pdf */
(function(){
  function byId(id){ return document.getElementById(id); }
  function collect(){
    try{
      const raw = localStorage.getItem('note_ui_v2');
      return raw ? JSON.parse(raw) : {};
    }catch(e){ return {}; }
  }
  function postJSON(url, data){
    return fetch(url, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
  }
  document.addEventListener('DOMContentLoaded', ()=>{
    const btn = byId('exportPdf');
    if (!btn) return;
    btn.addEventListener('click', async ()=>{
      const note = collect();
      try{
        const res = await postJSON('/export/pdf', note);
        if (!res.ok){ alert('Export failed'); return; }
        // If server streams PDF, let server handle download; otherwise, try to open
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a'); a.href = url; a.download = 'note.pdf'; a.click();
        setTimeout(()=>URL.revokeObjectURL(url), 5000);
      }catch(e){
        alert('Export error: ' + e.message);
      }
    });
  });
})();