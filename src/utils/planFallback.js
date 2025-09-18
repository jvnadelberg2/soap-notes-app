export function buildConservativePlan({ specialty = "General Practice" } = {}) {
  const common = [
    "Further evaluation based only on provided information.",
    "Obtain/verify vital signs and address abnormalities as indicated.",
    "Consider obtaining appropriate baseline tests related to the presenting complaint.",
    "Provide return/ED precautions for worsening or concerning symptoms."
  ];
  if (/cardio/i.test(specialty)) {
    return [
      ...common,
      "Obtain 12-lead ECG and high-sensitivity troponin per protocol.",
      "Assess cardiovascular risk factors; consider cardiology consultation based on findings.",
      "Counsel on smoking cessation and risk reduction."
    ].join("\n");
  }
  return common.join("\n");
}
