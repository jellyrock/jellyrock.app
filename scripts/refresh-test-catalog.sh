#!/usr/bin/env bash
# Replace the test catalogs with the current ones upstream, so the screenshot baselines can show
# today's features:
#
#   tests/fixtures/feature-catalog.json   jellyrock/jellyrock's catalog, dated now (_buildDate)
#   tests/fixtures/plugin-catalog.json    jellyrock/jellyfin-plugin-jellyrock's catalog
#
# Then rebuild and accept the new look:
#
#   scripts/refresh-test-catalog.sh
#   npm run build:visual && npm run test:visual:update
#
# Check the screenshot diff is only content before committing both.
set -euo pipefail
cd "$(dirname "$0")/.."

refresh() { # <fixture> <url> [jq filter]
  local fixture=$1 url=$2 filter=${3:-.} comment
  comment=$(jq -r '._comment' "$fixture")
  curl -fsSL "$url" | jq --arg comment "$comment" "{_comment: \$comment} + (del(._comment) | $filter)" >"$fixture.tmp"
  mv "$fixture.tmp" "$fixture"
  npx prettier --write "$fixture" >/dev/null
}

app=tests/fixtures/feature-catalog.json
refresh "$app" https://raw.githubusercontent.com/jellyrock/jellyrock/main/docs/feature-catalog.json \
  "{_buildDate: \"$(date -u +%Y-%m-%dT12:00:00Z)\"} + ."
echo "Refreshed $app, dated $(jq -r ._buildDate "$app")."

plugin=tests/fixtures/plugin-catalog.json
refresh "$plugin" https://raw.githubusercontent.com/jellyrock/jellyfin-plugin-jellyrock/main/docs/feature-catalog.json
echo "Refreshed $plugin."
