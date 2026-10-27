// After a PR is merged to main (.github/workflows/merge-wrapup.yml) do the bookkeeping an L1 session used to do by hand:
//   1. Ledger: numbers in the "Assigned" column that mention #PR or a card the PR closes (`Closes #N`) move to the
//      front of "Currently used"; the row of that card in the "Active cards and file locks" table is removed.
//      A change opens a bot/wrapup-<PR> branch and a PR labelled auto-merge.
//   2. Optional (config needsOwnerIssue): items in the pinned "needs owner" issue that say "merge #PR" get ticked.
// Rules and scripts only, no model calls. Any failure prints the reason and "wrap up manually" but never fails the
// workflow; the daily status check (scripts/status-check.mjs) catches whatever was missed.
// No ledger in the repo is fine: step 1 is skipped.
// Needs GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, PR_BODY, PR_HEAD_REF.
import { pathToFileURL } from 'node:url';
import { loadConfig, DEFAULTS } from './lib/config.mjs';
import { github } from './lib/github.mjs';
import { closedCards, formatDate } from './lib/locks.mjs';

const MANUAL = 'Wrap up manually';

/* ---------------- pure functions ---------------- */

// Bot PRs (the wrap-up PR itself) are not wrapped up again
export const shouldSkip = (headRef, prefix = DEFAULTS.botBranchPrefix) => String(headRef || '').startsWith(prefix);

const mentions = (text, n) => new RegExp(`#${n}(?!\\d)`).test(text);

// Split a cell on commas outside parentheses
export function splitItems(cell) {
  const items = [];
  let depth = 0;
  let cur = '';
  for (const ch of String(cell)) {
    if (ch === '(') depth++;
    if (ch === ')') depth = Math.max(0, depth - 1);
    if (ch === ',' && depth === 0) {
      items.push(cur);
      cur = '';
    } else cur += ch;
  }
  items.push(cur);
  return items.map((s) => s.trim()).filter(Boolean);
}

const isEmptyCell = (s) => !s || /^[—-]+$/.test(s.trim());

// "1.57 (#187 B-43)" -> "1.57 (10-27, B-43, PR #250)"
export function usedItem(item, { pr, date, numbers }) {
  const m = /^([^(]*)\(([\s\S]*)\)$/.exec(item);
  const head = (m ? m[1] : item).trim();
  let inner = m ? m[2] : '';
  for (const n of numbers) inner = inner.replace(new RegExp(`#${n}(?!\\d)\\s*`), '');
  inner = inner.trim();
  return `${head} (${[date, inner, `PR #${pr}`].filter(Boolean).join(', ')})`;
}

const sectionRange = (lines, heading) => {
  const start = lines.findIndex((l) => l.replace(/\s+$/, '') === `## ${heading}`);
  if (start < 0) throw new Error(`ledger has no "${heading}" section`);
  const next = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return [start + 1, next < 0 ? lines.length : next];
};

const cellsOf = (line) => line.replace(/\r$/, '').replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim());
const isRow = (l) => /^\|/.test(l) && !/^\|[\s|:-]+\|?\s*$/.test(l);

// Returns { text, moved: [items], removedLocks: [first cell of each removed row] }; text is unchanged when nothing applies
export function wrapupLedger(text, { pr, cards = [], date }, config = DEFAULTS) {
  const numbers = [...new Set([pr, ...cards])];
  const lines = text.split('\n');
  const moved = [];
  const removedLocks = [];
  const h = config.ledgerHeadings;

  const [a0, a1] = sectionRange(lines, h.numbers);
  const header = lines.slice(a0, a1).find(isRow);
  const hc = header ? cellsOf(header) : [];
  const usedAt = hc.findIndex((c) => c.includes(config.ledgerColumns.used));
  const assignedAt = hc.findIndex((c) => c.includes(config.ledgerColumns.assigned));
  if (usedAt < 0 || assignedAt < 0) throw new Error(`ledger "${h.numbers}" table columns do not match (need "${config.ledgerColumns.used}" and "${config.ledgerColumns.assigned}")`);
  let seenHeader = false;
  for (let i = a0; i < a1; i++) {
    if (!isRow(lines[i])) continue;
    if (!seenHeader) {
      seenHeader = true;
      continue;
    }
    const cells = cellsOf(lines[i]);
    if (cells.length < Math.max(usedAt, assignedAt) + 1) continue;
    const items = splitItems(isEmptyCell(cells[assignedAt]) ? '' : cells[assignedAt]);
    const hit = items.filter((it) => numbers.some((n) => mentions(it, n)));
    if (!hit.length) continue;
    const rest = items.filter((it) => !hit.includes(it));
    const newUsed = hit.map((it) => usedItem(it, { pr, date, numbers }));
    moved.push(...hit);
    cells[assignedAt] = rest.length ? rest.join(', ') : '—';
    cells[usedAt] = [...newUsed, ...(isEmptyCell(cells[usedAt]) ? [] : [cells[usedAt]])].join('; ');
    lines[i] = `| ${cells.join(' | ')} |${lines[i].endsWith('\r') ? '\r' : ''}`;
  }

  const [l0, l1] = sectionRange(lines, h.locks);
  const keep = [];
  let seenLockHeader = false;
  for (let i = 0; i < lines.length; i++) {
    if (i >= l0 && i < l1 && isRow(lines[i])) {
      if (!seenLockHeader) seenLockHeader = true;
      else {
        const first = cellsOf(lines[i])[0] || '';
        if (cards.some((n) => new RegExp(`^#${n}(\\s|$)`).test(first))) {
          removedLocks.push(first);
          continue;
        }
      }
    }
    keep.push(lines[i]);
  }
  return { text: keep.join('\n'), moved, removedLocks };
}

// Unticked checklist lines that say "merge #pr" get ticked and "(merged MM-DD, auto)" appended; other lines are untouched
export function checkOffLines(text, { pr, date }) {
  const re = new RegExp(`\\bmerge\\s+#${pr}(?!\\d)`, 'i');
  let count = 0;
  const out = String(text)
    .split('\n')
    .map((line) => {
      const m = /^(\s*[-*]\s*)\[ \](.*?)(\s*)(\r?)$/.exec(line);
      if (!m || !re.test(m[2])) return line;
      count++;
      return `${m[1]}[x]${m[2]} (merged ${date}, auto)${m[4]}`;
    })
    .join('\n');
  return { text: out, count };
}

/* ---------------- GitHub calls ---------------- */

async function updateLedger(gh, { pr, cards, date }, config) {
  let file;
  try {
    file = await gh('GET', `/contents/${config.ledgerPath}?ref=main`);
  } catch (err) {
    if (err.status === 404) return console.log(`No ${config.ledgerPath} on main; nothing to wrap up.`);
    throw err;
  }
  const text = Buffer.from(file.content, 'base64').toString('utf8');
  const result = wrapupLedger(text, { pr, cards, date }, config);
  if (result.text === text) return console.log('No ledger numbers or file locks to wrap up; no PR opened.');
  const branch = `${config.botBranchPrefix}wrapup-${pr}`;
  const main = await gh('GET', '/git/ref/heads/main');
  await gh('POST', '/git/refs', { ref: `refs/heads/${branch}`, sha: main.object.sha });
  const title = `ledger: wrap up after PR #${pr} (auto)`;
  await gh('PUT', `/contents/${config.ledgerPath}`, {
    message: title,
    content: Buffer.from(result.text, 'utf8').toString('base64'),
    sha: file.sha,
    branch,
  });
  const body = [
    `Automatic wrap-up after PR #${pr} was merged (scripts/merge-wrapup.mjs). Only the ledger changes.`,
    '',
    ...result.moved.map((m) => `- Number moved to "Currently used": ${m}`),
    ...result.removedLocks.map((l) => `- File lock removed: ${l}`),
  ].join('\n');
  const created = await gh('POST', '/pulls', { title, head: branch, base: 'main', body });
  await gh('POST', `/issues/${created.number}/labels`, { labels: [config.labels.autoMerge] });
  console.log(`Opened wrap-up PR #${created.number} (labelled ${config.labels.autoMerge}).`);
}

async function updateNeedsOwner(gh, { pr, date }, config) {
  const n = config.needsOwnerIssue;
  if (!n) return;
  const issue = await gh('GET', `/issues/${n}`);
  const body = checkOffLines(issue.body || '', { pr, date });
  if (body.count) {
    await gh('PATCH', `/issues/${n}`, { body: body.text });
    console.log(`#${n}: ticked ${body.count} item(s) in the description.`);
  }
  for (let page = 1; page <= 10; page++) {
    const batch = await gh('GET', `/issues/${n}/comments?per_page=100&page=${page}`);
    for (const c of batch) {
      const r = checkOffLines(c.body || '', { pr, date });
      if (!r.count) continue;
      await gh('PATCH', `/issues/comments/${c.id}`, { body: r.text });
      console.log(`#${n}: ticked ${r.count} item(s) in comment ${c.id}.`);
    }
    if (batch.length < 100) break;
  }
}

export async function run(gh, { pr, body, headRef, time = new Date() }, config = DEFAULTS) {
  if (shouldSkip(headRef, config.botBranchPrefix)) return console.log(`Head branch ${headRef} belongs to a bot; skipping the wrap-up.`);
  const cards = closedCards(body);
  const date = formatDate(time, config.timezone);
  const steps = [
    ['ledger', () => updateLedger(gh, { pr, cards, date }, config)],
    [`#${config.needsOwnerIssue}`, () => updateNeedsOwner(gh, { pr, date }, config)],
  ];
  for (const [name, step] of steps) {
    try {
      await step();
    } catch (err) {
      console.log(`Wrap-up step ${name} failed: ${String(err?.message || err).slice(0, 300)}. ${MANUAL}.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { GITHUB_TOKEN, GITHUB_REPOSITORY, PR_NUMBER, PR_BODY, PR_HEAD_REF } = process.env;
  const config = loadConfig();
  if (!GITHUB_TOKEN || !PR_NUMBER) console.log(`GITHUB_TOKEN or PR_NUMBER is missing. ${MANUAL}.`);
  else
    run(github(GITHUB_TOKEN, config.repo || GITHUB_REPOSITORY), { pr: Number(PR_NUMBER), body: PR_BODY, headRef: PR_HEAD_REF }, config).catch((err) => {
      console.log(`Wrap-up failed: ${String(err?.message || err).slice(0, 300)}. ${MANUAL}.`);
    });
}
