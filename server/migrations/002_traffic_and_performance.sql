CREATE TABLE IF NOT EXISTS analytics_source_daily_rollups (
  app_env VARCHAR(16) NOT NULL CHECK (app_env IN ('preview', 'production')),
  event_date DATE NOT NULL,
  source VARCHAR(32) NOT NULL,
  target_id VARCHAR(64) NOT NULL,
  event_type VARCHAR(32) NOT NULL,
  event_count BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (app_env, event_date, source, target_id, event_type)
);
CREATE INDEX IF NOT EXISTS analytics_source_rollups_period ON analytics_source_daily_rollups (app_env, event_date);
CREATE INDEX IF NOT EXISTS analytics_source_rollups_source ON analytics_source_daily_rollups (app_env, source, event_date);

CREATE TABLE IF NOT EXISTS performance_samples (
  app_env VARCHAR(16) NOT NULL CHECK (app_env IN ('preview', 'production')),
  sample_date DATE NOT NULL,
  sample_source VARCHAR(16) NOT NULL CHECK (sample_source IN ('server', 'browser')),
  metric_name VARCHAR(128) NOT NULL,
  value_ms NUMERIC(12, 3) NOT NULL,
  created_at TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT performance_samples_source_metric CHECK (sample_source IN ('server', 'browser'))
);
CREATE INDEX IF NOT EXISTS performance_samples_retention ON performance_samples (created_at);
CREATE INDEX IF NOT EXISTS performance_samples_period ON performance_samples (app_env, sample_date, sample_source, metric_name);
