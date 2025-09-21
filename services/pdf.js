'use strict';
const PDFDocument = require('pdfkit');

function textOrBlank(s){var t=(s||'').toString();if(!t.trim())return '\n\n\n\n\n';return t}
function parseSections(noteText){
  var T=(noteText||'').replace(/\r\n/g,'\n')
  function grab(name){
    var re=new RegExp('(?:^|\\n)\\s*'+name+'\\s*:?[ \\t]*\\n([\\s\\S]*?)(?=(?:^|\\n)\\s*(Subjective|Objective|Assessment|Plan)\\s*:?[ \\t]*\\n|$)','i')
    var m=T.match(re);return m?m[1].trim():''
  }
  return {
    subjective:grab('Subjective'),
    objective:grab('Objective'),
    assessment:grab('Assessment'),
    plan:grab('Plan')
  }
}
function drawHeader(doc,p,prov){
  var h1=[]
  var nm=(p&&p.name)||''
  var dob=(p&&p.dob)||''
  var sex=(p&&p.sex)||''
  var mrn=(p&&p.mrn)||''
  h1.push('Patient: '+(nm||'—'))
  h1.push('DOB: '+(dob||'—'))
  h1.push('Sex: '+(sex||'—'))
  h1.push('MRN: '+(mrn||'—'))
  doc.fontSize(10).fillColor('#111').text(h1.join(' • '),{continued:false})
  var now=new Date().toISOString().replace('T',' ').slice(0,16)
  var h2=[]
  var provName=(prov&&prov.name)||''
  var cred=(prov&&prov.credentials)||''
  var npi=(prov&&prov.npi)||''
  var clinic=(prov&&prov.clinic)||''
  h2.push('Visit: '+now)
  h2.push('Provider: '+[provName,cred].filter(Boolean).join(', '))
  if(npi)h2.push('NPI '+npi)
  if(clinic)h2.push('Clinic: '+clinic)
  doc.moveDown(0.2).fontSize(9).fillColor('#444').text(h2.join(' • '))
  doc.moveDown(0.5)
}
function drawWatermark(doc,text){
  var saved=doc._ctm;var w=doc.page.width;var h=doc.page.height
  doc.save();doc.rotate(-30,{origin:[w/2,h/2]}).fontSize(60).fillColor('#eaeaea').opacity(0.6).text(text||'',w/4,h/2,{align:'center'})
  doc.opacity(1).restore();doc._ctm=saved
}
function drawHeading(doc,t){doc.moveDown(0.4);doc.fontSize(11.5).fillColor('#111').text(t);doc.moveDown(0.2);doc.moveTo(doc.x,doc.y).lineTo(doc.page.width-72,doc.y).lineWidth(0.5).strokeColor('#dddddd').stroke();doc.moveDown(0.4)}
function drawBlock(doc,t){doc.fontSize(11).fillColor('#111').text(t,{align:'left'})}
function drawTele(doc,tele){
  if(!tele)return
  var has=tele.platform||tele.modality||tele.patientLocation||tele.consentAt||tele.consent
  if(!has)return
  drawHeading(doc,'Telehealth')
  var a=[]
  if(tele.platform)a.push('Platform '+tele.platform)
  if(tele.modality)a.push('Modality '+tele.modality)
  if(tele.patientLocation)a.push('Patient location: '+tele.patientLocation)
  if(tele.consentAt)a.push('Consent '+tele.consentAt)
  if(tele.consent)a.push('(confirmed)')
  doc.fontSize(10.5).fillColor('#111').text(a.join(' • '))
}
function drawICD(doc,list){
  if(!Array.isArray(list)||!list.length)return
  drawHeading(doc,'Diagnosis Codes (ICD-10-CM)')
  list.forEach(function(it){
    var line=(it.code||'')+' — '+(it.description||'')
    doc.fontSize(11).text(line)
  })
  doc.moveDown(0.2).fontSize(9).fillColor('#666').text('Selected by clinician; not a diagnosis by itself.')
}
function footer(doc){
  var range=doc.bufferedPageRange()
  for(var i=0;i<range.count;i++){
    doc.switchToPage(i)
    var txt='page '+(i+1)+' of '+range.count+' • generated '+new Date().toISOString().replace('T',' ').slice(0,16)
    doc.fontSize(9).fillColor('#666')
    doc.text(txt,72,doc.page.height-50,{width:doc.page.width-144,align:'center'})
  }
}
function renderNotePDF(data){
  return new Promise(function(resolve,reject){
    var redact=!!data.redact
    var p=data.patient||{}
    var prov=data.provider||{}
    if(redact){p=Object.assign({},p,{name:'—',mrn:'—'});prov=Object.assign({},prov,{npi:'—'})}
    var sections=parseSections(data.noteText||'')
    var doc=new PDFDocument({margin:72,size:'LETTER',bufferPages:true})
    var chunks=[]
    doc.on('data',function(b){chunks.push(b)})
    doc.on('end',function(){resolve(Buffer.concat(chunks))})
    drawHeader(doc,p,prov)
    if(data.watermark)drawWatermark(doc,'DRAFT — Model-assisted')
    drawHeading(doc,'Subjective')
    drawBlock(doc,textOrBlank(sections.subjective))
    drawHeading(doc,'Objective')
    drawBlock(doc,textOrBlank(sections.objective))
    drawHeading(doc,'Assessment')
    drawBlock(doc,textOrBlank(sections.assessment))
    drawHeading(doc,'Plan')
    drawBlock(doc,textOrBlank(sections.plan))
    if(Array.isArray(data.icd)&&data.includeIcd)drawICD(doc,data.icd)
    drawTele(doc,data.telehealth)
    footer(doc)
    doc.end()
  })
}

module.exports={renderNotePDF}