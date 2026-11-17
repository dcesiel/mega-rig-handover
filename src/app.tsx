import { Hono } from 'hono';
import { loadConfig, type RigConfig } from './config.js';
import { lane } from './lane.js';
import { readNight } from './digest/read.js';
import { readStatus } from './status.js';
import { Layout } from './views/layout.js';
import { DigestPage } from './views/digest.js';
import { StatusBoard } from './views/status.js';

export function createApp(config: RigConfig = loadConfig()) {
  const app = new Hono();

  app.get('/health', (c) => c.json({ ok: true, lane: lane().id }));

  app.get('/', (c) =>
    c.html(
      <Layout title="status" lane={lane()}>
        <StatusBoard status={readStatus(config)} />
      </Layout>,
    ),
  );

  app.get('/digest/:night', (c) => {
    const n = readNight(config.runsDir, c.req.param('night'));
    if (!n) return c.html(<Layout title="not found" lane={lane()}><p class="mute">no such night</p></Layout>, 404);
    return c.html(
      <Layout title={`digest ${n.night}`} lane={lane()}>
        <DigestPage night={n} />
      </Layout>,
    );
  });

  app.get('/api/digest/:night', (c) => {
    const n = readNight(config.runsDir, c.req.param('night'));
    if (!n) return c.json({ error: 'not found' }, 404);
    return c.json({ night: n.night, badLines: n.badLines, rows: n.rows });
  });

  return app;
}
