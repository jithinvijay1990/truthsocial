CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  guid TEXT NOT NULL UNIQUE,
  link TEXT,
  title TEXT,
  content TEXT,
  published_at TEXT,
  fetched_at TEXT NOT NULL,
  is_market_relevant INTEGER NOT NULL DEFAULT 0,
  matched_keywords TEXT,
  slack_alerted INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_posts_published_at ON posts (published_at DESC);
CREATE INDEX idx_posts_market_relevant ON posts (is_market_relevant);
