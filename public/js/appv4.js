/* BEGIN:ARCH-COMMENT
File: public/js/appv4.js
Purpose: High-level description of this module in the SOAP/BIRP notes app.
Endpoints: none detected
Exports: none detected
Notes:
Security: Applies middleware where wired; follow immutability rules for finalized notes.
Observability: Increment metrics where relevant; return JSON errors.
END:BEGIN:ARCH-COMMENT */
(function(){
  function id(x){ return document.getElementById(x); }
  function disciplineLabel(){
    var ds = id('discipline');
    var o = ds && ds.selectedOptions && ds.selectedOptions[0];
    return o ? o.textContent : '';
  }
  function normalize(s){ return String(s || "").replace(/\r\n?/g, "\n").trim(); }
  function parseSOAP(raw){
    var t = normalize(raw);
    if(!t) return { S: "", O: "", A: "", P: "" };
    var re = /(^|\n)\s*(subjective|s|objective|o|physical\s*exam|exam|assessment|a|impression|plan|p)\s*:\s*/gi;
    var hits = [], m;
    function toKey(label){
      var L = label.toLowerCase();
      if(L === "subjective" || L === "s") return "S";
      if(L === "objective" || L === "o" || L.indexOf("physical") === 0 || L === "exam") return "O";
      if(L === "assessment" || L === "a" || L === "impression") return "A";
      if(L === "plan" || L === "p") return "P";
      return null;
    }
    while((m = re.exec(t)) !== null){
      var key = toKey(m[2]); if(!key) continue;
      hits.push({ key, labelStart: m.index + m[1].length, contentStart: m.index + m[0].length });
    }
    if(hits.length === 0) return { S: t, O: "", A: "", P: "" };
    hits.sort(function(a,b){ return a.contentStart - b.contentStart; });
    var out = { S: "", O: "", A: "", P: "" };
    var pre = normalize(t.slice(0, hits[0].labelStart));
    if(pre) out.S = pre;
    for(var i=0;i<hits.length;i++){
      var start = hits[i].contentStart;
      var end = (i+1 < hits.length) ? hits[i+1].labelStart : t.length;
      var chunk = normalize(t.slice(start, end));
      if(chunk){
        var k = hits[i].key;
        out[k] = out[k] ? (out[k] + "\n\n" + chunk) : chunk;
      }
    }
    return out;
  }
  function headerLine(){
    var client = id('client') ? id('client').value.trim() : '';
    var dob = id('dob') ? id('dob').value.trim() : '';
    var sex = id('sex') ? id('sex').value.trim() : '';
    var duration = id('duration') ? id('duration').value.trim() : '';
    var disc = disciplineLabel();
    var parts = [];
    if(client) parts.push('Client: ' + client);
    if(dob) parts.push('DOB: ' + dob);
    if(sex) parts.push('Sex: ' + sex);
    if(duration) parts.push('Duration: ' + duration);
    if(disc) parts.push('Discipline: ' + disc);
    return parts.join(' | ');
  }
  function toSOAP(){
    var parsed = parseSOAP(id('note') ? id('note').value : '');
    var S = parsed.S || '(no subjective text)';
    var O = parsed.O || '(objective)';
    var A = parsed.A || '(assessment)';
    var P = parsed.P || '(plan)';
    var lines = [];
    var head = headerLine();
    if(head) lines.push(head);
    lines.push('S: ' + S);
    lines.push('O: ' + O);
    lines.push('A: ' + A);
    lines.push('P: ' + P);
    return lines.join("\n\n");
  }
  function showToast(msg){
    var div = document.createElement('div');
    div.textContent = msg;
    div.style.position = 'fixed';
    div.style.bottom = '20px';
    div.style.right = '20px';
    div.style.background = '#333';
    div.style.color = '#fff';
    div.style.padding = '8px 12px';
    div.style.borderRadius = '6px';
    div.style.fontSize = '14px';
    div.style.zIndex = 9999;
    document.body.appendChild(div);
    setTimeout(function(){ div.style.opacity='0'; }, 1200);
    setTimeout(function(){ div.remove(); }, 1800);
  }
  function onGenerate(){ var so = id('soap'); if(so) so.value = toSOAP(); }
  function onCopy(){
    var t=id('soap'); if(!t||!t.value) return;
    t.select(); try{ document.execCommand('copy'); showToast("Copied!"); }catch(e){}
    window.getSelection().removeAllRanges();
  }
  function onClear(){ if(id('note')) id('note').value=''; if(id('soap')) id('soap').value=''; }
  function onDownloadTxt(){ download('soap_note.txt', 'text/plain;charset=utf-8', id('soap').value || toSOAP()); }
  function onDownloadRtf(){ download('soap_note.rtf', 'application/rtf', toRTF(id('soap').value || toSOAP())); }
  function onPrint(){
    var content = (id('soap').value || toSOAP()).replace(/</g,'&lt;');
    var w = window.open('', '_blank');
    w.document.write('<!doctype html><html><head><meta charset="utf-8"><title>SOAP Note</title><style>body{font-family:Arial,Helvetica,sans-serif;white-space:pre-wrap;line-height:1.35;padding:24px}</style></head><body>'+content+'</body></html>');
    w.document.close(); w.focus(); w.print(); setTimeout(function(){ w.close(); }, 200);
  }
  function download(filename, mime, content){
    var blob = new Blob([content], {type: mime});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 100);
  }
  function toRTF(text){
    function esc(s){ return s.replace(/\\/g,'\\\\').replace(/{/g,'\\{').replace(/}/g,'\\}'); }
    var body = esc(text).replace(/\r?\n\r?\n/g, '\\par\\par ').replace(/\r?\n/g, '\\par ');
    return '{\\rtf1\\ansi\\deff0{\\fonttbl{\\f0 Arial;}}\\f0\\fs22 ' + body + '}';
  }
  function wire(){
    var g=id('generate'), c=id('copy'), x=id('clear');
    var dt=id('downloadTxt'), dr=id('downloadRtf'), pr=id('print');
    if(g) g.addEventListener('click', onGenerate);
    if(c) c.addEventListener('click', onCopy);
    if(x) x.addEventListener('click', onClear);
    if(dt) dt.addEventListener('click', onDownloadTxt);
    if(dr) dr.addEventListener('click', onDownloadRtf);
    if(pr) pr.addEventListener('click', onPrint);
  }
  document.addEventListener('DOMContentLoaded', wire);
})();
(function(){
  var btn = document.getElementById('save-pdf') || document.querySelector('[data-action="save-pdf"]');
  if(!btn) return;
  function val(sel){
    var el = document.querySelector(sel);
    if(!el) return '';
    return (('value' in el ? el.value : el.textContent) || '').trim();
  }
  function findTitle(){
    return val('#note-title') || val('#title') || document.title || 'SOAP Note';
  }
  function findBody(){
    return val('#note-text') || val('#soap') || val('#output') || val('textarea[name="note"]') || val('textarea') || '';
  }
  async function savePdf(){
    var title = findTitle() || 'SOAP Note';
    var filename = (title.replace(/[^A-Za-z0-9._-]/g,'_') || 'soap-note') + '.pdf';
    var body = findBody();
    var res = await fetch('/pdf', {
      method: 'POST',
      headers: { 'Content-Type':'application/json' },
      body: JSON.stringify({ filename: filename, title: title, body: body })
    });
    if(!res.ok) throw new Error('PDF failed: ' + res.status);
    var blob = await res.blob();
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 1000);
  }
  btn.addEventListener('click', function(e){ e.preventDefault(); savePdf().catch(console.error); });
})();
