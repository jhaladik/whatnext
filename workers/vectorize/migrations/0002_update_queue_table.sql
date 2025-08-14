-- Update processing_queue table with better structure
-- This migration adds missing columns if they don't exist

-- First, let's recreate the table with all needed columns
DROP TABLE IF EXISTS processing_queue_old;
ALTER TABLE processing_queue RENAME TO processing_queue_old;

-- Create new table with all columns
CREATE TABLE processing_queue (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tmdb_id INTEGER NOT NULL UNIQUE,
  priority INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  last_error TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata TEXT -- JSON for additional data
);

-- Create indexes for performance
CREATE INDEX idx_queue_status ON processing_queue(status);
CREATE INDEX idx_queue_priority ON processing_queue(priority DESC, added_at ASC);
CREATE INDEX idx_queue_tmdb ON processing_queue(tmdb_id);

-- Copy data from old table if it exists
INSERT OR IGNORE INTO processing_queue (tmdb_id, priority, status, added_at, processed_at)
SELECT tmdb_id, priority, status, added_at, processed_at
FROM processing_queue_old
WHERE tmdb_id IS NOT NULL;

-- Drop old table
DROP TABLE IF EXISTS processing_queue_old;

-- Add some sample high-priority classic movies to test
INSERT OR IGNORE INTO processing_queue (tmdb_id, priority, status) VALUES
  (238, 10, 'pending'),   -- The Godfather (1972)
  (278, 10, 'pending'),   -- Shawshank Redemption (1994)
  (424, 10, 'pending'),   -- Schindler's List (1993)
  (389, 10, 'pending'),   -- 12 Angry Men (1957)
  (129, 10, 'pending'),   -- Spirited Away (2001)
  (497, 10, 'pending'),   -- The Green Mile (1999)
  (637, 10, 'pending'),   -- Life is Beautiful (1997)
  (550, 10, 'pending'),   -- Fight Club (1999)
  (680, 10, 'pending'),   -- Pulp Fiction (1994)
  (13, 10, 'pending');    -- Forrest Gump (1994)