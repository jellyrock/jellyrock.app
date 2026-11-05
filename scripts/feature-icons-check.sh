#!/usr/bin/env bash
# List the feature-catalog slugs with no icon, and the icons whose slug the catalog dropped, as the
# build reports them (src/data/feature-icons.json). Used by /audit-features.
#
# A failed build is reported as a failure, never as "no problems": its log holds no warnings either.
#
# Usage: scripts/feature-icons-check.sh   (run from anywhere)
# Exit: 0 no problems · 1 problems listed · 2 the build failed, so nothing was checked
set -euo pipefail
cd "$(dirname "$0")/.."

log=$(mktemp)
trap 'rm -f "$log"' EXIT

# Removing the catalog makes the build fetch the current one even with UPSTREAM_FROM_CACHE=1
# (src/utils/assets.ts), so this checks what upstream holds today.
rm -f src/data/upstream/feature-catalog.json

if ! SHARED_UI_FROM_RELEASE=1 npm run build >"$log" 2>&1; then
  tail -n 30 "$log" >&2
  echo "The build failed, so the icons were not checked. Fix the build first (Node $(cat .nvmrc), as .nvmrc says; this is $(node --version))." >&2
  exit 2
fi

# A local build prints `[feature catalog] …`; in GitHub Actions it is a `::warning title=Feature catalog::` line.
if grep -oE '\[feature catalog\].*|title=Feature catalog::.*' "$log"; then
  exit 1
fi
echo "Every released catalog feature has an icon, and no icon is left over."
