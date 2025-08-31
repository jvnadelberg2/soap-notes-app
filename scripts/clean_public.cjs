const fs=require('fs'),path=require('path');
const pub=path.join(process.cwd(),'public');
function list(dir){const out=[];(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true})){const p=path.join(d,e.name);if(e.isDirectory())w(p);else out.push(p)} })(dir);return out}
function htmlRefs(html){
  const refs=new Set();
  const rx=/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;
  let m;
  while((m=rx.exec(html)))refs.add(m[1]);
  return [...refs];
}
function normalize(ref){
  if(!ref) return null;
  if(/^https?:\/\//i.test(ref)) return null;
  if(ref.startsWith('data:')) return null;
  let p=ref.replace(/^\//,''); 
  return path.join(pub,p);
}
const html=fs.readFileSync(path.join(pub,'index.html'),'utf8');
const keep=new Set();
keep.add(path.join(pub,'index.html'));
keep.add(path.join(pub,'favicon.ico'));
for(const r of htmlRefs(html)){const n=normalize(r); if(n) keep.add(n)}
const all=list(pub);
const used=[], unused=[];
for(const f of all){
  if(keep.has(f)) used.push(f);
  else unused.push(f);
}
const report={used:used.map(p=>path.relative(pub,p)), unused:unused.map(p=>path.relative(pub,p))};
if(process.argv[2]==='move'){
  const trash=path.join(process.cwd(), `_trash-${Date.now()}`);
  fs.mkdirSync(trash);
  for(const rel of report.unused){
    const src=path.join(pub,rel);
    const dst=path.join(trash,rel.replace(/[\\/]/g,'__'));
    try{ fs.renameSync(src,dst) }catch(_){}
  }
  console.log(JSON.stringify({moved:report.unused,trash:path.basename(trash)},null,2));
} else {
  console.log(JSON.stringify(report,null,2));
}
