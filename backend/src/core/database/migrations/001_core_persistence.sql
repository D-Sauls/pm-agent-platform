CREATE TABLE IF NOT EXISTS schema_migrations (
  id TEXT PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS documents (
  scope TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (scope, tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_documents_scope_tenant
  ON documents (scope, tenant_id);

CREATE TABLE IF NOT EXISTS append_events (
  scope TEXT NOT NULL,
  tenant_id TEXT NOT NULL,
  id TEXT NOT NULL,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL,
  PRIMARY KEY (scope, tenant_id, id)
);

CREATE INDEX IF NOT EXISTS idx_append_events_scope_tenant
  ON append_events (scope, tenant_id, created_at);

