---
name: handoff
description: Leave a handoff note on the task card (GitHub issue). Use before a session ends, when quota or max-turns is nearly used up, or before handing work to someone else; the next session (any account) reads it and continues.
---

# Writing a handoff note

Conversation is not state. State is written on the task card, in the PR and in documents.

## When

- A stretch of work is done (PR open, waiting for review or merge).
- Quota, max-turns or time is nearly gone: **write the note first, then stop.** Never stop halfway without one.
- Something needs a person to decide or act (payment, passwords, OAuth, publishing, merging).

## Format (always four parts)

```
## Handoff note (10-25 17:30, S-NNN <session name or Actions run link>, about <N> turns)
**Done**:
- <what was done> (commit `abc1234`, PR #29)
**Current state**:
- Branch `<branch>`, CI <passing / failing: which check>
- <where the unfinished part stopped>
**Next**:
1. <the first thing the next person should do>
**Needs a person**:
- <new items from this session, e.g. "publish release 11 and run the authorize step"; "none" if nothing>. Full list: the pinned "needs owner" issue
**Practices worth capturing**:
- <a way of doing something that took several turns to find out and will be needed again, and which skill or script it
  should become; "none" if nothing>
```

- Write facts with links and commit ids. Do not paste long conversations or logs (link the Actions run instead).
- **Turns**: L1 writes roughly how many turns the session took (count your replies); usage analysis adds it up as the L1
  management cost per card. L2 and L3 do not, because the usage log already has it.
- **Needs a person**: keep everything that needs the owner in one pinned "needs owner" issue (a checklist). L1 edits that
  issue at handoff: add new items, tick finished ones. The note lists only what is new and links to the issue.
  - Every item the owner must do gets an instruction for a web agent, in a quote block under the item. It must stand
    alone, start with a one-or-two-sentence "Background" (what the site or service is and why this is needed), then say:
    "Walk me through step by step: you lead, tell me what to click on the current screen; stop and wait when a secret,
    password or authorization prompt appears." Include the target (document or page link or id), where to change
    what, the values to enter (secrets: name only, the owner types the value), "do not touch anything else", and what
    to report when finished. Payment, passwords and merging need no such instruction.
  - **Session numbers**: the `S-NNN` in the title is claimed from the ledger's "Session numbers" table when an L1
    session starts. Instructions for web agents start with "(sent by S-NNN)" and ask for the first line of the reply to
    repeat `S-NNN`; each item in the needs-owner issue carries the S-NNN too.
- **Practices worth capturing**: when a practice took several turns to work out (the right call for an API, the fix for a
  recurring error), write one sentence: the practice plus the skill or script it should become. The second time the same
  practice appears in a note, L1 opens a small PR that writes it into the skill or script (L1 may do that directly when it
  is only skill text; a script with new logic gets an L2 card). Agents do not write a skill and start using it on their
  own, and they do not add rules to CLAUDE.md (see "Where rules live" in the `l1-session` skill). L2 and L3 write what they
  noticed here and L1 decides.
- Never write secrets, passwords or customer personal data.

## How to post it

```sh
gh issue comment <card number> --repo <OWNER>/<REPO> --body-file handoff.md
```

If `gh` is unavailable, use the GitHub REST API (`POST /repos/<OWNER>/<REPO>/issues/<number>/comments`). When there is no
task card (work the owner gave directly in the conversation), put the same four parts at the end of the PR description or
in the report to the owner.

## When you take over

1. Read the whole task card and the **last** handoff note.
2. Check that the branch and CI match the note (`git fetch`, look at the PR checks).
3. Start from item 1 of "Next". If something is unclear, ask on the card; do not guess.
