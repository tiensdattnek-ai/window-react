import express from 'express';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createShellServer } from './pty.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const production = process.argv.includes('--production') || process.env.NODE_ENV === 'production';
const app = express();
const server = http.createServer(app);
const port = Number(process.env.PORT) || 3000;
// A real shell (PowerShell / bash / zsh…) over WebSocket for the Terminal app. See server/pty.js.
const shell = await createShellServer(server, root);
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});
app.get('/api/health', (_req, res) =>
  res.json({ status: 'ok', name: 'Window React', version: '1.0.0' }),
);
app.get('/api/system', (_req, res) =>
  res.json({
    name: 'Window React',
    version: '1.0.0',
    runtime: `Node.js ${process.versions.node}`,
    platform: os.platform(),
    architecture: os.arch(),
    uptime: Math.floor(process.uptime()),
    memory: { used: process.memoryUsage().rss, total: os.totalmem() },
    cpus: os.availableParallelism(),
    mode: production ? 'production' : 'development',
    shell: {
      enabled: shell.enabled,
      reason: shell.reason,
      code: shell.code,
      protected: Boolean(process.env.WR_SHELL_TOKEN),
      // Details wait until the token has been checked on a protected server.
      ...(process.env.WR_SHELL_TOKEN ? {} : { cwd: shell.cwd, shells: shell.shells }),
      sessions: shell.sessions(),
    },
  }),
);

const weatherCache = new Map();
async function getJson(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error('Weather provider unavailable');
  return response.json();
}
app.get('/api/weather', async (req, res) => {
  const city = String(req.query.city || 'Da Nang')
    .trim()
    .slice(0, 80);
  if (!city) return res.status(400).json({ error: 'Enter a city name.' });
  const key = city.toLowerCase();
  const cached = weatherCache.get(key);
  if (cached && Date.now() - cached.time < 600000) return res.json(cached.data);
  try {
    const geo = await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`,
    );
    const place = geo.results?.[0];
    if (!place) return res.status(404).json({ error: 'City not found. Try a nearby city.' });
    const query = new URLSearchParams({
      latitude: place.latitude,
      longitude: place.longitude,
      current:
        'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,wind_speed_10m',
      daily:
        'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,precipitation_probability_max',
      hourly: 'temperature_2m,weather_code',
      timezone: 'auto',
      forecast_days: '7',
    });
    const forecast = await getJson(`https://api.open-meteo.com/v1/forecast?${query}`);
    const data = { city: place.name, country: place.country, ...forecast };
    if (weatherCache.size > 100) weatherCache.clear();
    weatherCache.set(key, { time: Date.now(), data });
    res.json(data);
  } catch {
    res
      .status(503)
      .json({ error: 'The weather service is taking a break. Please try again shortly.' });
  }
});
app.use('/api', (_req, res) => res.status(404).json({ error: 'Endpoint not found.' }));

if (production) {
  app.use(express.static(path.join(root, 'dist'), { maxAge: '1h' }));
  app.get('*', (_req, res) => res.sendFile(path.join(root, 'dist', 'index.html')));
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    root,
    server: { middlewareMode: true, host: '0.0.0.0', allowedHosts: true, hmr: { server } },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}
server.listen(port, '0.0.0.0', () => {
  console.log(
    `\n  ▦ Window React v1.0\n  ➜ Local:   http://localhost:${port}\n  ➜ Network: http://0.0.0.0:${port}\n  ➜ Mode:    ${production ? 'production' : 'development'}\n  ➜ shell:   ${shell.enabled ? `${shell.shells.map((s) => s.name).join(', ')} in ${shell.cwd}` : shell.reason}\n`,
  );
});
for (const signal of ['SIGINT', 'SIGTERM'])
  process.on(signal, () => {
    shell.close();
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 3000).unref();
  });
