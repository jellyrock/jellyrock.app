#!/usr/bin/env bash
#
# feature-drift-detect.sh — flag when the upstream JellyRock app ships releases
# that the marketing site's feature list (src/data/features.ts) hasn't been
# audited against yet.
#
# This is the *mechanical* half of the feature-audit loop: it does zero
# judgement. It compares a stored watermark (the last upstream release we
# audited) against the latest upstream release and, when they differ, surfaces
# the changelog delta so a human (via the /audit-features skill) can decide
# whether anything is website-worthy. See docs / the skill for the judgement half.
#
# Subcommands:
#   digest       Print the changelog delta (released sections newer than the
#                watermark, minus dependency noise). Always exits 0. Used by the
#                /audit-features skill and for local inspection.
#   check        Exit 0 if the site is in sync, 1 if upstream has newer releases.
#                No side effects. Handy for scripts / quick CLI checks.
#   sync-issue   CI mode: upsert a single tracking issue on THIS repo when drift
#                exists, or close it when back in sync. Needs `gh` with
#                issues:write. (contents:read suffices to read the public upstream.)
#
# Deps: bash, gh (authenticated), jq, awk. No Node/Python.
set -euo pipefail

UPSTREAM_REPO="${UPSTREAM_REPO:-jellyrock/jellyrock}"
WATERMARK_FILE="${WATERMARK_FILE:-.audit/features-watermark.json}"
TRACKING_LABEL="${TRACKING_LABEL:-feature-drift}"
# Marker embedded in the tracking issue body so we can find it unambiguously
# even if the label is ever removed by hand.
TRACKING_MARKER="<!-- feature-drift-tracker -->"

die() {
  echo "error: $*" >&2
  exit 1
}

require() {
  command -v "$1" >/dev/null 2>&1 || die "missing dependency: $1"
}

# --- shared core ------------------------------------------------------------

# The last upstream release we've audited, e.g. "v2.19.0".
read_watermark() {
  [ -f "$WATERMARK_FILE" ] || die "watermark not found: $WATERMARK_FILE"
  jq -r '.lastAuditedRelease' "$WATERMARK_FILE"
}

# The latest published upstream release tag, e.g. "v2.19.0".
latest_upstream_release() {
  gh release view --repo "$UPSTREAM_REPO" --json tagName --jq '.tagName'
}

# The upstream CHANGELOG.md, raw.
fetch_changelog() {
  gh api "repos/${UPSTREAM_REPO}/contents/CHANGELOG.md" \
    -H "Accept: application/vnd.github.raw"
}

# Extract released changelog sections strictly newer than the watermark.
#
# Relies on the upstream "Keep a Changelog" ordering (newest first, maintained
# by their changelog-syncer): we start capturing at the first non-Unreleased
# "## [x.y.z]" header and stop when we reach the watermark's header. The
# Unreleased section and "### Dependencies" subsections are dropped as noise.
extract_delta() {
  local watermark_ver="$1" # e.g. "2.19.0" (no leading v)
  # Reads the whole changelog (no early exit) so the upstream feed is fully
  # consumed — an early awk exit would SIGPIPE the producer under pipefail.
  awk -v stop="$watermark_ver" '
    /^## \[/ {
      ver = $0; sub(/^## \[/, "", ver); sub(/\].*/, "", ver)
      if (ver == "Unreleased") { inrel = 0; next }
      if (done)                { next }
      if (ver == stop)         { done = 1; inrel = 0; next }
      inrel = 1; skip = 0
    }
    /^### / { if (!done) skip = ($0 ~ /^### Dependencies/) ? 1 : 0 }
    inrel && !skip && !done { print }
  '
}

# Populate globals: WATERMARK, LATEST, DELTA, DRIFT(0|1).
compute() {
  require gh
  require jq
  WATERMARK="$(read_watermark)"
  LATEST="$(latest_upstream_release)"
  local wm_ver="${WATERMARK#v}"
  local changelog
  changelog="$(fetch_changelog)"
  DELTA="$(printf '%s' "$changelog" | extract_delta "$wm_ver")"
  if [ "$WATERMARK" = "$LATEST" ]; then
    DRIFT=0
  else
    DRIFT=1
  fi
}

# --- subcommands ------------------------------------------------------------

cmd_digest() {
  compute
  echo "# Feature-drift digest"
  echo "Audited watermark : $WATERMARK"
  echo "Latest upstream   : $LATEST"
  echo "Upstream repo     : $UPSTREAM_REPO"
  echo
  if [ "$DRIFT" -eq 0 ]; then
    echo "✅ In sync — no upstream releases newer than the watermark."
    return 0
  fi
  echo "⚠️  Releases newer than the watermark (Dependencies noise removed):"
  echo
  printf '%s\n' "$DELTA"
}

cmd_check() {
  compute
  if [ "$DRIFT" -eq 0 ]; then
    echo "in sync (watermark $WATERMARK == latest $LATEST)"
    return 0
  fi
  echo "drift: upstream at $LATEST, last audited $WATERMARK"
  return 1
}

cmd_sync_issue() {
  compute
  local existing
  existing="$(gh issue list --label "$TRACKING_LABEL" --state open \
    --json number --jq '.[0].number // empty' 2>/dev/null || true)"

  if [ "$DRIFT" -eq 0 ]; then
    if [ -n "$existing" ]; then
      gh issue close "$existing" \
        --comment "Back in sync — features audited up to \`$LATEST\`. Closing automatically."
      echo "closed tracking issue #$existing (in sync at $LATEST)"
    else
      echo "in sync at $LATEST; no tracking issue to manage"
    fi
    return 0
  fi

  # Drift: build the issue body and upsert.
  gh label create "$TRACKING_LABEL" \
    --color FBCA04 --description "Upstream releases awaiting a marketing-site feature audit" \
    --force >/dev/null 2>&1 || true

  local body
  body="$(
    cat <<EOF
$TRACKING_MARKER
Upstream **${UPSTREAM_REPO}** has shipped release(s) newer than the last audited
watermark. Run **\`/audit-features\`** to decide whether any of these warrant a
new card or an edit in \`src/data/features.ts\`, then merge the PR it opens (which
advances the watermark and closes this issue).

| | |
| --- | --- |
| Last audited | \`$WATERMARK\` |
| Latest upstream | \`$LATEST\` |

### Changelog delta (dependency noise removed)

\`\`\`md
$DELTA
\`\`\`

<sub>Maintained automatically by \`scripts/feature-drift-detect.sh\`; this body is refreshed on each run.</sub>
EOF
  )"

  if [ -n "$existing" ]; then
    gh issue edit "$existing" \
      --title "Feature audit needed: upstream at $LATEST" \
      --body "$body" >/dev/null
    echo "updated tracking issue #$existing ($WATERMARK -> $LATEST)"
  else
    gh issue create \
      --title "Feature audit needed: upstream at $LATEST" \
      --label "$TRACKING_LABEL" \
      --body "$body" >/dev/null
    echo "opened tracking issue ($WATERMARK -> $LATEST)"
  fi
}

main() {
  local cmd="${1:-digest}"
  case "$cmd" in
    digest) cmd_digest ;;
    check) cmd_check ;;
    sync-issue) cmd_sync_issue ;;
    -h | --help | help)
      grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//'
      ;;
    *) die "unknown subcommand: $cmd (try: digest | check | sync-issue)" ;;
  esac
}

main "$@"
