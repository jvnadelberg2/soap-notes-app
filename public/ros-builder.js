/* /ros-builder.js — v6 (no DOM injection, just wiring) */
(function(){
  "use strict";

  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
  const rosTextarea = () => document.getElementById("ros");

  function systems() {
    return $$(".ros-row").map(row => {
      const name = row.getAttribute("data-sys");
      const neg = $(".ros-neg", row);
      const pos = $(".ros-pos", row);
      return { name, neg, pos };
    });
  }

  function buildRosString() {
    const parts = [];
    systems().forEach(({name, neg, pos}) => {
      const txt = (pos.value || "").trim();
      if (neg.checked && !txt) {
        parts.push(`${name}: negative.`);
      } else if (txt) {
        parts.push(`${name}: ${txt.replace(/\s*[.;]\s*$/,'')}.`);
      } else {
        // explicitly not negative and no positives
        parts.push(`${name}: not assessed.`);
      }
    });
    return `ROS: ${parts.join("\n")}`;
  }

  function setRos(val, {append=false}={}) {
    const ta = rosTextarea();
    if (!ta) return;
    if (append && ta.value.trim()) {
      ta.value = `${ta.value.replace(/\s+$/,'')}\n${val}`;
    } else {
      ta.value = val;
    }
    ta.dispatchEvent(new Event("input", {bubbles:true}));
  }

  function allNegative() {
    systems().forEach(({neg, pos}) => { neg.checked = true; pos.value = ""; });
    setRos(buildRosString(), {append:false});
  }

  function clearBuilder() {
    systems().forEach(({neg, pos}) => { neg.checked = true; pos.value = ""; });
    setRos("", {append:false});
  }

  function bind() {
    const qb = document.getElementById("rosQuickBuilder");
    if (!qb || qb.dataset.bound === "1") return;
    qb.dataset.bound = "1";

    $("#rosAllNeg").addEventListener("click", (e)=>{ e.preventDefault(); allNegative(); });
    $("#rosReplace").addEventListener("click", (e)=>{ e.preventDefault(); setRos(buildRosString(), {append:false}); });
    $("#rosInsert").addEventListener("click", (e)=>{ e.preventDefault(); setRos(buildRosString(), {append:true}); });
    $("#rosClear").addEventListener("click", (e)=>{ e.preventDefault(); clearBuilder(); });

    // If user edits any builder field, keep textarea in sync (replace mode)
    systems().forEach(({neg,pos}) => {
      neg.addEventListener("change", ()=> setRos(buildRosString(), {append:false}));
      pos.addEventListener("input", ()=> setRos(buildRosString(), {append:false}));
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", bind);
  } else {
    bind();
  }
})();
