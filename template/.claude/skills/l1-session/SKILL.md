---
name: l1-session
description: Working rules for L1 (the lead agent session): claim S-NNN at the start, suggest a model, save quota, ask the owner multiple-choice questions, self-check before replying, hand off to the next session. L1 reads it once at the start; L2, L3 and Actions do not need it.
---

# L1 session rules

CLAUDE.md and AGENTS.md hold only the rules every turn needs. Details that only L1 needs live here, so L2 runs on Actions
do not re-read them on every turn.

## Where rules live

- **CLAUDE.md / AGENTS.md**: hard rules every agent follows every turn. Keep them short.
- **Skills** (`.claude/skills/`): details for one role or workflow, read when needed.
- **CI or hooks**: a rule a program can check (file locks, number collisions, spec sync) becomes a check. Once it exists,
  delete the prose rule and write "CI blocks this".
- When the same handling appears a second time, write a skill or script (see "Practices worth capturing" in the
  `handoff` skill) instead of adding another line to CLAUDE.md.

## Start

1. Claim the next `S-NNN` from "Session numbers" in `.agents/ledger.md`. The handoff note title says
   "Handoff note (date time, S-NNN, ...)"; items in the needs-owner issue and instructions for web agents start with
   "(sent by S-NNN)" and ask the web agent to repeat `S-NNN` on the first line of its reply.
2. **Suggest the model first**, in one line: "this work suggests model X" with the reason. Routine work (watching CI,
   merging, labels, updating the to-do list) uses the mid-size model; read-only bulk reading goes to the explore
   sub-agent (small model); decomposition, spec edits and architecture decisions suggest the strongest model, and the
   owner switches with `/model` before you continue. L1 does not write code: open a task card for L2. L1 cannot switch
   its own model; when unsure, suggest one level higher and say why.
3. When ordering work, do the items marked as quota-saving first.

## Saving quota

L1 and L2 may draw on the same quota. Each turn re-reads the whole conversation, so cost is roughly context length times
number of turns.

- When a batch of work is done, or the conversation was compacted once, leave a handoff note (`handoff` skill) and end
  the session. Start the next batch in a new session from the note, without the old conversation.
- Subscribe only to PRs that need watching (code that can fail or will be reviewed). PRs that change only drafts or
  documents are not subscribed; check them together with one timed reminder.
- Write multi-step operations as one script that does it all, not one step per turn. Put independent tool calls in one turn.
- Do not load big skills or documents to look up fixed data (keep prices in a config file). Hand large reading to a lower
  layer (L3 summary, explore sub-agent); L1 only verifies and decides. Read-only work such as reading big files, CI logs,
  searching code or tidying a list goes to the explore sub-agent without asking the owner. One or two tool calls do not
  need a sub-agent.
- Do not switch models in the middle of a long conversation (the cache is lost and the new model re-reads everything);
  switch only between tasks.

## Asking the owner

- **Use multiple choice**: turn decisions into questions with 2 to 4 options, the recommended option first and marked
  "recommended". Each option says what happens next and which model to use. Use the interactive question tool if you
  have one (at most 4 questions at a time); otherwise number the options so the owner can answer "1A 2B".
- When a question involves merging a PR, always include the option "merge it for me": choosing it authorizes L1 to merge
  once CI is green, through the API.
- For a plain yes/no, still say which model the next step should use.
- **Self-check before sending**: if the reply ends with "should I", "okay?" or "what next", turn it into a multiple-choice
  question. At handoff, check one by one: handoff note, needs-owner issue, instructions for web agents, S-NNN.

## Splitting and starting the next session

- When the conversation is long, a task just finished and the next step is a simple answer, ask the owner "split here?"
  (yes or no). L1 cannot measure context length well, so ask late rather than early; do not split very short conversations.
- If the owner says yes, or L1 proposes handoff:
  1. Claim the next `S-NNN` in `.agents/ledger.md`.
  2. Leave the handoff note on the task card.
  3. Open a new session on the same repo (title `S-NNN ...`, suggested model, prompt: "read CLAUDE.md and the last
     handoff note on the card, then continue with X").
  4. Tell the owner where the new session is and which model it uses.
