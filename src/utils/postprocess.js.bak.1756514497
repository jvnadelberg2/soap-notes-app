function toKVLines(obj) {
  if (!obj || typeof obj !== "object") return null;
  const keys = Object.keys(obj);
  if (!keys.length) return null;
  return keys.map(k => `${k}=${String(obj[k])}`).join(", ");
}
function mentionsVitals(text) {
  if (!text) return false;
  return /(vitals?:|blood\s*pressure|bp\b|heart\s*rate|hr\b|resp(iratory)?\s*rate|rr\b|spo2)/i.test(text);
}
function mentionsLabs(text) {
  if (!text) return false;
  return /(labs?:|troponin|cbc|cmp|a1c|ldl|hdl|creatinine|bun|tsh|t4)/i.test(text);
}
export function enrichObjective(json, { vitals, labs, imaging }) {
  const parts = [];
  const baseObj = (json?.Objective || "").trim();
  const baseIsNP = /^not provided$/i.test(baseObj);
  if (baseObj && !baseIsNP) parts.push(baseObj);

  const vitalsLine = toKVLines(vitals);
  if (vitalsLine && !mentionsVitals(baseObj)) {
    parts.push(`Vitals: ${vitalsLine}`);
  }

  const labsLine = toKVLines(labs);
  if (labsLine && !mentionsLabs(baseObj)) {
    parts.push(`Labs: ${labsLine}`);
  }

  if (Array.isArray(imaging) && imaging.length) {
    const mentionsImaging = /imaging|x-?ray|ct|mri|ultrasound|ecg|echo/i.test(baseObj);
    if (!mentionsImaging) {
      parts.push(`Imaging: ${imaging.map(x => (typeof x === "string" ? x : JSON.stringify(x))).join("; ")}`);
    }
  }

  const merged = parts.join("\n").trim();
  return merged || "Not provided";
}
export function normalizeSOAP(json) {
  const out = { ...json };
  for (const k of ["Subjective","Objective","Assessment","Plan"]) {
    if (!out[k] || typeof out[k] !== "string" || !out[k].trim()) out[k] = "Not provided";
  }
  return out;
}
