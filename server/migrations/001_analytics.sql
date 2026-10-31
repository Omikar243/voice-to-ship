CREATE TABLE IF NOT EXISTS analytics_events (
  event_type VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  app_env ENUM('preview', 'production') NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY analytics_events_retention (created_at),
  KEY analytics_events_scope (app_env, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_daily_rollups (
  app_env ENUM('preview', 'production') NOT NULL,
  event_date DATE NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  event_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (app_env, event_date, target_id, event_type),
  KEY analytics_daily_rollups_period (app_env, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_maintenance (
  job_name VARCHAR(64) NOT NULL,
  last_cleanup_date DATE NULL,
  PRIMARY KEY (job_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_oauth_states (
  nonce_hash CHAR(64) NOT NULL,
  origin VARCHAR(512) NOT NULL,
  redirect_uri VARCHAR(2048) NOT NULL,
  return_to VARCHAR(32) NOT NULL,
  cookie_secure BOOLEAN NOT NULL,
  expires_at DATETIME(6) NOT NULL,
  consumed_at DATETIME(6) NULL,
  PRIMARY KEY (nonce_hash),
  KEY analytics_oauth_states_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_owner (
  id TINYINT UNSIGNED NOT NULL,
  owner_openid_hash CHAR(64) NOT NULL,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS analytics_sessions (
  session_token_hash CHAR(64) NOT NULL,
  owner_openid_hash CHAR(64) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  revoked_at DATETIME(6) NULL,
  PRIMARY KEY (session_token_hash),
  KEY analytics_sessions_owner (owner_openid_hash),
  KEY analytics_sessions_expiry (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
