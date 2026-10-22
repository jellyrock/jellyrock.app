#!/usr/bin/env bash
# Run a Playwright command inside the same Playwright image CI uses, so screenshots match CI
# pixel-for-pixel (fonts and rendering differ between machines). The image is read from
# .github/workflows/ci.yml, where Renovate keeps it in step with @playwright/test.
#
# Usage: scripts/playwright-docker.sh playwright test --grep @visual [--update-snapshots]
set -euo pipefail
cd "$(dirname "$0")/.."

image=$(grep -oE 'mcr\.microsoft\.com/playwright:v[0-9.]+-noble@sha256:[0-9a-f]{64}' .github/workflows/ci.yml | head -1)
[[ -n $image ]] || { echo "No Playwright image found in .github/workflows/ci.yml" >&2; exit 1; }
[[ -f dist/index.html ]] || { echo "dist/ is missing: run 'npm run build' first" >&2; exit 1; }
command -v docker >/dev/null || { echo "Docker is required for screenshot tests" >&2; exit 1; }

exec docker run --rm --init --ipc=host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI \
  -v "$PWD:/work" -w /work \
  "$image" npx "$@"
