#!/usr/bin/env bash
# Bump src/version.txt by one and rebuild index.html / sw.js from it.
set -euo pipefail
cd "$(dirname "$0")/.."
cur=$(tr -dc '0-9' < src/version.txt)
echo "v$((cur+1))" > src/version.txt
node build.js >/dev/null
echo "v$((cur+1))"
