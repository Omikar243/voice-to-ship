import { getPool } from './database.js';

const MAX_ROUTE_KEYS = 100;
const MAX_SAMPLES_PER_ROUTE = 500;
const METRIC_NAMES = new Set(['CLS', 'FCP', 'INP', 'LCP']);
const samples = new Map();
const environment = process.env.APP_ENV === 'production' ? 'production' : 'preview';

function routeKey(req) {
  const path = typeof req.route?.path === 'string' ? req.route.path : req.path || req.url?.split('?')[0] || 'unknown';
  return `${req.method} ${String(path).slice(0, 120)}`;
}

function boundedNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 120_000 ? number : null;
}

function addSample(key, duration) {
  if (!samples.has(key) && samples.size >= MAX_ROUTE_KEYS) return;
  const values = samples.get(key) ?? [];
  values.push(duration);
  if (values.length > MAX_SAMPLES_PER_ROUTE) values.shift();
  samples.set(key, values);
}

function percentile(values, fraction) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

export function performanceMiddleware(req, res, next) {
  const startedAt = process.hrtime.bigint();
  res.once('finish', () => {
    const elapsed = Number(process.hrtime.bigint() - startedAt) / 1e6;
    const value = Math.round(elapsed * 100) / 100;
    addSample(routeKey(req), value);
    void recordPersistentPerformanceSample('server', routeKey(req), value);
  });
  next();
}

export function recordBrowserMetric(name, value) {
  const metric = String(name).toUpperCase();
  const number = boundedNumber(value);
  if (!METRIC_NAMES.has(metric) || number === null) return false;
  addSample(`browser ${metric}`, Math.round(number * 100) / 100);
  return true;
}

export async function recordPersistentPerformanceSample(sampleSource, metricName, value) {
  const bounded = boundedNumber(value);
  if (!['server', 'browser'].includes(sampleSource) || bounded === null || typeof metricName !== 'string' || !metricName.length || metricName.length > 128) return;
  try {
    await getPool().execute(
      `INSERT INTO performance_samples (app_env, sample_date, sample_source, metric_name, value_ms)
       VALUES (?, CURRENT_DATE, ?, ?, ?)`,
      [environment, sampleSource, metricName, bounded],
    );
  } catch {
    // Monitoring must never affect the request or visitor experience.
  }
}

export async function cleanupPerformanceSamples() {
  try {
    await getPool().execute("DELETE FROM performance_samples WHERE created_at < CURRENT_TIMESTAMP - INTERVAL '30 days'");
  } catch {
    // Cleanup is best effort.
  }
}

export async function readPerformanceHistory(req) {
  const { resolveOwnerAuthentication, HttpError } = await import('./auth.js');
  const auth = await resolveOwnerAuthentication(req);
  if (!auth.authenticated) throw new HttpError(401, 'Authentication required');
  if (!auth.owner) throw new HttpError(403, 'Owner access required');
  const periodDays = req.query.days === undefined ? 30 : Number(req.query.days);
  if (![7, 30, 90].includes(periodDays)) throw new HttpError(400, 'Invalid performance period');
  const source = req.query.source;
  if (!['live', 'preview'].includes(source)) throw new HttpError(400, 'Invalid performance source');
  const appEnvironment = source === 'live' ? 'production' : 'preview';
  const [rows] = await getPool().execute(
    `SELECT sample_date, sample_source, metric_name, value_ms
     FROM performance_samples
     WHERE app_env = ? AND sample_date >= CURRENT_DATE - (?::int * INTERVAL '1 day')
     ORDER BY sample_date ASC`,
    [appEnvironment, periodDays - 1],
  );
  const grouped = new Map();
  for (const row of rows) {
    const key = `${row.sample_date}|${row.sample_source}|${row.metric_name}`;
    const item = grouped.get(key) ?? { date: String(row.sample_date), sampleSource: row.sample_source, metric: row.metric_name, values: [] };
    item.values.push(Number(row.value_ms));
    grouped.set(key, item);
  }
  return {
    authenticated: true,
    periodDays,
    source,
    series: [...grouped.values()].map(({ values, ...item }) => ({ ...item, samples: values.length, p50Ms: percentile(values, 0.5), p95Ms: percentile(values, 0.95) })),
  };
}

export function performanceSnapshot() {
  return [...samples.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([route, values]) => ({
    route,
    samples: values.length,
    p50Ms: percentile(values, 0.5),
    p95Ms: percentile(values, 0.95),
  }));
}

export function resetPerformanceSamples() {
  samples.clear();
}

export function validateBrowserMetric(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).length !== 2) return false;
  return typeof body.name === 'string' && typeof body.value === 'number' && recordBrowserMetric(body.name, body.value);
}
