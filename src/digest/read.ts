import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { DigestRow, Night, Status } from './types.js';

export { type DigestRow, type Night } from './types.js';

const STATUSES: readonly string[] = ['ok', 'retry', 'fail'];

type Line = { at: string; job: string; status: Status; owner: string | null; error: string | null };

function parseLine(text: string): Line | null {
  let v: unknown;
  try {
    v = JSON.parse(text);
  } catch {
    return null;
  }
  if (typeof v !== 'object' || v === null) return null;
  const o = v as Record<string, unknown>;
  if (typeof o.at !== 'string' || typeof o.job !== 'string') return null;
  if (typeof o.status !== 'string' || !STATUSES.includes(o.status)) return null;
  return {
    at: o.at,
    job: o.job,
    status: o.status as Status,
    owner: typeof o.owner === 'string' ? o.owner : null,
    error: typeof o.error === 'string' ? o.error : null,
  };
}

export function readNight(runsDir: string, night: string): Night | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const path = join(runsDir, `${night}.jsonl`);
  if (!existsSync(path)) return null;
  const rows = new Map<string, DigestRow>();
  let badLines = 0;
  for (const text of readFileSync(path, 'utf8').split('\n')) {
    if (text.trim() === '') continue;
    const l = parseLine(text);
    if (!l) {
      badLines++;
      continue;
    }
    const r = rows.get(l.job);
    if (!r) {
      rows.set(l.job, {
        job: l.job, owner: l.owner, runs: 1, retries: l.status === 'retry' ? 1 : 0,
        lastStatus: l.status, lastError: l.error, first: l.at, last: l.at,
      });
      continue;
    }
    r.runs++;
    if (l.status === 'retry') r.retries++;
    r.owner = l.owner ?? r.owner;
    r.lastStatus = l.status;
    r.lastError = l.error ?? r.lastError;
    if (l.at < r.first) r.first = l.at;
    if (l.at > r.last) r.last = l.at;
  }
  return { night, rows: [...rows.values()].sort((a, b) => a.job.localeCompare(b.job)), badLines };
}
