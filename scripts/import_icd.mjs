import fs from "fs";
const file = process.argv[2];
if(!file){ console.error("usage: node scripts/import_icd.mjs <csvfile>"); process.exit(1); }
const csv = fs.readFileSync(file, "utf8");
const r = await fetch("http://localhost:5050/api/icd-import-csv", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ csv, mode: "replace" })
});
const j = await r.json();
console.log(JSON.stringify(j, null, 2));
