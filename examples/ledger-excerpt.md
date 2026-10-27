# Ledger excerpt (de-identified, trimmed)

This is the shape of the real `.agents/ledger.md` after a few days of parallel work. Card numbers and PR numbers are
kept as they were; names, document ids and product details are removed.

## Numbers

| Resource | Currently used | Assigned (unmerged) | Notes |
| --- | --- | --- | --- |
| Main spec version | 1.56 (10-26, PR #184); 1.54 (10-26, PR #168); 1.53 (PR #135) | 1.57 (#187), 1.58 (#188), 1.59 (#189) | version log is appended by an Action |
| Collaboration spec version | 1.14 (10-26, PR #154); 1.12 (PR #131) | 1.15 (S-010 architecture upgrade) | version log added by hand |
| Migration | 0011_prototype_created (10-26, PR #145; applied to production); 0010_copy_drafts (PR #85) | 0012 (#187), 0013 (#189) | next is 0014 |

## Session numbers

| ID | Session | Date |
| --- | --- | --- |
| S-009 | L1 routine (Sonnet): watch #187 and #191, add to-do rows, continue #188 | 10-26 |
| S-010 | L1 architecture (Opus): upgrade the collaboration setup | 10-26 |
| S-011 | L1 architecture (Opus): continue S-010, open the wrap-up automation card | 10-26 |
| S-012 | L1 routine (Sonnet): watch #197, label the next card once it merges | 10-26 |

Next is S-013.

## Active cards and file locks

| Card | Level | Locked files and docs | Numbers |
| --- | --- | --- | --- |
| #187 order test flag | L2 sonnet | migrations/0012_orders_is_test.sql, worker/index.js, tests/, spec-sync.json | migration 0012, spec 1.57 |
| #188 test-order folder (queued: waits for #187) | L2 sonnet | worker/intake.js, worker/index.js, tests/, spec-sync.json | spec 1.58 |
| #197 lock-check CI | L2 sonnet | scripts/lock-check.mjs, tests/lock-check.test.js, .github/workflows/lock-check.yml, spec-sync.json | none |
