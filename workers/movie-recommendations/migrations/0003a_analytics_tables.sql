-- Migration 0003a: Core Analytics Tables

-- Store complete session embeddings for analysis
CREATE TABLE IF NOT EXISTS session_embeddings (
  session_id TEXT PRIMARY KEY,
  embedding_vector BLOB,
  embedding_json TEXT,
  question_answers TEXT NOT NULL,
  vector_magnitude REAL,
  dominant_dimensions TEXT,
  cluster_id INTEGER,
  embedding_hash TEXT,
  created_at INTEGER DEFAULT (unixepoch())
);

-- Track success of each recommendation
CREATE TABLE IF NOT EXISTS recommendation_results (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  session_id TEXT NOT NULL,
  movie_id TEXT NOT NULL,
  rank_position INTEGER NOT NULL,
  similarity_score REAL NOT NULL,
  was_displayed BOOLEAN DEFAULT TRUE,
  was_clicked BOOLEAN DEFAULT FALSE,
  was_liked BOOLEAN DEFAULT FALSE,
  was_disliked BOOLEAN DEFAULT FALSE,
  was_saved BOOLEAN DEFAULT FALSE,
  watch_initiated BOOLEAN DEFAULT FALSE,
  watch_completed BOOLEAN DEFAULT FALSE,
  time_to_interaction INTEGER,
  interaction_type TEXT,
  final_outcome TEXT,
  feedback_score REAL,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  UNIQUE(session_id, movie_id)
);

-- Embedding space clustering
CREATE TABLE IF NOT EXISTS embedding_clusters (
  cluster_id INTEGER PRIMARY KEY AUTOINCREMENT,
  cluster_name TEXT,
  centroid_vector BLOB,
  centroid_json TEXT,
  cluster_label TEXT,
  avg_satisfaction REAL,
  avg_interaction_rate REAL,
  common_genres TEXT,
  common_keywords TEXT,
  optimal_questions TEXT,
  ineffective_questions TEXT,
  session_count INTEGER DEFAULT 0,
  last_updated INTEGER DEFAULT (unixepoch())
);

-- Track question effectiveness
CREATE TABLE IF NOT EXISTS question_effectiveness (
  question_id TEXT PRIMARY KEY,
  domain TEXT NOT NULL,
  total_answers INTEGER DEFAULT 0,
  embedding_variance REAL,
  outcome_correlation REAL,
  avg_response_time INTEGER,
  skip_rate REAL,
  redundancy_score REAL,
  redundant_with TEXT,
  discriminative_power REAL,
  optimal_position INTEGER,
  last_calculated INTEGER DEFAULT (unixepoch())
);