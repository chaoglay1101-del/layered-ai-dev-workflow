---
name: task-card
description: L1 opens a task card, checks file locks, assigns numbers (spec version, migration) from .agents/ledger.md, and finally adds the label agent:ready. Use before handing an item from the to-do list to L2 or L3.
---

# Opening a task card

Only L1 (the lead agent session) does this.

## Steps

1. **Find the to-do item and its issue.** Items owned by an agent already have an issue (label `todo`) if you sync your
   to-do list to GitHub. If there is none, open one from `.github/ISSUE_TEMPLATE/task.yml`.
   **A card for another repo does not get `agent:ready`**: the label starts the executor workflow in the repo that holds
   the card (a lesson from an early mistake: a card in the wrong repo was labelled and started a run that had to be cancelled).
2. **Pick the level** (model routing):
   - feature work, bug fix: L2 executor
   - exploring code, reading CI logs: L2 read-only (small model)
   - copy, translation, summaries: L3 cheap model
   - routine small code changes (styles, missing tests, filling template fields): L3 produces a patch, L2 applies it and
     runs the tests
   - spec, architecture decisions: L1 does it itself, no automatic run
   - anything rules can do (format checks, conversions): write a script (L4), no model
3. **Data boundary**: a task that touches customer personal data (names, emails, phone numbers, original requests,
   material), prices, secrets or access settings cannot go to L3. Use L2, or de-identify with a script first.
4. **List the files and docs the card will change.** That list is the file lock. Check for conflicts:
   ```sh
   gh issue list --repo <OWNER>/<REPO> --label agent:ready --state open
   gh issue list --repo <OWNER>/<REPO> --label agent:running --state open
   node scripts/status-check.mjs --locks
   ```
   then compare with "Active cards and file locks" in `.agents/ledger.md`. A file already locked by another card means
   this card queues (do not add `agent:ready` yet). Highly contended files (the spec, `spec-sync.json`, `migrations/`)
   go to one card at a time.
5. **Assign numbers.** If the card changes code (bumps `spec-sync.json`), adds a migration or needs a release, take the
   next number from `.agents/ledger.md`, write it into "Pre-assigned numbers", and add a row in both "Assigned" and
   "Active cards and file locks" (the ledger change ships with the next L1 PR).
6. **Write acceptance criteria and limits.** Criteria must be checkable ("`npm test` passes", "the English home title is ...").
   Default limits: L2 max-turns 25 and 30 minutes; L3 a small fixed budget per run.
7. **Add the label `agent:ready`.** Only then may the work start.

## Closing

- After the PR merges, the number moves from "Assigned" to "Currently used" and the card's lock row is removed. The
  `merge-wrapup` workflow does this and opens an auto-merging ledger PR; if it fails it prints "Wrap up manually" and the
  daily status check reports the leftover.
- The spec document is updated by L1 before the PR merges (L2 and L3 do not touch it).
