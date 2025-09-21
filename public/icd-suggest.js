"use strict";

// ------------------ Helpers ------------------

function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

// ------------------ ICD Search ------------------

async function searchICD() {
  const query = val("icdSearch");
  if (!query) return;

  const resultsBox = document.getElementById("icd-box");
  resultsBox.value = "Searching...";
  try {
    const res = await fetch(`/api/icd/search?q=${encodeURIComponent(query)}&limit=500`);
    const data = await res.json();

    resultsBox.value = "";
    if (!data || !data.results || !data.results.length) {
      resultsBox.value = "No results found.";
      return;
    }

    // Clear old interactive results
    const containerId = "icd-results-container";
    let container = document.getElementById(containerId);
    if (container) container.remove();

    container = document.createElement("div");
    container.id = containerId;
    container.style.marginTop = "8px";
    container.style.maxHeight = "300px";
    container.style.overflowY = "auto";
    container.style.border = "1px solid #ccc";
    container.style.padding = "6px";
    container.style.borderRadius = "6px";
    resultsBox.insertAdjacentElement("afterend", container);

    data.results.forEach(r => {
      const item = document.createElement("div");
      item.textContent = `${r.code} — ${r.description}`;
      item.style.cursor = "pointer";
      item.style.padding = "4px 6px";
      item.style.borderBottom = "1px solid #eee";

      item.addEventListener("click", () => {
        const out = document.getElementById("icdCodes");
        const current = out.value.trim();
        const line = `${r.code} — ${r.description}`;
        out.value = current ? `${current}\n${line}` : line;
      });

      item.addEventListener("mouseover", () => {
        item.style.background = "#f5f5f5";
      });
      item.addEventListener("mouseout", () => {
        item.style.background = "transparent";
      });

      container.appendChild(item);
    });
  } catch (e) {
    console.error("ICD search failed:", e);
    resultsBox.value = "Error performing search.";
  }
}

document.getElementById("searchIcdBtn")?.addEventListener("click", (e) => {
  e.preventDefault();
  searchICD();
});