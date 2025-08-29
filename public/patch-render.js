(function(){
  function makeRendered(obj){
    const S = obj?.Subjective || "Not provided";
    const O = obj?.Objective  || "Not provided";
    const A = obj?.Assessment || "Not provided";
    const P = obj?.Plan       || "Not provided";
    return ["Subjective:", S, "", "Objective:", O, "", "Assessment:", A, "", "Plan:", P].join("\n");
  }
  function ensureUI(){
    const pre = document.getElementById("jsonOut");
    if (!pre || pre.__patched) return;
    pre.__patched = true;
    const wrap = pre.parentElement;
    const bar = document.createElement("div");
    bar.style.display = "flex";
    bar.style.gap = "8px";
    bar.style.margin = "0 0 8px 0";
    const bJSON = document.createElement("button");
    bJSON.textContent = "JSON";
    bJSON.className = "button";
    const bRendered = document.createElement("button");
    bRendered.textContent = "Rendered";
    bRendered.className = "button accent";
    bar.appendChild(bJSON);
    bar.appendChild(bRendered);
    wrap.insertBefore(bar, pre);
    const rendered = document.createElement("pre");
    rendered.id = "renderedOut";
    rendered.style.display = "none";
    wrap.appendChild(rendered);
    function show(which){
      pre.style.display = which === "json" ? "block" : "none";
      rendered.style.display = which === "rendered" ? "block" : "none";
      bJSON.className = "button" + (which==="json" ? " primary" : "");
      bRendered.className = "button" + (which==="rendered" ? " primary" : " accent");
    }
    bJSON.addEventListener("click", ()=>show("json"));
    bRendered.addEventListener("click", ()=>show("rendered"));
    const obs = new MutationObserver(()=>{
      const txt = pre.textContent.trim();
      try { rendered.textContent = makeRendered(JSON.parse(txt)); } catch(_) {}
    });
    obs.observe(pre, { childList:true, characterData:true, subtree:true });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", ensureUI);
  else ensureUI();
})();
