CREATE TABLE IF NOT EXISTS news_items (
  url TEXT PRIMARY KEY,
  published TEXT NOT NULL,
  document TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS news_items_published ON news_items(published DESC);
CREATE TABLE IF NOT EXISTS news_sources (
  id TEXT PRIMARY KEY,
  last_checked TEXT,
  last_success TEXT,
  error TEXT,
  item_count INTEGER NOT NULL DEFAULT 0,
  lease TEXT,
  lease_until INTEGER NOT NULL DEFAULT 0
);
