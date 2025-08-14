-- Migration: Add recommendations tracking table
-- Purpose: Store actual movie/series/documentary titles recommended to users
-- This allows us to analyze what we're actually recommending

-- Create table to store all recommendations generated
CREATE TABLE IF NOT EXISTS recommendations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    domain TEXT NOT NULL, -- 'movies', 'series', 'documentaries'
    title TEXT NOT NULL,
    year INTEGER,
    type TEXT, -- 'movie', 'series', 'documentary'
    genre TEXT,
    reason TEXT, -- Why this was recommended
    where_to_watch TEXT,
    runtime TEXT,
    rating TEXT, -- PG-13, R, etc.
    position INTEGER, -- Order in recommendation list (1-5)
    source TEXT DEFAULT 'claude', -- 'claude' or 'fallback'
    tmdb_id INTEGER, -- TMDB ID if found
    tmdb_found BOOLEAN DEFAULT FALSE, -- Whether TMDB enrichment succeeded
    timestamp INTEGER NOT NULL,
    metadata TEXT -- JSON for additional data
);

-- Indexes for common queries
CREATE INDEX idx_recommendations_session ON recommendations(session_id);
CREATE INDEX idx_recommendations_title ON recommendations(title);
CREATE INDEX idx_recommendations_domain ON recommendations(domain);
CREATE INDEX idx_recommendations_timestamp ON recommendations(timestamp);
CREATE INDEX idx_recommendations_tmdb ON recommendations(tmdb_found);

-- View to see most recommended titles
CREATE VIEW IF NOT EXISTS top_recommendations AS
SELECT 
    domain,
    title,
    COUNT(*) as times_recommended,
    AVG(CASE WHEN tmdb_found THEN 1 ELSE 0 END) as tmdb_success_rate,
    GROUP_CONCAT(DISTINCT genre) as genres,
    GROUP_CONCAT(DISTINCT where_to_watch) as platforms
FROM recommendations
GROUP BY domain, title
ORDER BY times_recommended DESC;

-- View to analyze recommendation patterns
CREATE VIEW IF NOT EXISTS recommendation_patterns AS
SELECT 
    domain,
    DATE(timestamp/1000, 'unixepoch') as date,
    COUNT(DISTINCT session_id) as sessions,
    COUNT(*) as total_recommendations,
    COUNT(DISTINCT title) as unique_titles,
    AVG(CASE WHEN tmdb_found THEN 1 ELSE 0 END) as tmdb_success_rate
FROM recommendations
GROUP BY domain, date
ORDER BY date DESC;

-- Track which recommendations get feedback
CREATE TABLE IF NOT EXISTS recommendation_outcomes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    title TEXT NOT NULL,
    feedback_type TEXT, -- 'loved', 'liked', 'disliked', 'clicked', 'copied'
    timestamp INTEGER NOT NULL,
    UNIQUE(session_id, title, feedback_type)
);

CREATE INDEX idx_outcomes_session ON recommendation_outcomes(session_id);
CREATE INDEX idx_outcomes_title ON recommendation_outcomes(title);
CREATE INDEX idx_outcomes_feedback ON recommendation_outcomes(feedback_type);