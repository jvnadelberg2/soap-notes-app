#!/usr/bin/env bash
set -euo pipefail
ts=$(date +%Y%m%d-%H%M%S)
base="$HOME/.soap-notes-keys"
old_priv="$base/note_sign_private.pem"
old_pub="$base/note_sign_public.pem"
[ -f "$old_priv" ] && mv "$old_priv" "$base/archive/note_sign_private-$ts.pem"
[ -f "$old_pub" ] && mv "$old_pub" "$base/archive/note_sign_public-$ts.pem"
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out "$base/note_sign_private.pem"
openssl rsa -in "$base/note_sign_private.pem" -pubout -out "$base/note_sign_public.pem"
chmod 600 "$base/note_sign_private.pem" "$base/note_sign_public.pem"
fp=$(openssl rsa -in "$base/note_sign_private.pem" -pubout 2>/dev/null | openssl sha256 | awk '{print $2}')
grep -q '^SIGN_PRIVATE_KEY_PATH=' .env 2>/dev/null || echo "SIGN_PRIVATE_KEY_PATH=$base/note_sign_private.pem" >> .env
grep -q '^SIGN_PUBLIC_KEY_PATH=' .env 2>/dev/null || echo "SIGN_PUBLIC_KEY_PATH=$base/note_sign_public.pem" >> .env
if grep -q '^SIGN_KEY_ID=' .env 2>/dev/null; then
  sed -i '' -E "s/^SIGN_KEY_ID=.*/SIGN_KEY_ID=$ts/" .env || true
else
  echo "SIGN_KEY_ID=$ts" >> .env
fi
printf "%s\n" "$fp"
