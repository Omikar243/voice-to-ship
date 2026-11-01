CREATE TABLE IF NOT EXISTS analytics_events (
  event_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  app_env VARCHAR(16) NOT NULL CHECK (app_env IN ('preview', 'production')),
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS analytics_events_retention ON analytics_events (created_at);
CREATE INDEX IF NOT EXISTS analytics_events_scope ON analytics_events (app_env, created_at);

CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
  app_env VARCHAR(16) NOT NULL CHECK (app_env IN ('preview', 'production')),
  event_date DATE NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  event_count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (app_env, event_date, target_id, event_type)
);
CREATE INDEX IF NOT EXISTS analytics_daily_rollups_period ON analytics_daily_rollups (app_env, event_date);

CREATE TABLE IF NOT EXISTS analytics_maintenance (
  job_name VARCHAR(64) NOT NULL PRIMARY KEY,
  last_cleanup_date DATE NULL
);

CREATE TABLE IF NOT EXISTS analytics_oauth_states (
  nonce_hash CHAR(64) NOT NULL PRIMARY KEY,
  origin VARCHAR(512) NOT NULL,
  redirect_uri VARCHAR(2048) NOT NULL,
  return_to VARCHAR(32) NOT NULL,
  cookie_secure BOOLEAN NOT NULL,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  consumed_at TIMESTAMPTZ(6) NULL
);
CREATE INDEX IF NOT EXISTS analytics_oauth_states_expiry ON analytics_oauth_states (expires_at);

CREATE TABLE IF NOT EXISTS analytics_owner (
  id SMALLINT NOT NULL PRIMARY KEY,
  owner_openid_hash CHAR(64) NOT NULL
);

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_token_hash CHAR(64) NOT NULL PRIMARY KEY,
  owner_openid_hash CHAR(64) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMPTZ(6) NOT NULL,
  revoked_at TIMESTAMPTZ(6) NULL
);
CREATE INDEX IF NOT EXISTS analytics_sessions_owner ON analytics_sessions (owner_openid_hash);
CREATE INDEX IF NOT EXISTS analytics_sessions_expiry ON analytics_sessions (expires_at);
