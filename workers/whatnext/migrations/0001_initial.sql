-- migrations/0001_initial.sql
-- D1 Database Schema for What Next Recommendation Engine

-- User interaction tracking
CREATE TABLE interactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    action TEXT NOT NULL,  -- 'session_start', 'question_answered', 'recommendations_generated'
    question_id TEXT,      -- NULL for session_start/end
    choice TEXT,           -- User's choice for the question
    timestamp INTEGER NOT NULL,
    metadata TEXT,         -- JSON blob for additional context
    user_agent TEXT,       -- For device/context inference
    ip_hash TEXT          -- Hashed IP for geographic patterns (privacy-preserving)
);

-- Question performance tracking for optimization
CREATE TABLE question_performance (
    question_id TEXT PRIMARY KEY,
    avg_info_gain REAL DEFAULT 0.0,     -- Average information gain achieved
    usage_count INTEGER DEFAULT 0,       -- How many times used
    avg_satisfaction REAL DEFAULT 0.0,   -- User satisfaction rating
    success_rate REAL DEFAULT 0.0,       -- Lead to successful recommendations
    last_updated INTEGER NOT NULL,
    vector_embedding TEXT,               -- JSON array for future vector support
    a_b_test_group TEXT                  -- For testing question variations
);

-- Recommendation feedback for learning
CREATE TABLE recommendation_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    recommendation_type TEXT,     -- 'video', 'article', 'podcast', etc.
    recommendation_source TEXT,   -- 'youtube', 'tmdb', etc.
    user_rating INTEGER,          -- 1-5 stars or thumbs up/down
    was_clicked BOOLEAN DEFAULT FALSE,
    watch_time_seconds INTEGER,   -- If available
    timestamp INTEGER NOT NULL,
    feedback_text TEXT           -- Optional user comment
);

-- Question library with performance metrics
CREATE TABLE questions (
    id TEXT PRIMARY KEY,
    question_text TEXT NOT NULL,
    question_type TEXT NOT NULL,     -- 'perfect', 'followup', 'contextual'
    category TEXT,                   -- 'cognitive', 'format', 'novelty', etc.
    expected_info_gain REAL DEFAULT 0.0,
    vector_position TEXT,            -- JSON array for vector space position
    is_active BOOLEAN DEFAULT TRUE,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    a_b_test_weight REAL DEFAULT 1.0
);

-- Content recommendations cache
CREATE TABLE content_cache (
    cache_key TEXT PRIMARY KEY,         -- Hash of user preferences
    content_type TEXT NOT NULL,         -- 'video', 'article', 'podcast'
    recommendations TEXT NOT NULL,      -- JSON array of recommendations
    source_api TEXT,                   -- 'claude', 'tmdb', 'youtube'
    created_at INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    hit_count INTEGER DEFAULT 0,
    success_rate REAL DEFAULT 0.0
);

-- User preference patterns (privacy-preserving)
CREATE TABLE preference_patterns (
    pattern_id TEXT PRIMARY KEY,
    preference_vector TEXT NOT NULL,    -- JSON array of preference weights
    usage_frequency INTEGER DEFAULT 1,
    success_rate REAL DEFAULT 0.0,
    time_of_day_pattern TEXT,          -- JSON object with hourly preferences
    content_type_affinity TEXT,        -- JSON object with type preferences
    last_seen INTEGER NOT NULL
);

-- A/B testing framework
CREATE TABLE ab_tests (
    test_id TEXT PRIMARY KEY,
    test_name TEXT NOT NULL,
    control_version TEXT NOT NULL,
    variant_version TEXT NOT NULL,
    traffic_split REAL DEFAULT 0.5,    -- 0.5 = 50/50 split
    start_date INTEGER NOT NULL,
    end_date INTEGER,
    is_active BOOLEAN DEFAULT TRUE,
    success_metric TEXT NOT NULL       -- 'completion_rate', 'satisfaction', etc.
);

-- System health and performance monitoring
CREATE TABLE system_metrics (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    timestamp INTEGER NOT NULL,
    metadata TEXT                      -- JSON for additional context
);

-- Indexes for performance
CREATE INDEX idx_interactions_session_id ON interactions(session_id);
CREATE INDEX idx_interactions_timestamp ON interactions(timestamp);
CREATE INDEX idx_interactions_action ON interactions(action);

CREATE INDEX idx_question_performance_usage ON question_performance(usage_count DESC);
CREATE INDEX idx_question_performance_info_gain ON question_performance(avg_info_gain DESC);

CREATE INDEX idx_recommendation_feedback_session ON recommendation_feedback(session_id);
CREATE INDEX idx_recommendation_feedback_rating ON recommendation_feedback(user_rating);

CREATE INDEX idx_questions_active ON questions(is_active, expected_info_gain DESC);
CREATE INDEX idx_questions_type ON questions(question_type);

CREATE INDEX idx_content_cache_expires ON content_cache(expires_at);
CREATE INDEX idx_content_cache_key ON content_cache(cache_key);

CREATE INDEX idx_preference_patterns_frequency ON preference_patterns(usage_frequency DESC);

CREATE INDEX idx_system_metrics_timestamp ON system_metrics(timestamp);
CREATE INDEX idx_system_metrics_name ON system_metrics(metric_name);

-- Initial data: Insert the perfect question
INSERT INTO questions (id, question_text, question_type, category, expected_info_gain, created_at, updated_at) 
VALUES (
    'cognitive_engagement',
    'Do you want something that challenges your mind or entertains without effort?',
    'perfect',
    'cognitive',
    0.92,
    strftime('%s', 'now'),
    strftime('%s', 'now')
);

-- Insert some follow-up questions for high cognitive load branch
INSERT INTO questions (id, question_text, question_type, category, expected_info_gain, created_at, updated_at) 
VALUES 
    ('learning_depth', 'Do you want to learn something completely new or go deeper into what you know?', 'followup', 'learning', 0.85, strftime('%s', 'now'), strftime('%s', 'now')),
    ('content_format', 'Do you prefer video content or text-based content?', 'followup', 'format', 0.78, strftime('%s', 'now'), strftime('%s', 'now')),
    ('time_commitment', 'Are you looking for something quick (under 20 minutes) or something substantial?', 'followup', 'time', 0.81, strftime('%s', 'now'), strftime('%s', 'now'));

-- Insert follow-up questions for low cognitive load branch  
INSERT INTO questions (id, question_text, question_type, category, expected_info_gain, created_at, updated_at)
VALUES
    ('engagement_type', 'Do you want something interactive and engaging or passive and relaxing?', 'followup', 'engagement', 0.83, strftime('%s', 'now'), strftime('%s', 'now')),
    ('novelty_preference', 'Do you want something familiar and comforting or a pleasant surprise?', 'followup', 'novelty', 0.79, strftime('%s', 'now'), strftime('%s', 'now')),
    ('social_context', 'Is this just for you or something to share/discuss with others?', 'followup', 'social', 0.74, strftime('%s', 'now'), strftime('%s', 'now'));

-- Triggers for maintaining data quality
CREATE TRIGGER update_question_timestamp 
    AFTER UPDATE ON questions
    BEGIN
        UPDATE questions SET updated_at = strftime('%s', 'now') WHERE id = NEW.id;
    END;