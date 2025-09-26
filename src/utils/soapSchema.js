export const soapSchema = {
  type: "object",
  additionalProperties: false,
  required: ["Subjective","Objective","Assessment","Plan"],
  properties: {
    Subjective: { type: "string" },
    Objective:  { type: "string" },
    Assessment: { type: "string" },
    Plan:       { type: "string" }
  }
};
