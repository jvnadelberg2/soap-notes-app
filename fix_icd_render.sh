set -e
file_patch() {
  f="$1"
  [ -f "$f" ] || return 0
  node -e "
    const fs=require('fs');
    const p='$f';
    let s=fs.readFileSync(p,'utf8');
    s=s.replace(/(['\`])\$\{x\.code\}[^]*?\$\{x\.(?:desc|term)[^}]*\}(\1)/g, (m, q1, q2) => {
      return \"'\" + \"'+x.code+' — '+(x.desc||x.term||'')\" + \"'\";
    });
    s=s.replace(/icdOut\.textContent\s*=\s*.*?;\s*$/m,
      \"icdOut.textContent = icd && icd.length ? icd.map(x => (x.code||'') + ' — ' + ((x.desc||x.term)||'')).join('\\\\n') : 'No ICD-10 codes detected.';\\n\");
    fs.writeFileSync(p,s);
  "
}
file_patch index.html
file_patch public/app.js
echo "done"
