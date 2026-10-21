#!/usr/bin/env bash
# Builds upload-ready zips for the Catalyst console (Functions → upload):
#   functions/dist/enquiry.zip, functions/dist/admin.zip
# Each zip has index.js, package.json, catalyst-config.json, lib/ and
# node_modules/ at its root. Tests run first; nothing is uploaded.
set -euo pipefail
cd "$(dirname "$0")"
(cd ../app && npm run sync:function >/dev/null)   # refresh bundled schemas/pricing
mkdir -p dist
for fn in enquiry admin; do
  (cd "$fn" && npm install --omit=dev --no-audit --no-fund >/dev/null && npm test >/dev/null)
  rm -f "dist/$fn.zip"
  (cd "$fn" && zip -qr "../dist/$fn.zip" . -x 'test/*' -x '*.DS_Store')
  echo "dist/$fn.zip ($(du -h "dist/$fn.zip" | cut -f1))"
done
