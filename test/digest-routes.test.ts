import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

function appWith(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, `${name}.jsonl`), text);
  return createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: dir });
}
const line = (job: string, status: string, owner: string | null = 'rook') =>
  JSON.stringify({ at: '2026-10-28T23:00:00+01:00', job, status, owner });

describe('digest routes', () => {
  const app = appWith({
    '2026-10-28': [line('b/job', 'ok'), 'not json', line('a/job', 'fail', null)].join('\n') + '\n',
    '2026-10-27': '',
  });

  it('page: 200, sorted by job, bad line skipped, null owner as —', async () => {
    const res = await app.request('/digest/2026-10-28');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('—');
    expect(html).toContain('✕ fail');
    expect(html).toContain('1 unreadable line skipped');
  });
  it('page: empty night renders nothing ran', async () => {
    const res = await app.request('/digest/2026-10-27');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });
  it('page and JSON: 404 for a night with no file', async () => {
    expect((await app.request('/digest/2000-01-01')).status).toBe(404);
    expect((await app.request('/api/digest/2000-01-01')).status).toBe(404);
  });
  it('JSON: same jobs in the same order as the page', async () => {
    const res = await app.request('/api/digest/2026-10-28');
    const j = (await res.json()) as { rows: { job: string }[]; badLines: number };
    expect(res.status).toBe(200);
    expect(j.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(j.badLines).toBe(1);
    const html = await (await app.request('/digest/2026-10-28')).text();
    const order = j.rows.map((r) => html.indexOf(r.job));
    expect(order).toEqual([...order].sort((x, y) => x - y));
  });
  it('JSON: empty night has no rows', async () => {
    const j = (await (await app.request('/api/digest/2026-10-27')).json()) as { rows: unknown[] };
    expect(j.rows).toEqual([]);
  });
  it('board links each night with counts', async () => {
    const html = await (await createApp({ adapter: 's', installed: 'x', beatEverySeconds: 60, runsDir: 'runs' }).request('/')).text();
    for (const n of ['2026-10-27', '2026-10-28']) {
      expect(html).toContain(`href="/digest/${n}"`);
      const r = await createApp({ adapter: 's', installed: 'x', beatEverySeconds: 60, runsDir: 'runs' }).request(`/digest/${n}`);
      expect(r.status).toBe(200);
    }
    expect(html).toMatch(/ok \d+ · retry \d+ · fail \d+/);
  });
});
