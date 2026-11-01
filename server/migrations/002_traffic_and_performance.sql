CREATE TABLE IF NOT EXISTS analytics_source_daily_rollups (
  app_env ENUM('preview', 'production') NOT NULL,
  event_date DATE NOT NULL,
  source VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  event_count BIGINT UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (app_env, event_date, source, target_id, event_type),
  KEY analytics_source_rollups_period (app_env, event_date),
  KEY analytics_source_rollups_source (app_env, source, event_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS performance_samples (
  app_env ENUM('preview', 'production') NOT NULL,
  sample_date DATE NOT NULL,
  sample_source ENUM('server', 'browser') NOT NULL,
  metric_name VARCHAR(128) NOT NULL,
  value_ms DECIMAL(12, 3) NOT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  KEY performance_samples_retention (created_at),
  KEY performance_samples_period (app_env, sample_date, sample_source, metric_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
