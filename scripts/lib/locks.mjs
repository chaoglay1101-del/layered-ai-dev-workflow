// Task cards and file locks: pure functions, no network.
// A task card is a GitHub issue made from the issue form; every field becomes a "### Label" section.
// The "files" section is the file lock: the card may only change what is listed there.

const EMPTY = /^_?No response_?$/i;

// "### Field" blocks -> { Field: text }; "_No response_" counts as empty; a trailing "---" signature is dropped
export function cardSections(body) {
  const sections = {};
  let name = null;
  for (const line of String(body || '').split(/\r?\n/)) {
    const heading = line.match(/^###\s+(.+?)\s*$/);
    if (heading) {
      name = heading[1];
      sections[name] = [];
    } else if (name) sections[name].push(line);
  }
  for (const key of Object.keys(sections)) {
    const text = sections[key].join('\n').replace(/\n---\n[\s\S]*$/, '').trim();
    sections[key] = EMPTY.test(text) ? '' : text;
  }
  return sections;
}

// Lock entries: one per line or comma separated. Bullets, backticks and (parenthesised notes) are dropped.
// "Doc: A, B" becomes "Doc: A", "Doc: B"; doc locks are not file paths and never match a changed file.
export function parseLocks(text) {
  const locks = [];
  for (const raw of String(text || '').split(/\r?\n/)) {
    let line = raw.replace(/^\s*[-*]\s+/, '').replace(/`/g, '');
    for (let before = ''; before !== line; ) {
      before = line;
      line = line.replace(/\([^()]*\)/g, ''); // innermost first, so nested notes disappear
    }
    line = line.trim();
    if (!line) continue;
    const doc = line.match(/^Doc:\s*(.*)$/i);
    if (doc) line = doc[1];
    for (const part of line.split(/,/)) {
      const item = part.trim();
      if (!item || /^none$/i.test(item)) continue;
      locks.push(doc ? `Doc: ${item}` : item.replace(/^\.\//, ''));
    }
  }
  return [...new Set(locks)];
}

// The lock list of a card body; `heading` comes from config (cardHeadings.files)
export function cardLocks(body, heading = 'Files and docs to change') {
  const text = cardSections(body)[heading];
  return text ? parseLocks(text) : [];
}

const isFile = (item) => !/^Doc:/i.test(item);

// Same path, or one of them is a folder (trailing /) that contains the other
export function sameLock(a, b) {
  if (a === b) return true;
  if (!isFile(a) || !isFile(b)) return false;
  return (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b));
}

// Entries of list `a` that collide with something in list `b`
export function overlaps(a, b) {
  return a.filter((x) => b.some((y) => sameLock(x, y)));
}

// Changed files that no lock covers. `ignored` are paths (or folder prefixes) that are always allowed.
export function outsideLocks(changed, locks, ignored = []) {
  const allowed = (file) => ignored.some((p) => file === p || (p.endsWith('/') && file.startsWith(p)));
  return changed.filter((file) => !allowed(file) && !locks.some((lock) => isFile(lock) && sameLock(lock, file)));
}

// Pairs of cards [{ number, locks }] whose locks collide -> [{ a, b, files }]
export function findOverlaps(cards) {
  const out = [];
  for (let i = 0; i < cards.length; i++) {
    for (let j = i + 1; j < cards.length; j++) {
      const files = cards[i].locks.flatMap((f) => cards[j].locks.filter((g) => sameLock(f, g)).map((g) => (f.length >= g.length ? f : g)));
      if (files.length) out.push({ a: cards[i].number, b: cards[j].number, files: [...new Set(files)] });
    }
  }
  return out;
}

// "Closes #N" / "Fixes #N" / "Resolves #N" in a PR description (first one)
export function closedIssue(body) {
  const m = /\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\s*:?\s+#(\d+)/i.exec(String(body || ''));
  return m ? Number(m[1]) : null;
}

// Every card number a PR closes ("Closes #1, #2 and #3"), without duplicates
export function closedCards(body) {
  const numbers = new Set();
  for (const m of String(body || '').matchAll(/\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\b:?\s+((?:#\d+(?:\s*(?:,|and|&)\s*)?)+)/gi)) {
    for (const n of m[1].matchAll(/#(\d+)/g)) numbers.add(Number(n[1]));
  }
  return [...numbers];
}

// MM-DD in the given IANA time zone
export function formatDate(time = new Date(), timeZone = 'UTC') {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone, month: '2-digit', day: '2-digit' }).formatToParts(time);
  const part = (type) => parts.find((p) => p.type === type).value;
  return `${part('month')}-${part('day')}`;
}
