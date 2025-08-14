-- Database Curator System Tables
-- Integrates with existing movies and processing_queue tables

-- Track every curation decision
CREATE TABLE IF NOT EXISTS curation_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL,
  action TEXT NOT NULL, -- 'added', 'rejected', 'updated', 'removed', 'duplicate'
  reason TEXT,
  source TEXT, -- 'tmdb_discover', 'tmdb_popular', 'manual', 'awards', etc.
  quality_score REAL,
  metadata TEXT, -- JSON with additional context
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by TEXT DEFAULT 'system'
);

CREATE INDEX idx_curation_log_tmdb ON curation_log(tmdb_id);
CREATE INDEX idx_curation_log_action ON curation_log(action);
CREATE INDEX idx_curation_log_created ON curation_log(created_at DESC);

-- Track duplicate movies and remakes
CREATE TABLE IF NOT EXISTS duplicate_mappings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  primary_tmdb_id INTEGER NOT NULL,
  duplicate_tmdb_id INTEGER NOT NULL,
  match_type TEXT NOT NULL, -- 'exact', 'remake', 'rerelease', 'sequel', 'similar'
  match_confidence REAL, -- 0.0 to 1.0
  title_primary TEXT,
  title_duplicate TEXT,
  year_primary INTEGER,
  year_duplicate INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(primary_tmdb_id, duplicate_tmdb_id)
);

CREATE INDEX idx_duplicate_primary ON duplicate_mappings(primary_tmdb_id);
CREATE INDEX idx_duplicate_duplicate ON duplicate_mappings(duplicate_tmdb_id);

-- Track why movies were rejected
CREATE TABLE IF NOT EXISTS rejection_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL,
  title TEXT,
  year INTEGER,
  rejection_reason TEXT, -- 'low_rating', 'insufficient_votes', 'too_recent', 'duplicate', etc.
  rejection_details TEXT, -- JSON with specific metrics
  vote_average REAL,
  vote_count INTEGER,
  popularity REAL,
  runtime INTEGER,
  source TEXT, -- Where we tried to add it from
  attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_rejection_tmdb ON rejection_log(tmdb_id);
CREATE INDEX idx_rejection_reason ON rejection_log(rejection_reason);
CREATE INDEX idx_rejection_attempted ON rejection_log(attempted_at DESC);

-- Track movie sources and collections
CREATE TABLE IF NOT EXISTS source_collections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL, -- 'afi_top_100', 'criterion', 'oscar_winners', etc.
  display_name TEXT,
  description TEXT,
  total_movies INTEGER DEFAULT 0,
  movies_added INTEGER DEFAULT 0,
  movies_rejected INTEGER DEFAULT 0,
  movies_pending INTEGER DEFAULT 0,
  last_synced TIMESTAMP,
  metadata TEXT, -- JSON with source-specific data
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_source_name ON source_collections(name);

-- Link movies to their sources
CREATE TABLE IF NOT EXISTS movie_sources (
  movie_id INTEGER NOT NULL,
  source_id INTEGER NOT NULL,
  rank_in_source INTEGER, -- Position in list (if applicable)
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (movie_id, source_id),
  FOREIGN KEY (movie_id) REFERENCES movies(tmdb_id),
  FOREIGN KEY (source_id) REFERENCES source_collections(id)
);

-- Track quality metrics for curation decisions
CREATE TABLE IF NOT EXISTS quality_metrics (
  tmdb_id INTEGER PRIMARY KEY,
  -- Base metrics
  rating_score REAL, -- Normalized rating score
  popularity_score REAL, -- Normalized popularity
  vote_confidence REAL, -- Based on vote count
  
  -- Cultural metrics
  cultural_score REAL, -- Awards, lists, references
  longevity_score REAL, -- How well it aged
  critical_score REAL, -- Critical acclaim
  
  -- Diversity metrics
  diversity_score REAL, -- Cast, crew diversity
  uniqueness_score REAL, -- How unique in our collection
  genre_balance_score REAL, -- How it affects genre balance
  
  -- Overall
  overall_score REAL, -- Weighted average
  score_version TEXT DEFAULT '1.0',
  calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (tmdb_id) REFERENCES movies(tmdb_id)
);

CREATE INDEX idx_quality_overall ON quality_metrics(overall_score DESC);
CREATE INDEX idx_quality_calculated ON quality_metrics(calculated_at DESC);

-- Track curation statistics
CREATE TABLE IF NOT EXISTS curation_stats (
  date TEXT PRIMARY KEY,
  movies_evaluated INTEGER DEFAULT 0,
  movies_added INTEGER DEFAULT 0,
  movies_rejected INTEGER DEFAULT 0,
  movies_updated INTEGER DEFAULT 0,
  duplicates_found INTEGER DEFAULT 0,
  average_quality_score REAL,
  -- Breakdown by source
  tmdb_evaluated INTEGER DEFAULT 0,
  tmdb_added INTEGER DEFAULT 0,
  manual_evaluated INTEGER DEFAULT 0,
  manual_added INTEGER DEFAULT 0,
  -- Processing metrics
  processing_time_ms INTEGER,
  api_calls_made INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Curator configuration
CREATE TABLE IF NOT EXISTS curator_config (
  key TEXT PRIMARY KEY,
  value TEXT,
  description TEXT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default configuration
INSERT OR IGNORE INTO curator_config (key, value, description) VALUES
  ('min_quality_score', '60', 'Minimum quality score to accept a movie'),
  ('min_vote_count', '1000', 'Minimum votes required'),
  ('min_rating', '6.5', 'Minimum TMDB rating'),
  ('min_year_age', '2', 'Movies must be at least N years old'),
  ('max_daily_additions', '50', 'Maximum movies to add per day'),
  ('duplicate_threshold', '0.85', 'Similarity threshold for duplicate detection'),
  ('enable_auto_curation', 'false', 'Enable automatic curation'),
  ('curator_version', '1.0', 'Current curator version');

-- Add some initial source collections
INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES
  ('tmdb_popular', 'TMDB Popular', 'Popular movies from TMDB'),
  ('tmdb_top_rated', 'TMDB Top Rated', 'Top rated movies from TMDB'),
  ('tmdb_discover', 'TMDB Discover', 'Movies discovered through TMDB API'),
  ('manual_addition', 'Manual', 'Manually added movies'),
  ('afi_top_100', 'AFI Top 100', 'American Film Institute Top 100'),
  ('criterion_collection', 'Criterion Collection', 'Criterion Collection films'),
  ('oscar_winners', 'Oscar Winners', 'Academy Award winning films'),
  ('cannes_winners', 'Cannes Winners', 'Cannes Film Festival winners'),
  ('user_requests', 'User Requests', 'Movies requested by users');