// ICU templates and dynamic loader
console.log("ICU templates module loaded");

const ICU_TEMPLATES = {
  "ICU Progress": `
    <div class="section icu-sec" id="sec-icu-progress">
      <h3>ICU Progress Note</h3>
      <label for="icuSubjective">Interval Events</label>
      <textarea id="icuSubjective" placeholder="Describe major overnight events, interventions, or changes in status"></textarea>
      <label for="icuObjective">Objective Data</label>
      <textarea id="icuObjective" placeholder="Vitals, ventilator settings, labs, imaging summaries"></textarea>
      <label for="icuAssessment">Assessment</label>
      <textarea id="icuAssessment" placeholder="Brief summary of patient condition and response"></textarea>
      <label for="icuPlan">Plan by System</label>
      <textarea id="icuPlan" placeholder="System-by-system management plan"></textarea>
    </div>
  `,
  "ICU Admission": `
    <div class="section icu-sec" id="sec-icu-admission">
      <h3>ICU Admission Note</h3>
      <label for="icuAdmReason">Reason for ICU Admission / HPI</label>
      <textarea id="icuAdmReason" placeholder="Reason for ICU admission and events prior to transfer"></textarea>
      <label for="icuAdmExam">Initial Objective Findings</label>
      <textarea id="icuAdmExam" placeholder="Vital signs, physical exam, ventilator, lines/tubes, initial labs"></textarea>
      <label for="icuAdmAssessment">Assessment</label>
      <textarea id="icuAdmAssessment" placeholder="Brief summary of critical issues"></textarea>
      <label for="icuAdmPlan">Plan by System</label>
      <textarea id="icuAdmPlan" placeholder="System-based initial management plan"></textarea>
    </div>
  `,
  "ICU Handoff": `
    <div class="section icu-sec" id="sec-icu-handoff">
      <h3>ICU Handoff Note</h3>
      <label for="icuHandoffSummary">Active Problems / Summary</label>
      <textarea id="icuHandoffSummary" placeholder="List active issues and key events since last shift"></textarea>
      <label for="icuHandoffStatus">Current Status</label>
      <textarea id="icuHandoffStatus" placeholder="Current vitals, support, and ongoing therapies"></textarea>
      <label for="icuHandoffTasks">Pending Labs / Tasks</label>
      <textarea id="icuHandoffTasks" placeholder="Pending tests, consults, or interventions"></textarea>
      <label for="icuHandoffNextSteps">Next Steps / Recommendations</label>
      <textarea id="icuHandoffNextSteps" placeholder="What the incoming team should monitor or do next"></textarea>
    </div>
  `,
  "ICU Discharge": `
    <div class="section icu-sec" id="sec-icu-discharge">
      <h3>ICU Discharge Summary</h3>
      <label for="icuDischargeCourse">ICU Course Summary</label>
      <textarea id="icuDischargeCourse" placeholder="Summarize hospital/ICU course, diagnoses, and major events"></textarea>
      <label for="icuDischargeStatus">Status at Transfer</label>
      <textarea id="icuDischargeStatus" placeholder="Clinical condition and support status at discharge"></textarea>
      <label for="icuDischargeFollowup">Follow-Up Plan</label>
      <textarea id="icuDischargeFollowup" placeholder="Follow-up instructions, medications, pending tests, receiving service"></textarea>
    </div>
  `,
  "ICU Procedure": `
    <div class="section icu-sec" id="sec-icu-procedure">
      <h3>ICU Procedure Note</h3>
      <label for="icuProcName">Procedure Name</label>
      <input id="icuProcName" type="text" placeholder="Example: Central Line Insertion" />
      <label for="icuProcIndication">Indication</label>
      <textarea id="icuProcIndication" placeholder="Reason for performing the procedure"></textarea>
      <label for="icuProcDescription">Description / Technique</label>
      <textarea id="icuProcDescription" placeholder="Describe approach, site, instruments, and technique"></textarea>
      <label for="icuProcComplications">Complications / Comments</label>
      <textarea id="icuProcComplications" placeholder="Immediate outcomes, complications, or comments"></textarea>
    </div>
  `
};

export function loadICUSection(noteType) {
  const container = document.getElementById("icuContainer");
  if (!container) return;

  const html = ICU_TEMPLATES[noteType] || "";
  container.innerHTML = html;
  container.style.display = html ? "" : "none";
}