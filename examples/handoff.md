# Example handoff notes (modelled on real ones, de-identified)

Two notes in the style used on the real cards (times and counts are illustrative). Both are posted as comments on the task card, in the same four-part format
(see `template/.claude/skills/handoff/SKILL.md`).

## 1. From an L2 executor (ran on Actions, finished within its limits)

```
## Handoff note (10-27 02:10, Actions run <link>)
**Done**:
- Added `scripts/lock-check.mjs`, `tests/lock-check.test.js` and `.github/workflows/lock-check.yml` (PR #208, branch `agent/197`, 15 tests).
**Current state**:
- PR open, not merged. The tests pass locally. The PR was opened with the default token, so CI has not run on it yet.
**Next**:
1. L1 closes and reopens the PR so CI runs, then reviews it.
2. Before merging, check that the PR description says whether the spec is affected.
**Needs a person**:
- Merge PR #208 after CI is green.
**Practices worth capturing**:
- none
```

## 2. From L1 (a session that split one parent card into three child cards)

```
## Handoff note (10-26 21:40, S-009 L1 routine)
**Done**:
- Split the parent card into three child cards (#187, #188, #189).
- Ledger PR assigned the spec versions and the file locks for all three.
- Added the three rows to the to-do list in suggestion mode (the owner accepts them).
**Current state**:
- One card was given `agent:ready` by mistake and started the executor workflow, but that card belongs to a different
  repository. The run was cancelled and the label removed. Nothing was written.
- #187 is running; #188 queues behind it because both lock the same files.
**Next**:
1. Watch #187. When it merges, add `agent:ready` to #188.
2. Review the PRs; update the spec before merging each.
**Needs a person**:
- Accept the to-do list suggestions. Merge the ledger PR.
**Practices worth capturing**:
- "A card for another repo never gets `agent:ready`" - write it into the task-card skill.
```

The last line of the second note was applied: it is now a sentence in `template/.claude/skills/task-card/SKILL.md`.
