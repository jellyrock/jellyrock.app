#!/usr/bin/env bash
# Replace tests/fixtures/feature-catalog.json with jellyrock/jellyrock's current catalog, dated now,
# so the screenshot baselines can show today's features. Then rebuild and accept the new look:
#
#   scripts/refresh-test-catalog.sh
#   npm run build:visual && npm run test:visual:update
#
# Check the screenshot diff is only content before committing both.
set -euo pipefail
cd "$(dirname "$0")/.."

fixture=tests/fixtures/feature-catalog.json
url=https://raw.githubusercontent.com/jellyrock/jellyrock/main/docs/feature-catalog.json
comment=$(jq -r '._comment' "$fixture")

curl -fsSL "$url" |
  jq --arg comment "$comment" --arg date "$(date -u +%Y-%m-%dT12:00:00Z)" \
    '{_comment: $comment, _buildDate: $date} + del(._comment)' >"$fixture.tmp"
mv "$fixture.tmp" "$fixture"
npx prettier --write "$fixture" >/dev/null
echo "Refreshed $fixture, dated $(jq -r ._buildDate "$fixture")."
