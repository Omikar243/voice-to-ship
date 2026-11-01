import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import mysql from 'mysql2/promise';

const migrationDirectory = path.join(path.dirname(fileURLToPath(import.meta.url)), 'migrations');
const migrationList = ['001_analytics.sql', '002_traffic_and_performance.sql'];
let pool;

function databaseOptionsFromRuntime() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is not configured');

  let url;
  try {
    url = new URL(connectionString);
  } catch {
    throw new Error('DATABASE_URL is invalid');
  }
  if (!['mysql:', 'mysqls:'].includes(url.protocol) || !url.hostname || !url.pathname || url.pathname === '/') {
    throw new Error('DATABASE_URL is invalid');
  }

  const explicitSsl = (url.searchParams.get('ssl') || '').toLowerCase();
  const sslMode = (url.searchParams.get('ssl-mode') || '').toUpperCase();
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(url.hostname.toLowerCase());
  const sslDisabled = explicitSsl === 'false' || explicitSsl === '0' || sslMode === 'DISABLED';
  const useTls = !sslDisabled && (url.protocol === 'mysqls:' || explicitSsl === 'true' || explicitSsl === '1' || !localHost);

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: decodeURIComponent(url.pathname.slice(1)),
    ssl: useTls ? { rejectUnauthorized: true } : undefined,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 10000,
    timezone: 'Z',
    supportBigNumbers: true,
    decimalNumbers: true,
  };
}

export function getPool() {
  if (!pool) pool = mysql.createPool(databaseOptionsFromRuntime());
  return pool;
}

export async function applyMigrations() {
  const db = getPool();
  const connection = await db.getConnection();
  let lockAcquired = false;
  try {
    await connection.query(`
      CREATE TABLE IF NOT EXISTS app_schema_migrations (
        migration_id VARCHAR(128) NOT NULL,
        applied_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
        PRIMARY KEY (migration_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    const [lockRows] = await connection.query('SELECT GET_LOCK(?, 10) AS acquired', ['voice-to-ship-schema-migrations']);
    lockAcquired = Number(lockRows?.[0]?.acquired) === 1;
    if (!lockAcquired) throw new Error('Could not acquire migration lock');

    for (const migrationId of migrationList) {
      const [appliedRows] = await connection.execute(
        'SELECT migration_id FROM app_schema_migrations WHERE migration_id = ? LIMIT 1',
        [migrationId],
      );
      if (appliedRows.length) continue;

      const source = await readFile(path.join(migrationDirectory, migrationId), 'utf8');
      const statements = source.split(';').map((statement) => statement.trim()).filter(Boolean);
      for (const statement of statements) {
        if (!/^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\b/i.test(statement)) {
          throw new Error('Migration contains a non-additive statement');
        }
        await connection.query(statement);
      }
      await connection.execute('INSERT INTO app_schema_migrations (migration_id) VALUES (?)', [migrationId]);
    }
  } finally {
    if (lockAcquired) {
      try {
        await connection.query('SELECT RELEASE_LOCK(?)', ['voice-to-ship-schema-migrations']);
      } catch {
        // Releasing the connection also releases a MySQL advisory lock.
      }
    }
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
