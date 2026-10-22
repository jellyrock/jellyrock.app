#!/usr/bin/env bash
# After a deploy, prove the live site serves this build and the headers the tests assumed:
#   1. every page in the build's sitemap is served byte-for-byte from dist/
#   2. every asset the home page references returns 200
#   3. the live security headers equal tests/support/production-headers.json, the copy the
#      browser tests ran with (a CSP change in jellyrock/infra must be mirrored there)
#
# Usage: scripts/verify-live.sh [base-url]   (default https://jellyrock.app; run from repo root)
set -euo pipefail

base=${1:-https://jellyrock.app}
dist=dist
headers_file=tests/support/production-headers.json
failures=0
fail() { echo "::error::$*"; failures=$((failures + 1)); }

# 1. Pages. Retries cover the moment between rsync finishing and Caddy seeing the new files.
page=$(mktemp)
trap 'rm -f "$page"' EXIT
mapfile -t paths < <(grep -oE '<loc>[^<]+' "$dist/sitemap-0.xml" | sed -E 's#<loc>https?://[^/]+##; s#/?$#/#')
((${#paths[@]} > 0)) || { echo "::error::No pages found in $dist/sitemap-0.xml"; exit 1; }
for path in "${paths[@]}"; do
  ok=false
  for attempt in 1 2 3 4 5; do
    if curl -fsS --max-time 20 -o "$page" "$base$path" && cmp -s "$page" "$dist${path}index.html"; then
      ok=true
      break
    fi
    sleep $((attempt * 2))
  done
  if $ok; then echo "ok   $path"; else fail "$base$path does not match dist${path}index.html"; fi
done

# 2. Assets referenced by the home page (hashed CSS/JS/images under /_astro).
mapfile -t assets < <(grep -oE '(src|href)="/_astro/[^"]+"' "$dist/index.html" | sed -E 's/^(src|href)="//; s/"$//' | sort -u)
for asset in "${assets[@]}"; do
  code=$(curl -sS -o /dev/null -w '%{http_code}' --max-time 20 "$base$asset")
  [[ $code == 200 ]] || fail "$base$asset returned $code"
done
echo "ok   ${#assets[@]} home page assets"

# 3. Security headers.
live=$(curl -fsSI --max-time 20 "$base/" | tr -d '\r')
while IFS=$'\t' read -r name expected; do
  actual=$(grep -i "^$name:" <<<"$live" | head -1 | cut -d: -f2- | sed 's/^ *//')
  if [[ $actual == "$expected" ]]; then
    echo "ok   $name"
  else
    fail "Live $name differs from $headers_file (update the copy so tests match production): live='$actual'"
  fi
done < <(jq -r 'del(."$comment") | to_entries[] | [.key, .value] | @tsv' "$headers_file")

((failures == 0)) || { echo "$failures check(s) failed"; exit 1; }
echo "Live site matches this build."
