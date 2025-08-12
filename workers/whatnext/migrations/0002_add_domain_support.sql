-- migrations/0002_add_domain_support.sql
-- Adds domain support to What Next Recommendation Engine

-- Add domain column to questions table
ALTER TABLE questions ADD COLUMN domain TEXT DEFAULT 'general';

-- Update content_cache table with domain support
ALTER TABLE content_cache ADD COLUMN domain TEXT DEFAULT 'general';
ALTER TABLE content_cache ADD COLUMN external_id TEXT;
ALTER TABLE content_cache ADD COLUMN metadata TEXT;
ALTER TABLE content_cache ADD COLUMN vector_embedding TEXT;

-- Create domains configuration table
CREATE TABLE IF NOT EXISTS domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  question_set TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  config TEXT, -- JSON configuration
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Create indexes for domain support
CREATE INDEX idx_questions_domain ON questions(domain, is_active);
CREATE INDEX idx_content_cache_domain ON content_cache(domain, external_id);
CREATE INDEX idx_domains_active ON domains(is_active);

-- Insert initial domain configurations
INSERT INTO domains (id, name, question_set, is_active, config, created_at, updated_at)
VALUES 
  ('general', 'General Content', 'general_questions', 1, '{"description": "General content recommendations"}', strftime('%s', 'now'), strftime('%s', 'now')),
  ('movies', 'Movies & Shows', 'movie_questions', 1, '{"description": "Movie and TV show recommendations", "enrichment_service": "TMDBService", "prompt_template": "movie_prompt"}', strftime('%s', 'now'), strftime('%s', 'now')),
  ('books', 'Books', 'book_questions', 0, '{"description": "Book recommendations", "enrichment_service": "GoodreadsService", "prompt_template": "book_prompt"}', strftime('%s', 'now'), strftime('%s', 'now')),
  ('restaurants', 'Restaurants', 'restaurant_questions', 0, '{"description": "Restaurant recommendations", "enrichment_service": "YelpService", "prompt_template": "restaurant_prompt"}', strftime('%s', 'now'), strftime('%s', 'now'));

-- Update existing questions to have general domain
UPDATE questions SET domain = 'general' WHERE domain IS NULL;