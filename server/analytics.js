import { getPool } from './database.js';
import { resolveOwnerAuthentication, HttpError } from './auth.js';

const PUBLIC_EVENT_TYPES = new Set(['page_view', 'impression', 'click']);
const STORED_EVENT_TYPES = new Set([...PUBLIC_EVENT_TYPES, 'resume_download']);
const TARGET_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,63}$/;
const MAX_TRACKED_TARGETS_PER_ENV = 512;
const environment = process.env.APP_ENV === 'production' ? 'production' : 'preview';

export function getAppEnvironment() {
  return environment;
}

export function validatePublicEvent(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new HttpError(400, 'Invalid analytics event');
  const keys = Object.keys(body);
  if (keys.length !== 2 || !keys.includes('eventType') || !keys.includes('targetId') ||
      !PUBLIC_EVENT_TYPES.has(body.eventType) || typeof body.targetId !== 'string' ||
      !TARGET_ID_PATTERN.test(body.targetId)) {
    throw new HttpError(400, 'Invalid analytics event');
  }
  return { eventType: body.eventType, targetId: body.targetId };
}

export async function recordAnalyticsEvent(eventType, targetId) {
  if (!STORED_EVENT_TYPES.has(eventType) || typeof targetId !== 'string' || !TARGET_ID_PATTERN.test(targetId)) {
    throw new HttpError(400, 'Invalid analytics event');
  }
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [existingTarget] = await connection.execute(
      'SELECT target_id FROM analytics_daily_rollups WHERE app_env = ? AND target_id = ? LIMIT 1',
      [environment, targetId],
    );
    if (existingTarget.length === 0) {
      const [targetCountRows] = await connection.execute(
        'SELECT COUNT(DISTINCT target_id) AS target_count FROM analytics_daily_rollups WHERE app_env = ?',
        [environment],
      );
      if (Number(targetCountRows?.[0]?.target_count ?? 0) >= MAX_TRACKED_TARGETS_PER_ENV) {
        throw new HttpError(429, 'Analytics target limit reached');
      }
    }
    await connection.execute(
      `INSERT INTO analytics_events (event_type, target_id, app_env, created_at)
       VALUES (?, ?, ?, UTC_TIMESTAMP(6))`,
      [eventType, targetId, environment],
    );
    await connection.execute(
      `INSERT INTO analytics_daily_rollups (app_env, event_date, target_id, event_type, event_count)
       VALUES (?, UTC_DATE(), ?, ?, 1)
       ON DUPLICATE KEY UPDATE event_count = event_count + 1`,
      [environment, targetId, eventType],
    );
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch { /* Transaction may already be closed. */ }
    throw error;
  } finally {
    connection.release();
  }
  void cleanupExpiredRawEvents().catch(() => {});
}

export async function cleanupExpiredRawEvents() {
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.query(
      'DELETE FROM analytics_events WHERE created_at < DATE_SUB(UTC_TIMESTAMP(6), INTERVAL 30 DAY)',
    );
  } catch (error) {
    throw error;
  } finally {
    connection.release();
  }
}

export function startRetentionCleanup() {
  void cleanupExpiredRawEvents().catch(() => {});
  const timer = setInterval(() => {
    void cleanupExpiredRawEvents().catch(() => {});
  }, 60 * 1000);
  timer.unref?.();
  return timer;
}

function countAsNumber(value) {
  const count = Number(value ?? 0);
  return Number.isFinite(count) && count >= 0 ? count : 0;
}

export async function readAnalyticsSummary(req) {
  const auth = await resolveOwnerAuthentication(req);
  if (!auth.authenticated) throw new HttpError(401, 'Authentication required');
  if (!auth.owner) throw new HttpError(403, 'Owner access required');

  const rawDays = req.query.days;
  const periodDays = rawDays === undefined ? 7 : Number(rawDays);
  if (![7, 30, 90].includes(periodDays) || (rawDays !== undefined && String(periodDays) !== String(rawDays))) {
    throw new HttpError(400, 'Invalid summary period');
  }
  const source = req.query.source;
  if (!['live', 'preview'].includes(source)) throw new HttpError(400, 'Invalid summary source');
  const appEnvironment = source === 'live' ? 'production' : 'preview';
  const [rows] = await getPool().execute(
    `SELECT target_id, event_type, SUM(event_count) AS event_count
     FROM analytics_daily_rollups
     WHERE app_env = ?
       AND event_date >= DATE_SUB(UTC_DATE(), INTERVAL ? DAY)
     GROUP BY target_id, event_type`,
    [appEnvironment, periodDays - 1],
  );

  let pageViews = 0;
  let impressions = 0;
  let clicks = 0;
  let downloads = 0;
  const controlCounts = new Map();
  for (const row of rows) {
    const count = countAsNumber(row.event_count);
    if (row.event_type === 'page_view') pageViews += count;
    else if (row.event_type === 'impression') {
      impressions += count;
      const control = controlCounts.get(row.target_id) ?? { targetId: row.target_id, impressions: 0, clicks: 0 };
      control.impressions += count;
      controlCounts.set(row.target_id, control);
    } else if (row.event_type === 'click') {
      clicks += count;
      const control = controlCounts.get(row.target_id) ?? { targetId: row.target_id, impressions: 0, clicks: 0 };
      control.clicks += count;
      controlCounts.set(row.target_id, control);
    } else if (row.event_type === 'resume_download') downloads += count;
  }

  const controls = [...controlCounts.values()]
    .sort((left, right) => left.targetId.localeCompare(right.targetId))
    .map((control) => ({
      ...control,
      ctr: control.impressions === 0 ? 0 : control.clicks / control.impressions,
    }));

  return {
    authenticated: true,
    periodDays,
    source,
    totals: {
      pageViews,
      impressions,
      clicks,
      downloads,
      ctr: impressions === 0 ? 0 : clicks / impressions,
    },
    controls,
  };
}
