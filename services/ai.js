import axios from "axios";

// Map specialties to complexity levels to control AI output depth
const complexityLevels = {
  "Cardiology": "high",
  "Dermatology": "medium",
  "Psychiatry": "high",
  "Pediatrics": "medium",
  "General Practice": "low",
};

export async function generateSoapNote(rawText, patientHistory = "", specialty = "General Practice") {
  const complexity = complexityLevels[specialty] || "medium";

  const prompt = `
  You are an AI medical assistant specializing in **${specialty}**.
  Complexity level: ${complexity}.

  Generate a SOAP note based on the following patient data.
  For high-complexity specialties, include relevant labs, risk scoring, and differentials.
  For lower complexity, keep the notes concise and focused.

  --- Patient History ---
  ${patientHistory}

  --- Current Visit Notes ---
  ${rawText}

  Provide the result in the following strict format:

  Subjective:
  Objective:
  Assessment:
  Plan:
  `;

  const response = await axios.post("http://localhost:11434/api/generate", {
    model: "llama3", // You can replace this with another Ollama model if needed
    prompt,
    stream: false
  });

  return response.data.response;
}

