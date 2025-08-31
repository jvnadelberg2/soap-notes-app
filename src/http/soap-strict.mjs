import { Router } from "express"

const router = Router()

const s = v => typeof v === "string" ? v.trim() : ""
const norm = v => {
  const x = s(v)
  return /not provided/i.test(x) ? "" : x
}
const normArr = v => {
  if (Array.isArray(v)) return v.map(x => s(x)).filter(Boolean)
  if (typeof v === "string") { const x = s(v); return x ? [x] : [] }
  return []
}

// STRICT: Build output ONLY from request body. Never add fields.
// Allowed inputs: complaint | subjective | objective | assessment | plan | icd10
router.post("/", async (req, res) => {
  try {
    const p = req.body || {}
    const subjective = norm(p.subjective ?? p.complaint ?? "")
    const objective = norm(p.objective ?? "")
    const assessment = norm(p.assessment ?? "")
    const plan = normArr(p.plan)
    const icd10 = Array.isArray(p.icd10) ? p.icd10.filter(x => typeof x === "string" && x.trim()) : []

    const out = {
      soap: { subjective, objective, assessment, plan },
      icd10
    }
    // No extras. Explicitly ensure no vitals/comorbidities keys leak.
    res.status(200).json(out)
  } catch {
    res.status(500).json({ error: "strict_soap_failed" })
  }
})

export default router
