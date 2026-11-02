#!/usr/bin/env bash
# Prove what the feature catalog can and can't do to a deploy, by building the site from test
# catalogs made from tests/fixtures/feature-catalog.json:
#
#   1. A catalog with a feature the site has no icon for, released today, and an unreleased one
#      builds into dist-catalog-test/. The new card renders with the default icon and a warning, and
#      the unreleased one appears nowhere. CI then runs every browser test against that build.
#   2. A catalog with `schema: 2` fails the build.
#   3. A catalog that can't be read fails the build.
#
# Usage: scripts/check-catalog-builds.sh   (run from the repo root, after `npm ci`)
set -euo pipefail

out=dist-catalog-test
fixture=tests/fixtures/feature-catalog.json
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
failures=0
fail() { echo "::error::$*"; failures=$((failures + 1)); }

# 1. A new feature with no icon, and an unreleased one.
jq --arg today "$(date -u +%F)" '
  .app.serverNewest = "12"
  | .features += [
      { slug: "fixture-new-feature", title: "Fixture new feature", pitch: "A feature the site has no icon for yet.",
        since: "9.9.0", sinceDate: $today, server: "12.0.0", plugins: ["Fixture Plugin"], screenshots: [],
        https: null, page: "docs/user/features/fixture-new-feature.md", url: "https://docs.jellyrock.app/features/" },
      { slug: "fixture-unreleased", title: "Fixture unreleased feature", pitch: "Merged but not released.",
        since: "unreleased", sinceDate: null, server: "10.7.0", plugins: [], screenshots: [],
        https: null, page: "docs/user/features/fixture-unreleased.md", url: "https://docs.jellyrock.app/features/" }
    ]' "$fixture" >"$tmp/new-feature.json"

if FEATURE_CATALOG_PATH="$tmp/new-feature.json" npx astro build --outDir "$out" >"$tmp/build.log" 2>&1; then
  grep -q 'no icon for feature `fixture-new-feature`' "$tmp/build.log" ||
    fail "the build did not warn about the feature with no icon"
  grep -q 'data-feature-card="fixture-new-feature"' "$out/features/index.html" ||
    fail "/features/ has no card for the new feature"
  grep -q 'data-feature-card="fixture-new-feature"' "$out/index.html" ||
    fail "the homepage's New in JellyRock section has no card for the new feature"
  ! grep -rq 'fixture-unreleased' "$out" --include='*.html' --include='*.json' ||
    fail "the unreleased feature appears in the build"
  echo "ok: a new feature with no icon builds, and an unreleased one is left out"
else
  cat "$tmp/build.log"
  fail "the build failed on a catalog with a new feature: a new feature page must never fail a build"
fi

# 2 and 3. Catalogs the site can't use fail the build, naming why.
jq '.schema = 2' "$fixture" >"$tmp/schema-2.json"
expect_failure() { # <catalog> <message the build must print> <what it is>
  if FEATURE_CATALOG_PATH="$1" npx astro build --outDir "$tmp/dist" >"$tmp/bad.log" 2>&1; then
    fail "the build passed with $3: it must fail so the live site stays as it is"
  elif ! grep -q "$2" "$tmp/bad.log"; then
    cat "$tmp/bad.log"
    fail "the build failed with $3, but without saying \"$2\""
  else
    echo "ok: $3 fails the build"
  fi
}
expect_failure "$tmp/schema-2.json" 'schema is 2' 'a schema 2 catalog'
expect_failure "$tmp/no-such-catalog.json" 'cannot read' 'an unreadable catalog'

exit $((failures > 0))
