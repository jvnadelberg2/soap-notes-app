#!/usr/bin/env bash
set -euo pipefail

# Generate a new RSA key pair (3072 bits)
openssl genpkey -algorithm RSA -pkeyopt rsa_keygen_bits:3072 -out rsa-private.pem
openssl pkey -in rsa-private.pem -pubout -out rsa-public.pem

# Run the end-to-end test runner with the new keys
NOTE_SIGN_PRIVATE_KEY_PATH="$PWD/rsa-private.pem" \
NOTE_SIGN_PUBLIC_KEY_PATH="$PWD/rsa-public.pem" \
STRICT_FINALIZE_200=1 \
node e2e-runner.js
