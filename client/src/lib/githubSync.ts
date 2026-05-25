export interface SyncPayload {
  version: number;
  exportedAt: string;
  appName: string;
  tasks: any[];
  taskConnections: any[];
}

function getRepoInfo(): { owner: string; repo: string } | null {
  const { hostname, pathname } = window.location;
  if (hostname.endsWith('.github.io')) {
    const owner = hostname.split('.')[0];
    const repo = pathname.split('/')[1] || '';
    if (owner && repo) return { owner, repo };
  }
  return null;
}

export async function fetchRepoJson(
  pat: string,
  path: string = 'data/tasks.json',
  branch: string = 'main'
): Promise<SyncPayload | null> {
  const info = getRepoInfo();
  if (!info) return null;

  const res = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}?ref=${branch}`,
    {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  if (!data.content) return null;
  const cleaned = data.content.replace(/\n/g, '');
  const decoded = decodeURIComponent(escape(atob(cleaned)));
  return JSON.parse(decoded);
}

export async function getFileSha(
  pat: string,
  path: string = 'data/tasks.json'
): Promise<string | null> {
  const info = getRepoInfo();
  if (!info) return null;

  const res = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`,
    {
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return data.sha;
}

export async function updateRepoJson(
  pat: string,
  payload: SyncPayload,
  path: string = 'data/tasks.json',
  branch: string = 'main'
): Promise<boolean> {
  const info = getRepoInfo();
  if (!info) return false;

  const sha = await getFileSha(pat, path);
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

  const res = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Update tasks data',
        content,
        sha,
        branch,
      }),
    }
  );

  return res.ok;
}

export async function createRepoJson(
  pat: string,
  payload: SyncPayload,
  path: string = 'data/tasks.json',
  branch: string = 'main'
): Promise<boolean> {
  const info = getRepoInfo();
  if (!info) return false;

  const content = btoa(unescape(encodeURIComponent(JSON.stringify(payload, null, 2))));

  const res = await fetch(
    `https://api.github.com/repos/${info.owner}/${info.repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${pat}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'Create tasks data',
        content,
        branch,
      }),
    }
  );

  return res.ok;
}

let _requestPush: (() => void) | null = null;

export function registerSyncPush(fn: () => void) {
  _requestPush = fn;
}

export function requestSyncPush() {
  _requestPush?.();
}
