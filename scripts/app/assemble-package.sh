#!/usr/bin/env bash
# Assemble a Next.js standalone build into an App Service deployment directory.

set -euo pipefail

target_dir="${1:?Usage: assemble-package.sh <target-directory>}"
[[ -d .next/standalone ]] || { echo "Missing .next/standalone; run npm run build first." >&2; exit 1; }
[[ -d .next/static ]] || { echo "Missing .next/static; run npm run build first." >&2; exit 1; }

mkdir -p "$target_dir"
cp -r .next/standalone/. "$target_dir/"
mkdir -p "$target_dir/.next"
cp -r .next/static "$target_dir/.next/static"
# public/ is optional: it has no tracked files, and uploads are served from Blob Storage.
if [[ -d public ]]; then cp -r public "$target_dir/public"; fi

test -f "$target_dir/server.js"
test -d "$target_dir/.next/static"
echo "Deployment package assembled at $target_dir"
