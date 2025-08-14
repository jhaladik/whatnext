-- Migration 0001: Initial setup for movie recommendations worker

-- Domains configuration table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  question_set TEXT, -- JSON array of question IDs
  vector_service_url TEXT,
  enrichment_config TEXT, -- JSON config for TMDB, etc.
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Insert default domains
INSERT OR IGNORE INTO domains (id, name, question_set, enrichment_config, is_active) VALUES
  ('movies', 'Movies', '["cognitive_load","emotional_tone","personal_context","attention_level","discovery_mode"]', 
   '{"tmdb":true,"streamingProviders":true,"cast":true,"keywords":true}', TRUE),
  ('tv-series', 'TV Series', '["cognitive_load","emotional_tone","personal_context","attention_level","discovery_mode"]',
   '{"tmdb":true,"streamingProviders":true,"episodeInfo":true}', TRUE),
  ('documentaries', 'Documentaries', '["cognitive_load","emotional_tone","personal_context","attention_level","discovery_mode"]',
   '{"tmdb":true,"subjects":true,"educationalValue":true}', TRUE),
  ('kids', 'Kids Content', '["cognitive_load","emotional_tone","attention_level","discovery_mode"]',
   '{"tmdb":true,"ageRating":true,"educational":true}', FALSE);

-- Questions table with vector weights
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  question_text TEXT NOT NULL,
  description TEXT,
  options TEXT NOT NULL, -- JSON array of options
  order_index INTEGER DEFAULT 0,
  vector_weights TEXT, -- JSON: question answer weights for vector generation
  personal_context BOOLEAN DEFAULT FALSE,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch())
);

-- Movie metadata cache
CREATE TABLE IF NOT EXISTS movie_cache (
  id TEXT PRIMARY KEY,
  tmdb_id INTEGER,
  title TEXT NOT NULL,
  original_title TEXT,
  poster_url TEXT,
  backdrop_url TEXT,
  streaming_platforms TEXT, -- JSON array
  genres TEXT, -- JSON array
  release_year INTEGER,
  rating REAL,
  vote_count INTEGER,
  runtime INTEGER,
  overview TEXT,
  director TEXT,
  cast TEXT, -- JSON array
  keywords TEXT, -- JSON array
  vector_embedding TEXT, -- JSON array [1536 dims] for future use
  metadata TEXT, -- Full TMDB response JSON
  created_at INTEGER DEFAULT (unixepoch()),
  expires_at INTEGER
);

-- Create indexes for movie_cache
CREATE INDEX IF NOT EXISTS idx_movie_cache_title ON movie_cache(title);
CREATE INDEX IF NOT EXISTS idx_movie_cache_year ON movie_cache(release_year);
CREATE INDEX IF NOT EXISTS idx_movie_cache_rating ON movie_cache(rating);

-- User preferences and learning
CREATE TABLE IF NOT EXISTS user_preferences (
  session_id TEXT,
  movie_id TEXT,
  interaction_type TEXT, -- 'liked', 'disliked', 'saved', 'watched'
  context TEXT, -- JSON: what led to this recommendation
  feedback_score REAL, -- 1-5 rating if provided
  created_at INTEGER DEFAULT (unixepoch()),
  PRIMARY KEY (session_id, movie_id, interaction_type)
);

-- Create indexes for user_preferences
CREATE INDEX IF NOT EXISTS idx_user_pref_session ON user_preferences(session_id);
CREATE INDEX IF NOT EXISTS idx_user_pref_movie ON user_preferences(movie_id);

-- Vector search performance tracking
CREATE TABLE IF NOT EXISTS vector_searches (
  id TEXT PRIMARY KEY,
  session_id TEXT,
  search_vector TEXT, -- JSON array (truncated for storage)
  results_count INTEGER,
  search_time_ms INTEGER,
  user_satisfaction REAL, -- Feedback if provided
  filters_applied TEXT, -- JSON of applied filters
  created_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes for vector_searches
CREATE INDEX IF NOT EXISTS idx_vector_search_session ON vector_searches(session_id);
CREATE INDEX IF NOT EXISTS idx_vector_search_time ON vector_searches(created_at);

-- Session domains tracking
CREATE TABLE IF NOT EXISTS session_domains (
  session_id TEXT PRIMARY KEY,
  domain_id TEXT NOT NULL,
  selected_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  questions_answered INTEGER DEFAULT 0,
  FOREIGN KEY (domain_id) REFERENCES domains(id)
);

-- Question responses for analytics
CREATE TABLE IF NOT EXISTS question_responses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  question_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  response_time_ms INTEGER,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes for question_responses
CREATE INDEX IF NOT EXISTS idx_question_resp_session ON question_responses(session_id);
CREATE INDEX IF NOT EXISTS idx_question_resp_question ON question_responses(question_id);

-- Domain feedback
CREATE TABLE IF NOT EXISTS domain_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id TEXT NOT NULL,
  domain_id TEXT NOT NULL,
  feedback_type TEXT, -- 'quality', 'relevance', 'diversity'
  feedback_value TEXT, -- Can be numeric or text
  created_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes for domain_feedback
CREATE INDEX IF NOT EXISTS idx_domain_feedback_session ON domain_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_domain_feedback_domain ON domain_feedback(domain_id);

-- Recommendation results tracking
CREATE TABLE IF NOT EXISTS recommendation_results (
  id TEXT PRIMARY KEY,
  session_id TEXT NOT NULL,
  recommendations TEXT NOT NULL, -- JSON array of movie IDs
  generation_method TEXT, -- 'vector', 'claude_fallback', 'database'
  generation_time_ms INTEGER,
  user_engaged BOOLEAN,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Create indexes for recommendation_results
CREATE INDEX IF NOT EXISTS idx_rec_results_session ON recommendation_results(session_id);
CREATE INDEX IF NOT EXISTS idx_rec_results_time ON recommendation_results(created_at);