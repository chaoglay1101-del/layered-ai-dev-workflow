# Case study: TechStarterWeb Consulting

All numbers are as of 2026-10-27 and cover 2026-10-24 to 2026-10-27 unless stated otherwise. Source: GitHub statistics of
the private repo. They describe one small team's four-day sprint, not a benchmark.

## Problem

TechStarterWeb Consulting (techstarterweb.com) is a small web studio. Its own site, a reusable business-site template and
several customer-site tools were built with AI coding agents, with more than one session working in parallel. Early on:

- Background had to be re-explained to each new session.
- On 2026-10-25, PRs #22, #23 and #24 all took the same spec version.
- Long sessions on the strongest model used up the quota on routine work.

## Approach

- **Layers L0 to L4** (see [architecture.md](architecture.md)): the owner decides, a lead session splits work and reviews,
  executor agents write code from task cards, a cheap model does text work, scripts and CI check rules.
- **Task cards** as GitHub issues, with a file lock per card and a ledger for spec versions, migration numbers and
  session numbers.
- **Handoff notes** on every card, so a session can stop and another can continue. L1 sessions were numbered
  S-001 to S-016 by the ledger and chained by their notes.
- **Rules into CI**: `lock-check`, `spec-sync` and `merge-wrapup` replaced paragraphs of prose rules. The merge-wrapup action
  opened and merged its own wrap-up PR.
- **Cost control**: lower layers first, short rule file, sessions ended after a batch, a usage log per model call.

## Results

| Measure | Value | Date | Source |
| --- | --- | --- | --- |
| Pull requests opened / merged | 135 / 130 | 2026-10-24 to 10-27 | Private repo, GitHub statistics |
| Issues opened / closed | 84 / 55 | 2026-10-24 to 10-27 | Private repo, GitHub statistics |
| Merged PRs from agent-run branches (`agent/<card>`) | 30 | as of 2026-10-27 | Private repo, GitHub statistics |
| Docs PRs merged automatically | 5 | as of 2026-10-27 | Private repo, GitHub statistics |
| GitHub Actions workflows / `.mjs` scripts / test files | 17 / 20 / 34 | as of 2026-10-27 | Private repo, GitHub statistics |
| L1 sessions chained by ledger numbers and handoff notes | S-001 to S-016 | as of 2026-10-27 | Private repo ledger |
| L2/L3 calls in the usage log | 30 | as of 2026-10-27 | Private repo usage log |
| Cheap-model (DeepSeek) calls and their total cost | 10 calls, about US$0.03 | as of 2026-10-27 | Private repo usage log |
| `CLAUDE.md` size reduction (L1-only rules moved into skills) | about 39% | as of 2026-10-27 | Private repo, GitHub statistics |
| Same spec version taken by three PRs before the ledger | #22, #23, #24 | 2026-10-25 | Private repo, GitHub statistics |
| Spec versions kept in step with code | main spec v1.61, collaboration spec v1.16 | as of 2026-10-27 | Private repo, spec files |
| Website prototype: one test order to a live noindex preview | about 2.5 minutes | as of 2026-10-27 | Private repo |
| Gallery templates smoke-tested on PRs / style presets | 6 / 4 | as of 2026-10-27 | Private repo |

Notes on reading these numbers:

- "Source: private repo" means the repository is not public; the figures cannot be checked from outside.
- The usage log counts the logged L2/L3 calls only (30), including the 10 cheap-model calls.
- The spec versions are those of two documents kept outside the repo; a version bump means that document changed.
- Four days is a short window. The figures show how the setup behaved in a burst of work, not long-run productivity.

## What carried over to this repository

The scripts for file locks, number collisions, spec sync, wrap-up and the status check were extracted and made
configurable. The rule file, the four skills and the task-card template were generalized into `template/`. The stack
of the project itself is described in [stack.md](stack.md).
