export function buildStrictPromptJSON(ctx) {
  const {
    rawText = "Not provided",
    patientHistory = "Not provided",
    specialty = "General Practice",
    complexity = "medium",
    instructions = "Use general SOAP formatting.",
    vitals,
    labs,
    imaging
  } = ctx;

  const serialize = (x) => {
    if (!x) return "Not provided";
    if (Array.isArray(x)) return x.length ? JSON.stringify(x, null, 2) : "Not provided";
    if (typeof x === "object") return Object.keys(x).length ? JSON.stringify(x, null, 2) : "Not provided";
    return String(x);
  };

  return `You are an AI medical assistant for ${specialty} (complexity: ${complexity}).
Follow these rules:
- Do not fabricate vitals, labs, imaging, ECG, or exam findings.
- If data is missing, write "Not provided".
- Keep content specialty-appropriate and concise.

Instructions:
${instructions}

Patient History:
${patientHistory}

Current Visit Notes:
${rawText}

Vitals (use exactly as given):
${serialize(vitals)}

Labs (use exactly as given):
${serialize(labs)}

Imaging (use exactly as given):
${serialize(imaging)}

Return ONLY valid minified JSON with exactly these keys and no extras:
{"Subjective":"","Objective":"","Assessment":"","Plan":""}`;
}
