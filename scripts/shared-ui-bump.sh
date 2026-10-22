#!/usr/bin/env bash
# Move the site to a new shared-ui release: bump SHARED_UI_REF, regenerate the screenshot
# baselines against that release, and open (or update) the bump PR.
#
# The PR auto-merges only when the regenerated screenshots are byte-identical to the set approved
# on the shared-ui side: the jellyrock.app-screenshots artifact of shared-ui's consumer-preview
# workflow, from the PR that produced the release or a manual run on the release commit. In every
# other case (screenshots differ, no preview found, recording failed) the PR stays open for a
# human and its description says why. The required checks (check, browser-tests) gate the merge
# either way.
#
# Run by .github/workflows/shared-ui-bump.yml when shared-ui releases. By hand:
#   scripts/shared-ui-bump.sh v1.2.0 --dry-run   # everything except push and PR; restores files
#
# Needs gh (GH_TOKEN: contents + pull-requests write here, actions read on jellyrock/shared-ui),
# Docker, and installed node dependencies.
set -euo pipefail
cd "$(dirname "$0")/.."

version=${1:-}
dry_run=false
[[ ${2:-} == --dry-run ]] && dry_run=true

upstream=jellyrock/shared-ui
pin_file=src/utils/fetch-shared-ui.ts
shots=tests/e2e/__screenshots__
pin_re="^const SHARED_UI_REF = '([^']+)';$"

[[ $version =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || { echo "Version must look like v1.2.3, got '$version'" >&2; exit 2; }
tag_sha=$(gh api "repos/$upstream/commits/$version" --jq .sha 2>/dev/null) ||
  { echo "$upstream has no $version" >&2; exit 2; }
current=$(sed -nE "s/$pin_re/\1/p" "$pin_file")
[[ -n $current ]] || { echo "SHARED_UI_REF not found in $pin_file" >&2; exit 1; }
if [[ $current == "$version" ]]; then
  echo "Already on $version"
  exit 0
fi
if [[ $(printf '%s\n' "${current#v}" "${version#v}" | sort -V | tail -1) != "${version#v}" ]]; then
  echo "$version is older than the pinned $current; nothing to do"
  exit 0
fi

IFS=. read -r cur_major cur_minor _ <<<"${current#v}"
IFS=. read -r new_major new_minor _ <<<"${version#v}"
if ((new_major != cur_major)); then update_type='major'
elif ((new_minor != cur_minor)); then update_type='minor'
else update_type='patch'; fi

tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT

# 1. Bump the pin and build against the release itself, never a local sibling checkout.
sed -i -E "s/$pin_re/const SHARED_UI_REF = '$version';/" "$pin_file"
rm -rf src/shared-ui .shared-ui-repo
SHARED_UI_FROM_RELEASE=1 npm run build

# 2. Record the screenshots the site now produces.
recorded=true
scripts/playwright-docker.sh playwright test --grep @visual --update-snapshots || recorded=false
mapfile -t changed < <(git status --porcelain -- "$shots" | awk '{print $2}')

# 3. Compare with the screenshots approved on the shared-ui side: the newest successful
# consumer-preview run of exactly this release's content (nav.ts, tokens.css, components/, as
# git blob hashes). That covers the PR that produced the release, a manual run on the release
# commit, and a manual run on any later commit whose shared-ui content is unchanged.
surface() {
  gh api "repos/$upstream/git/trees/$1?recursive=1" \
    --jq '[.tree[] | select(.type == "blob") | select(.path | test("^(nav\\.ts|tokens\\.css|components/)")) | "\(.path) \(.sha)"] | sort | join(",")'
}
pr_line=$(gh api "repos/$upstream/commits/$tag_sha/pulls" --jq '.[0] // empty | "\(.number) \(.head.sha)"' 2>/dev/null || true)
upstream_pr=${pr_line%% *}
release_surface=$(surface "$tag_sha")
run_id=''
# Errors (e.g. no consumer-preview workflow yet) count as "no approved preview".
while read -r id sha; do
  [[ -n $id ]] || continue
  if [[ $(surface "$sha" 2>/dev/null || true) == "$release_surface" ]]; then
    run_id=$id
    break
  fi
done < <(gh run list -R "$upstream" --workflow consumer-preview.yml --status success --limit 30 \
  --json databaseId,headSha --jq '.[] | "\(.databaseId) \(.headSha)"' 2>/dev/null || true)

auto=false
if ! $recorded; then
  reason="Recording the new screenshots failed, so they could not be compared. See this PR's browser-tests check."
elif [[ -z $run_id ]]; then
  reason="No successful consumer-preview run in $upstream for $version (release commit ${tag_sha:0:7}${upstream_pr:+ or PR #$upstream_pr}), so nobody has approved how it looks here. Review the screenshot changes listed above, or run that workflow (Actions → Consumer preview) on shared-ui main and re-run this one."
elif ! gh run download "$run_id" -R "$upstream" -n jellyrock.app-screenshots -D "$tmp/approved" >/dev/null 2>&1; then
  reason="Could not download the approved screenshots from $upstream run $run_id (artifacts expire after 90 days)."
elif diff -rq "$tmp/approved/jellyrock.app/$shots" "$shots" >"$tmp/diff.txt"; then
  auto=true
else
  reason="The screenshots differ from the set approved in $upstream run $run_id (jellyrock.app changed since that preview, or the release differs from the reviewed change):
$(sed -E 's#^#- #; s#'"$tmp"'/approved/jellyrock.app/##g' "$tmp/diff.txt")"
fi

run_url=${run_id:+https://github.com/$upstream/actions/runs/$run_id}
{
  echo "Updates [shared-ui](https://github.com/$upstream) from \`$current\` to \`$version\` ([changes](https://github.com/$upstream/compare/$current...$version))${upstream_pr:+, from $upstream#$upstream_pr}."
  echo
  if ((${#changed[@]})); then
    echo "**${#changed[@]} screenshot baseline(s) updated:**"
    printf -- "- \`%s\`\n" "${changed[@]#"$shots"/}"
  else
    echo "No screenshot changes: the site looks the same with this release."
  fi
  echo
  if $auto; then
    echo "✅ **Auto-merge enabled.** These screenshots are identical to the ones approved on the shared-ui side ([preview run]($run_url)). It merges once \`check\` and \`browser-tests\` pass."
  else
    echo "⚠️ **Needs review, auto-merge off.** $reason"
    echo
    echo "Compare the old and new PNGs in this PR's **Files changed** tab (GitHub shows image diffs), then merge."
  fi
  echo
  echo "Opened by \`scripts/shared-ui-bump.sh\` (README: shared-ui updates)."
} >"$tmp/body.md"

if $dry_run; then
  echo "--- dry run: would open this PR (auto-merge: $auto) ---"
  cat "$tmp/body.md"
  # Put back only what this script changed; other local edits to these files survive.
  sed -i -E "s/$pin_re/const SHARED_UI_REF = '$current';/" "$pin_file"
  git checkout -- "$shots"
  rm -rf src/shared-ui .shared-ui-repo
  echo "--- restored SHARED_UI_REF ($current) and $shots ---"
  exit 0
fi

branch="shared-ui/$version"
title="chore(deps): update shared-ui to $version"
git switch -C "$branch"
git add "$pin_file" "$shots"
git commit -q -m "$title" -m "Screenshots: $( $auto && echo 'identical to the approved preview' || echo 'need review')."
git push -f origin "$branch"

pr=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number // empty')
if [[ -n $pr ]]; then
  gh pr edit "$pr" --title "$title" --body-file "$tmp/body.md"
else
  gh pr create --base main --head "$branch" --title "$title" --body-file "$tmp/body.md" \
    --label dependencies --label "$update_type"
  pr=$(gh pr list --head "$branch" --state open --json number --jq '.[0].number')
fi

if $auto; then
  gh pr merge "$pr" --auto --squash
else
  gh pr merge "$pr" --disable-auto 2>/dev/null || true
fi
echo "PR #$pr: auto-merge $auto"
