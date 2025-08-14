-- Movie metadata and processing status
CREATE TABLE IF NOT EXISTS movies (
  tmdb_id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  original_title TEXT,
  overview TEXT,
  release_date TEXT,
  year INTEGER,
  runtime INTEGER,
  vote_average REAL,
  vote_count INTEGER,
  popularity REAL,
  original_language TEXT,
  genres TEXT, -- JSON array
  keywords TEXT, -- JSON array
  production_countries TEXT, -- JSON array
  vector_id TEXT, -- ID in Vectorize
  embedded_at TEXT,
  updated_at TEXT,
  processing_status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  processing_attempts INTEGER DEFAULT 0,
  last_error TEXT
);

-- Index for efficient queries
CREATE INDEX IF NOT EXISTS idx_movies_status ON movies(processing_status);
CREATE INDEX IF NOT EXISTS idx_movies_popularity ON movies(popularity DESC);
CREATE INDEX IF NOT EXISTS idx_movies_year ON movies(year DESC);
CREATE INDEX IF NOT EXISTS idx_movies_updated ON movies(updated_at DESC);

-- Processing queue for rate limiting
CREATE TABLE IF NOT EXISTS processing_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL,
  priority INTEGER DEFAULT 0, -- Higher priority processed first
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  processed_at TEXT,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  UNIQUE(tmdb_id)
);

CREATE INDEX IF NOT EXISTS idx_queue_status ON processing_queue(status, priority DESC);

-- Rate limiting tracking
CREATE TABLE IF NOT EXISTS rate_limit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL, -- 'tmdb', 'openai', 'vectorize'
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP,
  requests_made INTEGER,
  tokens_used INTEGER,
  window_start TEXT,
  window_end TEXT
);

-- Daily processing metrics
CREATE TABLE IF NOT EXISTS daily_metrics (
  date TEXT PRIMARY KEY,
  movies_processed INTEGER DEFAULT 0,
  embeddings_created INTEGER DEFAULT 0,
  vectors_uploaded INTEGER DEFAULT 0,
  tmdb_requests INTEGER DEFAULT 0,
  openai_requests INTEGER DEFAULT 0,
  openai_tokens INTEGER DEFAULT 0,
  errors_count INTEGER DEFAULT 0,
  processing_time_ms INTEGER,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- User feedback integration (for improving vectors)
CREATE TABLE IF NOT EXISTS movie_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL,
  feedback_type TEXT NOT NULL, -- 'loved', 'liked', 'disliked', 'queried'
  count INTEGER DEFAULT 1,
  last_feedback_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_feedback_tmdb ON movie_feedback(tmdb_id);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON movie_feedback(feedback_type);