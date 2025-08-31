f=public/index.html
[ -f "$f" ] || f=index.html
cp "$f" "$f.bak.icd"
tmp=$(mktemp)
perl -0777 -pe 's/\$\{x\.term\}/\$\{x.desc\}/g; s/<span class="hint">\(\s*score \$\{x\.score\}\s*\)<\/span>//g' "$f" > "$tmp"
mv "$tmp" "$f"
lsof -ti :5050 | xargs kill -9 2>/dev/null || true
npm run start:5050
