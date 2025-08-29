import fs from "fs";
import path from "path";

export function getSpecialtiesMap() {
  const p = path.join(process.cwd(), "data", "specialties.json");
  try {
    const raw = fs.readFileSync(p, "utf8");
    const obj = JSON.parse(raw);
    return obj && typeof obj === "object" ? obj : {};
  } catch {
    return {};
  }
}

export function getSpecialtiesList() {
  return Object.keys(getSpecialtiesMap()).sort((a, b) => a.localeCompare(b));
}

export function getSpecialtyConfig(name) {
  const m = getSpecialtiesMap();
  return m[name] || null;
}
