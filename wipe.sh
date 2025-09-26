keys/note_sign_private.pem

cd /Users/jonnadelberg/projects/soap-notes-app
git fetch --all --prune
git rev-parse --is-inside-work-tree

export TARGET_PATH='<repo-relative-path-to-the-sensitive-file>'
git ls-files "keys/note_sign_private.pem"$

brew list git-filter-repo >/dev/null 2>&1 || brew install git-filter-repo
git filter-repo --path "$TARGET_PATH" --invert-paths

git remote -v
git push origin --force --all
git push origin --force --tags

