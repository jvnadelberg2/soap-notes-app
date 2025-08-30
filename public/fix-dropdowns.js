(async function () {
  async function jget(url) {
    const r = await fetch(url, { headers: { Accept: "application/json" }, cache: "no-store" });
    if (!r.ok) throw new Error("GET " + url + " " + r.status);
    return r.json();
  }
  function setOptions(sel, arr, selected) {
    if (!sel) return;
    sel.innerHTML = "";
    arr.forEach(v => {
      const o = document.createElement("option");
      o.value = v; o.textContent = v;
      if (selected && selected === v) o.selected = true;
      sel.appendChild(o);
    });
  }

  async function loadModels() {
    const sel = document.querySelector("#model");
    if (!sel) return;
    try {
      const j = await jget("/api/models");
      const list = Array.isArray(j?.models) && j.models.length ? j.models : ["llama3"];
      setOptions(sel, list, list[0]);
      const hint = document.querySelector("#modelHint");
      if (hint) hint.textContent = list.length + " models available";
    } catch {
      setOptions(sel, ["llama3"], "llama3");
      const hint = document.querySelector("#modelHint");
      if (hint) hint.textContent = "1 model available";
    }
  }

  async function loadSpecialties() {
    const sel = document.querySelector("#specialty");
    if (!sel) return;
    try {
      const j = await jget("/api/specialties");
      const list = Array.isArray(j?.specialties) ? j.specialties.slice().sort((a,b)=>a.localeCompare(b)) : ["General Practice"];
      setOptions(sel, list, list[0] || "General Practice");
      const spec = document.querySelector("#specCount");
      if (spec) spec.textContent = list.length + " specialties loaded (alphabetical)";
    } catch {
      setOptions(sel, ["General Practice"], "General Practice");
      const spec = document.querySelector("#specCount");
      if (spec) spec.textContent = "1 specialty loaded";
    }
  }

  /* PERSISTENCE v1 */
  const PREF_KEY='soapUI.prefs.v1';
  function loadPrefs(){ try{return JSON.parse(localStorage.getItem(PREF_KEY)||'{}')}catch{return{}} }
  function savePrefs(next){ localStorage.setItem(PREF_KEY, JSON.stringify(Object.assign(loadPrefs(), next||{}))); }
  function applyPrefs(){
    const p=loadPrefs();
    const m=document.querySelector('#model');
    const sp=document.querySelector('#specialty');
    const ai=document.querySelector('#allowInference');
    const icd=document.querySelector('#includeICD');
    if(m && p.model && Array.from(m.options).some(o=>o.value===p.model)) m.value=p.model;
    if(sp && p.specialty && Array.from(sp.options).some(o=>o.value===p.specialty)) sp.value=p.specialty;
    if(ai!=null && typeof p.allowInference==='boolean') ai.checked=p.allowInference;
    if(icd!=null && typeof p.includeICD==='boolean') icd.checked=p.includeICD;
  }
  document.addEventListener("DOMContentLoaded", async () => {
    await loadModels();
    await loadSpecialties();
    applyPrefs();
    const m=document.querySelector('#model');        if(m)  m.addEventListener('change', ()=>savePrefs({model:m.value}));
    const sp=document.querySelector('#specialty');   if(sp) sp.addEventListener('change', ()=>savePrefs({specialty:sp.value}));
    const ai=document.querySelector('#allowInference'); if(ai) ai.addEventListener('change', ()=>savePrefs({allowInference:ai.checked}));
    const icd=document.querySelector('#includeICD'); if(icd) icd.addEventListener('change', ()=>savePrefs({includeICD:icd.checked}));
  });
})();
