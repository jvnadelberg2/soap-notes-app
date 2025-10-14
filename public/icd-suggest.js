"use strict";
console.log("icd-suggest.js loaded");

// ------------------ Persistent ICD selection tracker ------------------
const selectedICDs = new Map();

// ------------------ Helpers ------------------
function val(id) {
  const el = document.getElementById(id);
  return el ? el.value.trim() : "";
}

// ------------------ ICD Search ------------------
async function searchICD() {
  const query = val("icdSearch");
  const outBox = document.getElementById("icd-box");
  renderSelected(); // always show current picks

  // 🧹 Remove previous result container if no query
  const containerId = "icd-results-container";
  let container = document.getElementById(containerId);
  if (!query) {
    if (container) container.remove();
    return;
  }

  // Temporary message while fetching
  if (outBox) outBox.placeholder = "Searching ICD codes...";

  try {
    const res = await fetch(`/api/icd/search?q=${encodeURIComponent(query)}&limit=500`);
    const data = await res.json();

    if (outBox) outBox.placeholder = "";

    if (!data || !data.results || !data.results.length) {
      if (outBox) outBox.placeholder = "No results found.";
      return;
    }

    // --- Create / clear results container ---
    const anchor = document.getElementById("icd-box");
    if (!container) {
      container = document.createElement("div");
      container.id = containerId;
      container.style.marginTop = "8px";
      container.style.maxHeight = "300px";
      container.style.overflowY = "auto";
      container.style.border = "1px solid #ccc";
      container.style.padding = "6px";
      container.style.borderRadius = "6px";
      anchor.insertAdjacentElement("afterend", container); // ✅ attach below icd-box
    } else {
      container.innerHTML = "";
    }

    // --- 1️⃣ Selected ICDs Section (always visible in icd-box area) ---
    if (selectedICDs.size > 0) {
      const header = document.createElement("div");
      header.textContent = "Selected Codes:";
      header.style.fontWeight = "bold";
      header.style.marginBottom = "4px";
      container.appendChild(header);

      selectedICDs.forEach((desc, code) => {
        const sel = document.createElement("div");
        sel.textContent = `${code} — ${desc}`;
        sel.style.background = "#cce5ff";
        sel.style.padding = "4px 6px";
        sel.style.marginBottom = "2px";
        sel.style.borderRadius = "4px";
        sel.style.display = "flex";
        sel.style.justifyContent = "space-between";
        sel.style.alignItems = "center";

        // Small remove (✕) button
        const removeBtn = document.createElement("span");
        removeBtn.textContent = "✕";
        removeBtn.style.cursor = "pointer";
        removeBtn.style.marginLeft = "8px";
        removeBtn.style.color = "#444";
        removeBtn.addEventListener("click", () => {
          selectedICDs.delete(code);
          renderSelected();
          searchICD(); // re-render
        });

        sel.appendChild(removeBtn);
        container.appendChild(sel);
      });

      const divider = document.createElement("hr");
      divider.style.margin = "6px 0";
      container.appendChild(divider);
    }

    // --- 2️⃣ Search Results Section ---
    data.results.forEach(r => {
      const code = r.code;
      const desc = r.description || "";
      const line = `${code} — ${desc}`;

      const item = document.createElement("div");
      item.textContent = line;
      item.style.cursor = "pointer";
      item.style.padding = "4px 6px";
      item.style.borderBottom = "1px solid #eee";

      if (selectedICDs.has(code)) {
        item.classList.add("selected");
        item.style.background = "#cce5ff";
      }

      item.addEventListener("click", () => {
        if (selectedICDs.has(code)) {
          selectedICDs.delete(code);
        } else {
          selectedICDs.set(code, desc);
        }
        renderSelected();
        searchICD(); // re-render
      });

      item.addEventListener("mouseover", () => {
        if (!item.classList.contains("selected")) item.style.background = "#f5f5f5";
      });
      item.addEventListener("mouseout", () => {
        if (!item.classList.contains("selected")) item.style.background = "transparent";
      });

      container.appendChild(item);
    });
  } catch (e) {
    console.error("ICD search failed:", e);
    if (outBox) outBox.placeholder = "Error performing search.";
  }
}

// ------------------ Display current ICD selections ------------------
function renderSelected() {
  const outBox = document.getElementById("icd-box");
  if (!outBox) return;
  const lines = [];
  selectedICDs.forEach((desc, code) => lines.push(`${code} — ${desc}`));
  outBox.textContent = lines.join("\n");
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