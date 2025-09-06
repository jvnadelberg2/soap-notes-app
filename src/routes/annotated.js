import express from 'express';

const router = express.Router();

const MODEL_API_URL = process.env.MODEL_API_URL || 'http://localhost:11434/v1/chat/completions';
const DEFAULT_MODEL = process.env.MODEL_NAME || 'llama3.1:8b';

function buildMessages(payload){
  const p = payload || {};
  const s = p.subjective || {};
  const o = p.objective || {};
  const v = o.vitals || {};

  // ROS is Subjective; accept legacy objective.ros fallback
  const ros = s.ros || s.ROS || o.ros || o.ROS || '';

  const system = 'You are a clinical assistant generating concise Assessment and Plan for a SOAP note. Return ONLY JSON with keys: assessment, plan.';

  const user = JSON.stringify({
    instruction: 'Use the provided Subjective and Objective to create Assessment and Plan.',
    subjective: {
      chief_complaint: s.chief_complaint || '',
      hpi: s.hpi || '',
      pmh: s.pmh || '',
      fh:  s.fh  || '',
      sh:  s.sh  || '',
      ros
    },
    objective: {
      vitals: {
        bp: v.bp || '', hr: v.hr || '', rr: v.rr || '',
        temp: v.temp || '', weight: v.weight || '', o2_sat: v.o2_sat || ''
      },
      diagnostics: o.diagnostics || '',
      exam: o.exam || ''
    }
  });

  return [{ role:'system', content:system }, { role:'user', content:user }];
}

async function callModel(payload){
  const model = (payload?.meta?.model) || DEFAULT_MODEL;
  const body = { model, messages: buildMessages(payload), temperature: 0.2, stream: false };

  const res = await fetch(MODEL_API_URL, {
    method:'POST',
    headers:{ 'content-type':'application/json' },
    body: JSON.stringify(body)
  });
  if (!res.ok){
    const txt = await res.text().catch(()=> '');
    throw new Error(`upstream ${res.status}: ${txt.slice(0,200)}`);
  }
  const json = await res.json();
  const content = json?.choices?.[0]?.message?.content || '';
  let parsed = { assessment:'', plan:'' };
  if (typeof content === 'string' && content){
    try { parsed = JSON.parse(content); }
    catch {
      const a = content.indexOf('{'); const b = content.lastIndexOf('}');
      if (a >= 0 && b > a) parsed = JSON.parse(content.slice(a,b+1));
    }
  }
  return {
    assessment: (parsed.assessment || '').toString(),
    plan:       (parsed.plan || '').toString()
  };
}

router.post('/generate-soap-json-annotated', async (req,res) => {
  try{
    const payload = req.body || {};
    let ap = { assessment:'', plan:'' };
    try { ap = await callModel(payload); } catch { ap = { assessment:'', plan:'' }; }

    const subj = payload.subjective || {};
    const obj  = payload.objective  || {};
    const vit  = obj.vitals || {};

    // Return with ROS under Subjective
    res.json({
      Subjective: {
        chief_complaint: subj.chief_complaint || '',
        hpi: subj.hpi || '',
        pmh: subj.pmh || '',
        fh:  subj.fh  || '',
        sh:  subj.sh  || '',
        ros: subj.ros || ''
      },
      Objective: {
        vitals: {
          bp: vit.bp || '', hr: vit.hr || '', rr: vit.rr || '',
          temp: vit.temp || '', weight: vit.weight || '', o2_sat: vit.o2_sat || ''
        },
        diagnostics: obj.diagnostics || '',
        exam: obj.exam || ''
      },
      Assessment: ap.assessment,
      Plan: ap.plan
    });
  }catch{
    res.status(500).json({ error:'failed to generate soap' });
  }
});

export default router;

