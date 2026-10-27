// Reading .agents/ledger.md: pure functions, no network.
// The ledger is a Markdown file with three tables (headings and column names come from workflow.config.json):
//   Numbers                       one row per resource: | Resource | Currently used | Assigned (unmerged) | Notes |
//   Session numbers               | S-NNN | what the session did | date |
//   Active cards and file locks   | #card title | level | files | numbers |
import { DEFAULTS } from './config.mjs';
import { findOverlaps } from './locks.mjs';

export const tableRows = (lines) =>
  lines
    .filter((l) => /^\|/.test(l) && !/^\|[\s|:-]+\|?\s*$/.test(l))
    .map((l) => l.replace(/\r$/, '').replace(/^\||\|\s*$/g, '').split('|').map((c) => c.trim()));

// Lines under "## <heading>" (exact title match) up to the next "## " heading; [] when missing
export function section(text, heading) {
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((l) => /^##\s/.test(l) && l.replace(/^##\s+/, '').trim() === heading);
  if (start < 0) return [];
  const end = lines.findIndex((l, i) => i > start && /^##\s/.test(l));
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

// Version numbers like 1.57 and four-digit migration numbers like 0012 inside a cell.
// "#123", "PR #123" and dates such as 10-26 are not numbers.
export function numbersIn(cell) {
  const text = String(cell || '');
  return [...text.matchAll(/(?<![\d.#/-])(\d+\.\d+|\d{4})(?![\d./-])/g)].map((m) => m[1]);
}

// Problems that fail CI: [{ kind, text }]
export function ledgerProblems(text, config = DEFAULTS) {
  const problems = [];
  const h = config.ledgerHeadings;
  for (const cells of tableRows(section(text, h.numbers)).slice(1)) {
    const [resource, used = '', assigned = ''] = cells;
    const seen = new Set();
    for (const n of numbersIn(assigned)) {
      if (seen.has(n)) problems.push({ kind: 'assigned-duplicate', text: `"${resource}": ${n} appears twice in the Assigned column.` });
      seen.add(n);
    }
    const inUsed = new Set(numbersIn(used));
    for (const n of seen) if (inUsed.has(n)) problems.push({ kind: 'assigned-used', text: `"${resource}": ${n} is assigned but is also in Currently used on the same row.` });
  }
  const sessions = new Set();
  const reported = new Set();
  for (const [first] of tableRows(section(text, h.sessions)).slice(1)) {
    const s = /^S-\d+$/.exec(first || '')?.[0];
    if (!s) continue;
    if (sessions.has(s) && !reported.has(s)) {
      problems.push({ kind: 'session-duplicate', text: `Session number ${s} appears twice.` });
      reported.add(s);
    }
    sessions.add(s);
  }
  return problems;
}

// { cards: card numbers in the "Active cards" table, assigned: [{ pr, resource }] PR numbers in the Assigned column }
export function parseLedger(text, config = DEFAULTS) {
  const h = config.ledgerHeadings;
  const cards = [];
  for (const [first] of tableRows(section(text, h.locks)).slice(1)) {
    const m = /#(\d+)/.exec(first || '');
    if (m) cards.push(Number(m[1]));
  }
  const assigned = [];
  const rows = tableRows(section(text, h.numbers));
  const col = Math.max(0, (rows[0] || []).findIndex((c) => c.includes(config.ledgerColumns.assigned)));
  for (const cells of rows.slice(1)) {
    for (const m of (cells[col] || '').matchAll(/PR\s*#(\d+)/g)) assigned.push({ pr: Number(m[1]), resource: cells[0] });
  }
  return { cards, assigned };
}

export { findOverlaps };
