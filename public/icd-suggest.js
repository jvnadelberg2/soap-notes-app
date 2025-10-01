"use strict";
console.log("icd-suggest.js loaded");

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
  resultsBox.textContent = "Searching...";

  try {
    const res = await fetch(`/api/icd/search?q=${encodeURIComponent(query)}&limit=500`);
    const data = await res.json();

    resultsBox.textContent = "";
    if (!data || !data.results || !data.results.length) {
      resultsBox.textContent = "No results found.";
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

    // Build clickable results
    data.results.forEach(r => {
      const item = document.createElement("div");
      const line = `${r.code} — ${r.description}`;
      item.textContent = line;
      item.style.cursor = "pointer";
      item.style.padding = "4px 6px";
      item.style.borderBottom = "1px solid #eee";

      // 🔹 Toggle select / unselect on click
      item.addEventListener("click", () => {
        const outBox = document.getElementById("icd-box");
        const current = outBox.textContent.split("\n").map(s => s.trim()).filter(Boolean);

        if (item.classList.contains("selected")) {
          // remove highlight and remove line from icd-box
          item.classList.remove("selected");
          item.style.background = "transparent";
          outBox.textContent = current.filter(c => c !== line).join("\n");
        } else {
          // add highlight and insert line into icd-box
          item.classList.add("selected");
          item.style.background = "#cce5ff"; // light blue
          if (!current.includes(line)) {
            outBox.textContent = [...current, line].join("\n");
          }
        }
      });

      // hover effects
      item.addEventListener("mouseover", () => {
        if (!item.classList.contains("selected")) {
          item.style.background = "#f5f5f5";
        }
      });
      item.addEventListener("mouseout", () => {
        if (!item.classList.contains("selected")) {
          item.style.background = "transparent";
        }
      });

      container.appendChild(item);
    });
  } catch (e) {
    console.error("ICD search failed:", e);
    resultsBox.textContent = "Error performing search.";
  }
}

// ------------------ Bind Search ------------------
document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("icdSearch");
  if (search) {
    search.addEventListener("input", () => {
      console.log("ICD search fired:", search.value);
      searchICD();
    });
  }
});