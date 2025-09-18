(function(){
  'use strict';
  var LIST = [
    "Addiction Medicine","Adolescent Medicine","Allergy & Immunology","Anesthesiology","Anesthesiology Critical Care",
    "Audiology","Bariatric Surgery","Behavioral Neurology","Breast Surgery","Cardiology","Cardiology—Electrophysiology",
    "Cardiothoracic Surgery","Cardiovascular Surgery","Child & Adolescent Psychiatry","Colon & Rectal Surgery",
    "Complex General Surgical Oncology","Critical Care Medicine","Dermatology","Dermatopathology","Diabetology",
    "Emergency Medicine","Endocrinology","Family Medicine","Female Pelvic Medicine & Reconstructive Surgery",
    "Gastroenterology","General Practice","General Surgery","Geriatric Medicine","Geriatric Psychiatry",
    "Gynecologic Oncology","Hand Surgery","Hematology","Hematology & Oncology","Hepatology","Hospital Medicine",
    "Hospitalist","Infectious Disease","Interventional Cardiology","Interventional Radiology",
    "Internal Medicine","Maternal-Fetal Medicine","Medical Genetics","Medical Oncology","Neonatology",
    "Nephrology","Neurocritical Care","Neurodevelopmental Disabilities","Neurology","Neuromuscular Medicine",
    "Neurological Surgery","Neuroradiology","Nuclear Medicine","Nuclear Radiology","Nurse Practitioner (NP)",
    "Obstetrics & Gynecology","Occupational Medicine","Ophthalmology","Optometry","Oral & Maxillofacial Surgery",
    "Orthopaedic Surgery","Orthopaedic Sports Medicine","Otolaryngology (ENT)","Pain Medicine","Palliative Medicine",
    "Pathology—Anatomic","Pathology—Clinical","Pathology—Forensic","Pediatrics","Pediatric Cardiology",
    "Pediatric Critical Care","Pediatric Endocrinology","Pediatric Gastroenterology","Pediatric Hematology-Oncology",
    "Pediatric Infectious Disease","Pediatric Nephrology","Pediatric Neurology","Pediatric Pulmonology",
    "Pediatric Rheumatology","Pediatric Surgery","Physical Medicine & Rehabilitation","Physician Assistant (PA)",
    "Plastic Surgery","Plastic Surgery—Craniofacial","Podiatry","Preventive Medicine","Primary Care",
    "Psychiatry","Psychology","Pulmonary Disease","Radiation Oncology","Radiology—Diagnostic",
    "Reproductive Endocrinology & Infertility","Rheumatology","Sleep Medicine","Spine Surgery",
    "Sports Medicine","Surgical Critical Care","Thoracic Surgery","Transplant Hepatology","Transplant Surgery",
    "Urgent Care","Urogynecology","Urology","Vascular Medicine","Vascular Neurology","Vascular Surgery",
    "Wound Care","Certified Nurse Midwife (CNM)","Certified Registered Nurse Anesthetist (CRNA)",
    "Clinical Pharmacist","Dietitian/Nutrition","Social Work","Speech-Language Pathology"
  ];

  function fill(){
    var sel = document.getElementById('specialty') || document.getElementById('speciality') || document.getElementById('specialities');
    if(!sel) return;
    sel.innerHTML='';
    var blank=document.createElement('option'); blank.value=''; blank.textContent=''; sel.appendChild(blank);
    for(var i=0;i<LIST.length;i++){ var o=document.createElement('option'); o.value=LIST[i]; o.textContent=LIST[i]; sel.appendChild(o) }
  }

  function init(){
    fill();
    var sel = document.getElementById('specialty') || document.getElementById('speciality') || document.getElementById('specialities');
    if (sel){
      sel.addEventListener('focus', fill, {passive:true});
      sel.addEventListener('mousedown', fill, {passive:true});
    }
  }

  if(document.readyState==='loading'){document.addEventListener('DOMContentLoaded', init, {once:true});} else {init();}
})();
