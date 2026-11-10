#!/usr/bin/env bash
# This repo's own reader for /catchup (.claude/skills/catchup/catchup.conf runs it). It prints the
# shared reader's typed lines (format: the header of .claude/skills/catchup/catchup-state.sh) for
# the forge state the shared reader leaves to each repo:
#   ci-failing    the newest finished run of a workflow on main failed         route /ci-triage
#   audit-needed  the feature-drift watch's "Feature audit needed" issue is open   route /audit-features
# Read-only: it only calls gh. A gh call that fails prints an ERROR line for its section and the
# other section still runs.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 2

# The watcher tags its issue with this label, so read it from the watcher, not a copy.
watch=scripts/feature-drift-detect.sh
label="$(sed -n 's/^TRACKING_LABEL="\${TRACKING_LABEL:-\([^}]*\)}"$/\1/p' "$watch" 2>/dev/null | head -1)"

if runs="$(gh run list --branch main --limit 50 --json databaseId,workflowName,status,conclusion,url 2>&1)"; then
  jq -r '[.[] | select(.status == "completed")] | group_by(.workflowName) | map(max_by(.databaseId))
         | .[] | select(.conclusion == "failure")
         | "BANNER\tci-failing\t\(.workflowName) failed on main\t/ci-triage \(.databaseId)\n  \(.url)"' <<<"$runs"
else
  printf 'ERROR\tci-failing\tgh run list failed: %s\n' "${runs//$'\n'/ }"
fi

if [ -z "$label" ]; then
  printf 'ERROR\taudit-needed\tno TRACKING_LABEL in %s\n' "$watch"
elif issues="$(gh issue list --state open --label "$label" --json number,title,url 2>&1)"; then
  jq -r '.[] | "BANNER\taudit-needed\t#\(.number) \(.title)\t/audit-features\n  \(.url)"' <<<"$issues"
else
  printf 'ERROR\taudit-needed\tgh issue list failed: %s\n' "${issues//$'\n'/ }"
fi
