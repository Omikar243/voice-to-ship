import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import pg from 'pg';

const { Pool } = pg;
const migrationDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const migrationList = ['001_analytics.sql', '002_traffic_and_performance.sql'];
let pool;

function databaseOptionsFromRuntime() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');
  let url;
  try { url = new URL(connectionString); } catch { throw new Error('DATABASE_URL is invalid'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === '/') {
    throw new Error('DATABASE_URL is invalid');
  }
  return {
    connectionString,
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 10_000,
    ssl: url.hostname.endsWith('.neon.tech') || url.searchParams.get('sslmode') !== 'disable' ? { rejectUnauthorized: false } : undefined,
  };
}

function postgresPlaceholders(sql, values) {
  let index = 0;
  return [sql.replace(/\?/g, () => `$${++index}`), values];
}

function mysqlLikeRows(result) {
  const rows = result.rows;
  rows.affectedRows = result.rowCount;
  return rows;
}

class PgConnection {
  constructor(client) { this.client = client; }
  execute(sql, values = []) { const [text, params] = postgresPlaceholders(sql, values); return this.client.query(text, params).then((result) => [mysqlLikeRows(result), result]); }
  query(sql, values = []) { const [text, params] = postgresPlaceholders(sql, values); return this.client.query(text, params).then((result) => [mysqlLikeRows(result), result]); }
  beginTransaction() { return this.client.query('BEGIN'); }
  commit() { return this.client.query('COMMIT'); }
  rollback() { return this.client.query('ROLLBACK'); }
  release() { this.client.release(); }
}

class PgPool {
  constructor(activePool) { this.activePool = activePool; }
  async getConnection() { return new PgConnection(await this.activePool.connect()); }
  execute(sql, values = []) { const [text, params] = postgresPlaceholders(sql, values); return this.activePool.query(text, params).then((result) => [mysqlLikeRows(result), result]); }
  end() { return this.activePool.end(); }
}

export function getPool() {
  if (!pool) pool = new PgPool(new Pool(databaseOptionsFromRuntime()));
  return pool;
}

export async function applyMigrations() {
  const db = getPool();
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        migration_id VARCHAR(128) NOT NULL PRIMARY KEY,
        applied_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await connection.query('SELECT pg_advisory_xact_lock(hashtext(?))', ['voice-to-ship-schema-migrations']);
    for (const migrationId of migrationList) {
      const [appliedRows] = await connection.execute(
        'SELECT migration_id FROM app_schema_migrations WHERE migration_id = ? LIMIT 1',
        [migrationId],
      );
      if (appliedRows.length) continue;
      const source = await readFile(path.join(migrationDirectory, migrationId), 'utf8');
      const statements = source.split(';').map((statement) => statement.trim()).filter(Boolean);
      for (const statement of statements) {
        if (!/^CREATE\s+(?:TABLE|INDEX)\s+IF\s+NOT\s+EXISTS\b/i.test(statement)) throw new Error('Migration contains a non-additive statement');
        await connection.query(statement);
      }
      await connection.execute('INSERT INTO app_schema_migrations (migration_id) VALUES (?)', [migrationId]);
    }
    await connection.commit();
  } catch (error) {
    try { await connection.rollback(); } catch { /* Transaction may already be closed. */ }
    throw error;
  } finally {
    connection.release();
  }
}

export async function closePool() {
  if (pool) {
    const activePool = pool;
    pool = undefined;
    await activePool.end();
  }
}
