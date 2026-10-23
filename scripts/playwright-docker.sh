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

# In symlink mode (a sibling shared-ui checkout: local dev, shared-ui's consumer-preview),
# src/shared-ui links outside this repo. Mount the link's target at the same path so the
# shared test code it holds resolves inside the container too.
mounts=(-v "$PWD:/work")
if [[ -L src/shared-ui ]]; then
  shared_ui=$(readlink -f src/shared-ui)
  mounts+=(-v "$shared_ui:$shared_ui:ro")
fi

exec docker run --rm --init --ipc=host \
  --user "$(id -u):$(id -g)" -e HOME=/tmp -e CI \
  "${mounts[@]}" -w /work \
  "$image" npx "$@"
