#!/usr/bin/env bash
# Build the site the screenshot tests compare (tests/e2e/visual.spec.ts) into dist-visual/: the
# committed test catalogs (the app's, judged as of the date stored in it, and the Companion
# plugin's), so the feature cards, "New" labels, /companion-plugin/ and the homepage's
# newest-feature line all render and stay the same until the design changes.
#
# The real build (dist/) gets the functional tests; live catalog content never reaches a baseline.
#
# Usage: scripts/build-visual.sh   (npm run build:visual)
set -euo pipefail
cd "$(dirname "$0")/.."

fixture=tests/fixtures/feature-catalog.json
date=$(jq -er '._buildDate' "$fixture") || {
  echo "$fixture has no _buildDate: run scripts/refresh-test-catalog.sh" >&2
  exit 1
}

FEATURE_CATALOG_PATH=$fixture PLUGIN_CATALOG_PATH=tests/fixtures/plugin-catalog.json FEATURE_BUILD_DATE=$date \
  npx astro build --outDir dist-visual
