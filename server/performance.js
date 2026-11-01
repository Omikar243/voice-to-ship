const MAX_ROUTE_KEYS = 100;
const MAX_SAMPLES_PER_ROUTE = 500;
const METRIC_NAMES = new Set(['CLS', 'FCP', 'INP', 'LCP']);
const samples = new Map();

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
    addSample(routeKey(req), Math.round(elapsed * 100) / 100);
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
