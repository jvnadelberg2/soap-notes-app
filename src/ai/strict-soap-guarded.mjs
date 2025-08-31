function s(v){return typeof v==="string"?v.trim():""}
function norm(v){const x=s(v)||"";return /not provided/i.test(x)?"":x}
function normArr(v){
  if(Array.isArray(v)) return v.map(norm).filter(Boolean)
  if(typeof v==="string"){const x=norm(v);return x?[x]:[]}
  return []
}
export async function generateStrictSoap(payload={}){
  const subjective = norm(payload.subjective ?? payload.complaint ?? "")
  const objective = norm(payload.objective ?? "")
  const assessment = norm(payload.assessment ?? "")
  const plan = normArr(payload.plan)
  const icd10 = Array.isArray(payload.icd10) ? payload.icd10.filter(x=>typeof x==="string"&&x.trim()) : []
  return {
    soap:{ subjective, objective, assessment, plan },
    icd10
  }
}
