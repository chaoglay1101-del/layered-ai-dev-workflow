// File-lock and number check for a pull request. Run by .github/workflows/lock-check.yml on pull_request.
//
//   1. File lock: when the PR description has `Closes #N`, changing a file outside the "Files and docs to change"
//      section of card #N fails. A PR without `Closes` skips this check.
//   2. Overlap: files that another open card (labelled agent:ready / agent:running) has locked produce a warning
//      in the job summary only.
//   3. Number collisions, read from the ledger on the PR head: the same number twice in one "Assigned" cell,
//      an assigned number that is also in "Currently used" on the same row, and duplicate session numbers fail.
//      Duplicates in the free-text history inside "Currently used" do not count.
//
// Pure functions and GitHub calls are separate. Needs GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER.
// No ledger on the PR head (a repo that does not use one) is not an error: that check is skipped.
import { appendFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { loadConfig, DEFAULTS } from './lib/config.mjs';
import { github, paged } from './lib/github.mjs';
import { cardLocks, closedIssue, outsideLocks, overlaps } from './lib/locks.mjs';
import { ledgerProblems, numbersIn } from './lib/ledger.mjs';

export { cardLocks, closedIssue, ledgerProblems, numbersIn };

/* ---------------- pure functions ---------------- */

// Files changed by the PR that sit outside the locks of card #N
export function lockViolations(changed, locks, ignored = DEFAULTS.ignoredPaths) {
  return outsideLocks(changed, locks, ignored);
}

// Other cards (not the one the PR closes) whose locks the PR touches -> [{ number, files }]
export function lockWarnings(changed, cards, closes) {
  const out = [];
  for (const c of cards) {
    if (c.number === closes) continue;
    const files = [...new Set(changed.flatMap((f) => overlaps([f], c.locks)))];
    if (files.length) out.push({ number: c.number, files });
  }
  return out;
}

// pr: { body, files }; cards: [{ number, locks }]; closesLocks: locks of card #N (null without Closes)
export function check({ pr, cards, closesLocks, ledgerText, config = DEFAULTS }) {
  const closes = closedIssue(pr.body);
  const errors = [];
  const warnings = [];
  if (closes && closesLocks) {
    const out = lockViolations(pr.files, closesLocks, config.ignoredPaths);
    if (out.length) errors.push(`Changed files outside the file lock of card #${closes}: ${out.join(', ')}.`);
  }
  for (const w of lockWarnings(pr.files, cards, closes)) warnings.push(`Touches files locked by card #${w.number}: ${w.files.join(', ')}.`);
  if (typeof ledgerText === 'string') for (const p of ledgerProblems(ledgerText, config)) errors.push(p.text);
  return { closes, errors, warnings };
}

export function renderSummary({ closes, errors, warnings }) {
  const lines = ['## File lock and number check', ''];
  lines.push(closes ? `Card: #${closes}` : 'No `Closes #N` in the PR description; file lock check skipped.', '');
  if (errors.length) lines.push('**Failed**', '', ...errors.map((e) => `- ${e}`), '');
  if (warnings.length) lines.push('**Warnings (do not block the merge)**', '', ...warnings.map((w) => `- ${w}`), '');
  if (!errors.length && !warnings.length) lines.push('All checks passed.', '');
  return lines.join('\n');
}

/* ---------------- GitHub ---------------- */

async function openLockCards(gh, config) {
  const byNumber = new Map();
  for (const label of config.labels.lock) {
    for (const i of await paged(gh, `/issues?labels=${encodeURIComponent(label)}&state=open`)) {
      if (!i.pull_request) byNumber.set(i.number, { number: i.number, locks: cardLocks(i.body, config.cardHeadings.files) });
    }
  }
  return [...byNumber.values()];
}

async function main() {
  const env = process.env;
  const config = loadConfig();
  if (!env.GITHUB_TOKEN || !env.PR_NUMBER) {
    console.log('GITHUB_TOKEN or PR_NUMBER is not set; skipping the lock check.');
    return;
  }
  const gh = github(env.GITHUB_TOKEN, config.repo || env.GITHUB_REPOSITORY);
  const pr = await gh('GET', `/pulls/${env.PR_NUMBER}`);
  const files = (await paged(gh, `/pulls/${env.PR_NUMBER}/files`)).flatMap((f) => [f.filename, ...(f.previous_filename ? [f.previous_filename] : [])]);
  const closes = closedIssue(pr.body);
  const closesLocks = closes ? cardLocks((await gh('GET', `/issues/${closes}`)).body, config.cardHeadings.files) : null;
  let ledgerText = null;
  try {
    const f = await gh('GET', `/contents/${config.ledgerPath}?ref=${pr.head.sha}`);
    ledgerText = Buffer.from(f.content, 'base64').toString('utf8');
  } catch (err) {
    console.log(`No ${config.ledgerPath} on the PR head, skipping the number check (${err.status || err.message}).`);
  }
  const result = check({ pr: { body: pr.body, files }, cards: await openLockCards(gh, config), closesLocks, ledgerText, config });
  const summary = renderSummary(result);
  console.log(summary);
  if (env.GITHUB_STEP_SUMMARY) appendFileSync(env.GITHUB_STEP_SUMMARY, summary + '\n');
  for (const w of result.warnings) console.log(`::warning::${w}`);
  for (const e of result.errors) console.log(`::error::${e}`);
  if (result.errors.length) process.exit(1);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err.message);
    process.exit(1);
  });
}
