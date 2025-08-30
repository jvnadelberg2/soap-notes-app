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

  document.addEventListener("DOMContentLoaded", async () => {
    await loadModels();
    await loadSpecialties();
  });
})();
