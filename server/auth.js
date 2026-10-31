import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { getPool } from './database.js';

export const APP_SESSION_COOKIE = 'webdev_app_session';
export const OAUTH_STATE_COOKIE = 'webdev_oauth_state';
const OAUTH_STATE_TTL_SECONDS = 300;
const APP_SESSION_TTL_DAYS = 30;

export class HttpError extends Error {
  constructor(status, message = 'Request could not be completed') {
    super(message);
    this.status = status;
  }
}

export function sha256(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function safeEqualText(left, right) {
  const a = Buffer.from(String(left));
  const b = Buffer.from(String(right));
  return a.length === b.length && timingSafeEqual(a, b);
}

export function parseCookieHeader(header, name) {
  if (typeof header !== 'string') return undefined;
  for (const pair of header.split(';')) {
    const separator = pair.indexOf('=');
    if (separator < 0 || pair.slice(0, separator).trim() !== name) continue;
    const value = pair.slice(separator + 1).trim();
    try {
      return decodeURIComponent(value);
    } catch {
      return undefined;
    }
  }
  return undefined;
}

function cookieHeader(name, value, { secure, sameSite, maxAge }) {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    'HttpOnly',
    `SameSite=${sameSite}`,
  ];
  if (secure) attributes.push('Secure');
  if (maxAge !== undefined) attributes.push(`Max-Age=${maxAge}`);
  return attributes.join('; ');
}

export function appendCookie(res, name, value, options) {
  res.append('Set-Cookie', cookieHeader(name, value, options));
}

export function clearCookie(res, name, options) {
  appendCookie(res, name, '', { ...options, maxAge: 0 });
}

export function cookieOptionsForOrigin(origin, maxAge) {
  const secure = origin.protocol === 'https:';
  return { secure, sameSite: secure ? 'None' : 'Lax', maxAge };
}

export function cookieOptionsForRequest(req) {
  const originHeader = req.get('origin');
  if (typeof originHeader === 'string') {
    try {
      const origin = new URL(originHeader);
      if (origin.origin === originHeader && ['https:', 'http:'].includes(origin.protocol)) {
        return cookieOptionsForOrigin(origin);
      }
    } catch {
      // Use the secure browser-context default when an explicit origin is unavailable/invalid.
    }
  }
  return { secure: true, sameSite: 'None' };
}

function parseFrontendOrigin(value) {
  if (typeof value !== 'string' || value.length > 512) throw new HttpError(400, 'Invalid origin');
  let origin;
  try {
    origin = new URL(value);
  } catch {
    throw new HttpError(400, 'Invalid origin');
  }
  if (origin.origin !== value || origin.username || origin.password || origin.search || origin.hash) {
    throw new HttpError(400, 'Invalid origin');
  }
  const localHttp = origin.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname.toLowerCase());
  if (origin.protocol !== 'https:' && !localHttp) throw new HttpError(400, 'Invalid origin');
  return origin;
}

function requiredRuntimeValue(name) {
  const value = process.env[name];
  if (!value) throw new HttpError(503, 'Authentication is unavailable');
  return value;
}

function serviceEndpoint(base, method) {
  let url;
  try {
    url = new URL(base);
  } catch {
    throw new HttpError(503, 'Authentication is unavailable');
  }
  if (url.protocol !== 'https:') throw new HttpError(503, 'Authentication is unavailable');
  return `${url.toString().replace(/\/+$/, '')}/webdev.v1.WebDevAuthPublicService/${method}`;
}

export async function createAuthorization(originValue, returnTo) {
  if (returnTo !== '/insights') throw new HttpError(400, 'Invalid return path');
  const origin = parseFrontendOrigin(originValue);
  const clientId = requiredRuntimeValue('MANUS_PROJECT_ID');
  const portalBase = requiredRuntimeValue('MANUS_OAUTH_PORTAL_URL');
  let portal;
  try {
    portal = new URL(portalBase);
  } catch {
    throw new HttpError(503, 'Authentication is unavailable');
  }
  if (portal.protocol !== 'https:') throw new HttpError(503, 'Authentication is unavailable');

  const redirectUri = `${origin.origin}/api/auth/callback`;
  const nonce = randomBytes(32).toString('base64url');
  const nonceHash = sha256(nonce);
  const db = getPool();
  await db.execute(
    `INSERT INTO analytics_oauth_states
      (nonce_hash, origin, redirect_uri, return_to, cookie_secure, expires_at)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? SECOND))`,
    [nonceHash, origin.origin, redirectUri, returnTo, origin.protocol === 'https:', OAUTH_STATE_TTL_SECONDS],
  );

  const state = Buffer.from(JSON.stringify({ redirectUri, nonce }), 'utf8').toString('base64url');
  const authorizationUrl = new URL(`${portal.toString().replace(/\/+$/, '')}/app-auth`);
  authorizationUrl.searchParams.set('appId', clientId);
  authorizationUrl.searchParams.set('redirectUri', redirectUri);
  authorizationUrl.searchParams.set('state', state);
  authorizationUrl.searchParams.set('responseType', 'code');
  return {
    authorizationUrl: authorizationUrl.toString(),
    nonce,
    cookieOptions: cookieOptionsForOrigin(origin, OAUTH_STATE_TTL_SECONDS),
  };
}

function decodeState(encodedState) {
  if (typeof encodedState !== 'string' || encodedState.length > 4096) throw new HttpError(400, 'Invalid OAuth state');
  try {
    const state = JSON.parse(Buffer.from(encodedState, 'base64url').toString('utf8'));
    if (!state || typeof state.redirectUri !== 'string' || typeof state.nonce !== 'string' || state.nonce.length > 256) {
      throw new Error('Invalid state');
    }
    return state;
  } catch {
    throw new HttpError(400, 'Invalid OAuth state');
  }
}

async function consumeOAuthState(encodedState, nonceCookie) {
  if (!nonceCookie) throw new HttpError(400, 'Invalid OAuth state');
  const state = decodeState(encodedState);
  if (!safeEqualText(state.nonce, nonceCookie)) throw new HttpError(400, 'Invalid OAuth state');
  const nonceHash = sha256(nonceCookie);
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT origin, redirect_uri, return_to, cookie_secure
       FROM analytics_oauth_states
       WHERE nonce_hash = ? AND consumed_at IS NULL AND expires_at > UTC_TIMESTAMP(6)
       LIMIT 1 FOR UPDATE`,
      [nonceHash],
    );
    const record = rows[0];
    if (!record || record.return_to !== '/insights' || record.redirect_uri !== state.redirectUri ||
        record.redirect_uri !== `${record.origin}/api/auth/callback`) {
      await connection.rollback();
      throw new HttpError(400, 'Invalid OAuth state');
    }
    const [updateResult] = await connection.execute(
      'UPDATE analytics_oauth_states SET consumed_at = UTC_TIMESTAMP(6) WHERE nonce_hash = ? AND consumed_at IS NULL',
      [nonceHash],
    );
    if (updateResult.affectedRows !== 1) {
      await connection.rollback();
      throw new HttpError(400, 'Invalid OAuth state');
    }
    await connection.commit();
    return {
      origin: record.origin,
      redirectUri: record.redirect_uri,
      returnTo: record.return_to,
      secure: Boolean(record.cookie_secure),
    };
  } catch (error) {
    try { await connection.rollback(); } catch { /* Transaction may already be closed. */ }
    throw error;
  } finally {
    connection.release();
  }
}

async function postOAuthJson(url, body) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new HttpError(502, 'Authentication provider is unavailable');
  }
  if (!response.ok) throw new HttpError(502, 'Authentication provider is unavailable');
  try {
    return await response.json();
  } catch {
    throw new HttpError(502, 'Authentication provider is unavailable');
  }
}

function normalizeEmail(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

export async function completeAuthorization(req) {
  const code = req.query?.code;
  const encodedState = req.query?.state;
  if (typeof code !== 'string' || code.length === 0 || code.length > 4096 ||
      typeof encodedState !== 'string') throw new HttpError(400, 'Invalid OAuth callback');

  const nonceCookie = parseCookieHeader(req.headers.cookie, OAUTH_STATE_COOKIE);
  const state = await consumeOAuthState(encodedState, nonceCookie);
  const projectId = requiredRuntimeValue('MANUS_PROJECT_ID');
  const oauthApiBase = requiredRuntimeValue('MANUS_OAUTH_API_URL');
  const tokenResponse = await postOAuthJson(
    serviceEndpoint(oauthApiBase, 'ExchangeToken'),
    { clientId: projectId, grantType: 'authorization_code', code, redirectUri: state.redirectUri },
  );
  if (typeof tokenResponse?.accessToken !== 'string' || tokenResponse.accessToken.length === 0) {
    throw new HttpError(502, 'Authentication provider is unavailable');
  }

  const userInfo = await postOAuthJson(
    serviceEndpoint(oauthApiBase, 'GetUserInfo'),
    { accessToken: tokenResponse.accessToken },
  );
  const configuredOwnerEmail = normalizeEmail(process.env.ANALYTICS_OWNER_EMAIL);
  const returnedEmail = normalizeEmail(userInfo?.email);
  if (!configuredOwnerEmail || !returnedEmail || returnedEmail !== configuredOwnerEmail ||
      typeof userInfo?.openId !== 'string' || userInfo.openId.length === 0 || userInfo.openId.length > 4096) {
    return {
      denied: true,
      origin: state.origin,
      returnTo: state.returnTo,
      stateCookieOptions: cookieOptionsForOrigin(new URL(state.origin)),
    };
  }

  const ownerOpenIdHash = sha256(userInfo.openId);
  const sessionToken = randomBytes(32).toString('base64url');
  const sessionTokenHash = sha256(sessionToken);
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.execute(
      `INSERT INTO analytics_owner (id, owner_openid_hash) VALUES (1, ?)
       ON DUPLICATE KEY UPDATE owner_openid_hash = VALUES(owner_openid_hash)`,
      [ownerOpenIdHash],
    );
    await connection.execute(
      `INSERT INTO analytics_sessions (session_token_hash, owner_openid_hash, expires_at)
       VALUES (?, ?, DATE_ADD(UTC_TIMESTAMP(6), INTERVAL ? DAY))`,
      [sessionTokenHash, ownerOpenIdHash, APP_SESSION_TTL_DAYS],
    );
    await connection.commit();
  } catch {
    try { await connection.rollback(); } catch { /* Transaction may already be closed. */ }
    throw new HttpError(503, 'Authentication is unavailable');
  } finally {
    connection.release();
  }

  return {
    sessionToken,
    origin: state.origin,
    returnTo: state.returnTo,
    stateCookieOptions: cookieOptionsForOrigin(new URL(state.origin)),
    cookieOptions: cookieOptionsForOrigin(new URL(state.origin), APP_SESSION_TTL_DAYS * 24 * 60 * 60),
  };
}

function verifyPlatformJwt(token) {
  const secret = process.env.MANUS_JWT_SECRET;
  const projectId = process.env.MANUS_PROJECT_ID;
  if (!secret || !projectId || typeof token !== 'string') return undefined;
  const segments = token.split('.');
  if (segments.length !== 3 || segments.some((segment) => !segment)) return undefined;
  try {
    const header = JSON.parse(Buffer.from(segments[0], 'base64url').toString('utf8'));
    const payload = JSON.parse(Buffer.from(segments[1], 'base64url').toString('utf8'));
    if (header?.alg !== 'HS256' || typeof payload?.exp !== 'number' || !Number.isFinite(payload.exp) ||
        payload.exp <= Math.floor(Date.now() / 1000) || payload.appId !== projectId ||
        typeof payload.openId !== 'string' || payload.openId.length === 0 || payload.openId.length > 4096) {
      return undefined;
    }
    const expected = createHmac('sha256', secret).update(`${segments[0]}.${segments[1]}`).digest();
    const provided = Buffer.from(segments[2], 'base64url');
    if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return undefined;
    return sha256(payload.openId);
  } catch {
    return undefined;
  }
}

export async function resolveOwnerAuthentication(req) {
  const token = parseCookieHeader(req.headers.cookie, APP_SESSION_COOKIE);
  if (!token || token.length > 8192) return { authenticated: false, owner: false };

  const platformOwnerHash = verifyPlatformJwt(token);
  const db = getPool();
  if (platformOwnerHash) {
    const [rows] = await db.execute(
      'SELECT id FROM analytics_owner WHERE id = 1 AND owner_openid_hash = ? LIMIT 1',
      [platformOwnerHash],
    );
    return { authenticated: true, owner: rows.length === 1 };
  }

  const sessionTokenHash = sha256(token);
  const [rows] = await db.execute(
    `SELECT s.owner_openid_hash
     FROM analytics_sessions s
     INNER JOIN analytics_owner o ON o.id = 1 AND o.owner_openid_hash = s.owner_openid_hash
     WHERE s.session_token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP(6)
     LIMIT 1`,
    [sessionTokenHash],
  );
  return { authenticated: rows.length === 1, owner: rows.length === 1 };
}

export async function revokeCurrentSession(req) {
  const token = parseCookieHeader(req.headers.cookie, APP_SESSION_COOKIE);
  if (token && token.length <= 8192 && !verifyPlatformJwt(token)) {
    await getPool().execute(
      'UPDATE analytics_sessions SET revoked_at = UTC_TIMESTAMP(6) WHERE session_token_hash = ? AND revoked_at IS NULL',
      [sha256(token)],
    );
  }
}
