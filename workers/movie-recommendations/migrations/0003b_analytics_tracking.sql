-- Migration 0003b: Analytics Tracking Tables

-- Track embedding drift when users refine
CREATE TABLE IF NOT EXISTS embedding_refinements (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  original_embedding BLOB,
  refined_embedding BLOB,
  drift_vector BLOB,
  drift_magnitude REAL,
  drift_dimensions TEXT,
  refinement_reason TEXT,
  improvement_score REAL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- A/B testing for questions
CREATE TABLE IF NOT EXISTS question_variants (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL,
  variant_label TEXT NOT NULL,
  question_text TEXT NOT NULL,
  description_text TEXT,
  options_json TEXT NOT NULL,
  sessions_count INTEGER DEFAULT 0,
  avg_satisfaction REAL,
  avg_response_time INTEGER,
  conversion_rate REAL,
  embedding_quality REAL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Temporal preference patterns
CREATE TABLE IF NOT EXISTS temporal_preferences (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  hour_of_day INTEGER NOT NULL,
  day_of_week INTEGER NOT NULL,
  is_weekend BOOLEAN,
  timezone TEXT,
  embedding_shift BLOB,
  context_signals TEXT,
  recommendation_success BOOLEAN,
  genres_preferred TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Question impact scoring
CREATE TABLE IF NOT EXISTS question_impact_analysis (
  analysis_id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  question_id TEXT NOT NULL,
  answer_value TEXT NOT NULL,
  embedding_dimensions_affected TEXT,
  avg_dimension_change REAL,
  max_dimension_change REAL,
  success_rate REAL,
  sample_size INTEGER,
  confidence_score REAL,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Session feedback aggregation
CREATE TABLE IF NOT EXISTS session_feedback_summary (
  session_id TEXT PRIMARY KEY,
  total_recommendations INTEGER,
  clicked_count INTEGER,
  liked_count INTEGER,
  watch_initiated_count INTEGER,
  overall_satisfaction REAL,
  session_success BOOLEAN,
  feedback_notes TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);