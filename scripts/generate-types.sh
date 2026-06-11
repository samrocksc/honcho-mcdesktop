#!/usr/bin/env bash
set -e
source .env.local 2>/dev/null || true
BASE_URL="${HONCHO_BASE_URL:-http://192.168.50.135:8000}"
echo "Generating types from $BASE_URL/openapi.json"
npx openapi-typescript "$BASE_URL/openapi.json" -o lib/honcho/generated-types.ts
echo "Done: lib/honcho/generated-types.ts"
