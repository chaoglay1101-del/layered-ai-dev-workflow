// Minimal GitHub REST wrapper (Node 20+ built-in fetch). gh(method, path, body) -> parsed JSON.
export function github(token, repo) {
  return async (method, path, body) => {
    const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        ...(body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const err = new Error(`GitHub ${method} ${path}: ${res.status} ${await res.text()}`);
      err.status = res.status;
      throw err;
    }
    return res.status === 204 ? null : res.json();
  };
}

// GET every page of a list endpoint (up to 10 pages of 100)
export async function paged(gh, path) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const sep = path.includes('?') ? '&' : '?';
    const batch = await gh('GET', `${path}${sep}per_page=100&page=${page}`);
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}
