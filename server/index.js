import express from 'express';
import { createReadStream } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyMigrations } from './database.js';
import {
  APP_SESSION_COOKIE,
  OAUTH_STATE_COOKIE,
  appendCookie,
  clearCookie,
  completeAuthorization,
  cookieOptionsForRequest,
  createAuthorization,
  revokeCurrentSession,
  HttpError,
} from './auth.js';
import {
  readAnalyticsSummary,
  recordAnalyticsEvent,
  startRetentionCleanup,
  validatePublicEvent,
} from './analytics.js';

const serverDirectory = path.dirname(fileURLToPath(import.meta.url));
const projectDirectory = path.dirname(serverDirectory);
const resumeFilePath = path.join(serverDirectory, 'assets', 'Omkar_Shettigar_Profile.pdf');
const app = express();
let migrationReady = false;
let analyticsWindowStartedAt = Date.now();
let analyticsWindowEventCount = 0;
const ANALYTICS_WINDOW_MS = 60_000;
const ANALYTICS_WINDOW_MAX_EVENTS = 1_200;

app.disable('x-powered-by');
app.use(express.json({ limit: '2kb', strict: true }));

app.get('/api/health', (_req, res) => {
  if (!migrationReady) return res.status(503).json({ status: 'not_ready' });
  return res.status(200).json({ status: 'ok' });
});

app.post('/api/analytics/events', async (req, res) => {
  const now = Date.now();
  if (now - analyticsWindowStartedAt >= ANALYTICS_WINDOW_MS) {
    analyticsWindowStartedAt = now;
    analyticsWindowEventCount = 0;
  }
  if (analyticsWindowEventCount >= ANALYTICS_WINDOW_MAX_EVENTS) {
    res.setHeader('Retry-After', '60');
    return res.status(429).json({ error: 'Analytics event limit reached' });
  }
  const event = validatePublicEvent(req.body);
  analyticsWindowEventCount += 1;
  await recordAnalyticsEvent(event.eventType, event.targetId);
  res.status(202).json({ accepted: true });
});

app.get('/api/analytics/summary', async (req, res) => {
  const summary = await readAnalyticsSummary(req);
  res.status(200).json(summary);
});

app.post('/api/auth/start', async (req, res) => {
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) ||
      Object.keys(body).length !== 2 || !Object.hasOwn(body, 'origin') || !Object.hasOwn(body, 'returnTo')) {
    throw new HttpError(400, 'Invalid authentication request');
  }
  const requestOrigin = req.get('origin');
  if (!requestOrigin || requestOrigin !== body.origin) throw new HttpError(400, 'Invalid authentication request');
  const result = await createAuthorization(body.origin, body.returnTo);
  appendCookie(res, OAUTH_STATE_COOKIE, result.nonce, result.cookieOptions);
  res.status(200).json({ authorizationUrl: result.authorizationUrl });
});

app.get('/api/auth/callback', async (req, res) => {
  const result = await completeAuthorization(req);
  const stateOptions = { secure: result.stateCookieOptions.secure, sameSite: result.stateCookieOptions.sameSite };
  clearCookie(res, OAUTH_STATE_COOKIE, stateOptions);
  if (result.denied) {
    res.redirect(303, `${result.origin}${result.returnTo}?auth=denied`);
    return;
  }
  appendCookie(res, APP_SESSION_COOKIE, result.sessionToken, result.cookieOptions);
  res.redirect(303, `${result.origin}${result.returnTo}`);
});

app.post('/api/auth/logout', async (req, res) => {
  await revokeCurrentSession(req);
  clearCookie(res, APP_SESSION_COOKIE, cookieOptionsForRequest(req));
  res.status(204).end();
});

export async function sendOwnerDownloadNotification() {
  const apiBase = process.env.MANUS_API_URL;
  const apiKey = process.env.MANUS_API_KEY;
  if (!apiBase || !apiKey) {
    console.warn('CV download completed; owner notification service is not configured.');
    return;
  }

  let endpoint;
  try {
    const base = new URL(apiBase);
    if (base.protocol !== 'https:') return;
    endpoint = `${base.toString().replace(/\/+$/, '')}/webdevtoken.v1.WebDevService/SendNotification`;
  } catch {
    console.warn('CV download completed; owner notification endpoint is invalid.');
    return;
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Connect-Protocol-Version': '1',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        title: 'VOICE TO SHIP CV downloaded',
        content: 'A visitor completed a download of the full CV PDF.',
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) {
      let reason = '';
      try {
        const payload = await response.json();
        const candidate = payload?.error?.message ?? payload?.message;
        if (typeof candidate === 'string') reason = ` ${candidate.replace(/[\r\n\t]+/g, ' ').slice(0, 180)}`;
      } catch {
        // Do not surface response bodies or credentials in request logs.
      }
      console.warn(`CV owner notification was not accepted (HTTP ${response.status}).${reason}`);
    }
  } catch {
    console.warn('CV owner notification request failed; the completed download was not interrupted.');
  }
}

app.head('/api/download/profile', (_req, res) => res.status(405).end());

app.get('/api/download/profile', (req, res) => {
  const fileStream = createReadStream(resumeFilePath);
  const countDownload = req.query.analytics !== 'off';
  let fileEnded = false;
  fileStream.once('end', () => { fileEnded = true; });
  fileStream.once('error', () => {
    if (!res.headersSent) {
      res.status(404).json({ error: 'File unavailable' });
    } else {
      res.destroy();
    }
  });
  res.once('finish', () => {
    if (fileEnded) {
      if (countDownload) void recordAnalyticsEvent('resume_download', 'profile_pdf').catch(() => {});
      void sendOwnerDownloadNotification();
    }
  });
  res.once('close', () => {
    if (!res.writableFinished) fileStream.destroy();
  });
  res.status(200);
  res.type('application/pdf');
  res.attachment('Omkar_Shettigar_Profile.pdf');
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  fileStream.pipe(res);
});

if (process.env.NODE_ENV === 'production') {
  const distributionDirectory = path.join(projectDirectory, 'dist');
  app.use(express.static(distributionDirectory, { index: false, fallthrough: true }));
  app.get(/.*/, (req, res, next) => {
    if (req.path.startsWith('/api/') || path.extname(req.path) || !req.accepts('html')) return next();
    res.sendFile(path.join(distributionDirectory, 'index.html'), (error) => {
      if (error && !res.headersSent) next(error);
    });
  });
}

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((error, _req, res, _next) => {
  const status = Number.isInteger(error?.status) && error.status >= 400 && error.status < 600 ? error.status : 500;
  if (res.headersSent) return res.destroy();
  const message = status === 401 ? 'Authentication required' : status === 403 ? 'Forbidden' :
    status === 400 ? 'Invalid request' : 'Internal server error';
  return res.status(status).json({ error: message });
});

function selectedPort() {
  const production = process.env.NODE_ENV === 'production';
  const configured = production ? process.env.PORT : process.env.API_PORT;
  const fallback = production ? 3000 : 3001;
  const parsed = Number(configured || fallback);
  return Number.isInteger(parsed) && parsed > 0 && parsed <= 65535 ? parsed : fallback;
}

async function start() {
  try {
    await applyMigrations();
    migrationReady = true;
    startRetentionCleanup();
    const server = app.listen(selectedPort(), '0.0.0.0');
    server.on('error', () => { process.exitCode = 1; });
  } catch {
    // Keep startup failures generic; never emit database URLs, credentials, or user data.
    process.exitCode = 1;
  }
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === currentFile) {
  void start();
}

export { app, start };
