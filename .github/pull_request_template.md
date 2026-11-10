<!-- Title: "type: Summary", for example "fix: Show the newest Jellyfin line as 12.0, like every other version".
     Common types: feat, fix, chore, build, test, docs. Nothing checks the title; keep it to the convention.
     On a one-commit squash GitHub uses the commit's subject instead, so make the two match.
     This description does not reach git log: write it for the reviewer. -->

## Overview

<!-- Required. What changed and why, in 1 to 5 sentences, the problem first. -->

## Changes

<!-- Required. One bullet per logical change, naming the pages, components or files a reviewer would search for. -->

-

## Testing

<!-- Required. What you ran and what it showed. `npm run check` always;
     `npm run build && npm run build:visual && npm test` (needs Docker) when a page can render differently.
     After a deliberate visual change, say which screenshot baselines you refreshed with
     `npm run build:visual && npm run test:visual:update` and why. When nothing ran, write "Not tested" and why. -->

## Issues

<!-- Optional. "Fixes #123" closes an issue on merge; "Ref #123" links one. -->
