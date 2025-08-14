-- Migration to add missing media and streaming fields for recommendation cards
-- Run this before continuing with movie processing

-- Visual Media Fields
ALTER TABLE movies ADD COLUMN poster_path TEXT;
ALTER TABLE movies ADD COLUMN backdrop_path TEXT;
ALTER TABLE movies ADD COLUMN trailer_key TEXT; -- YouTube video key

-- People Fields (JSON arrays)
ALTER TABLE movies ADD COLUMN cast TEXT; -- JSON array of {name, character, order, profile_path}
ALTER TABLE movies ADD COLUMN director TEXT; -- Director name(s)
ALTER TABLE movies ADD COLUMN crew TEXT; -- JSON array of key crew members

-- Streaming & Availability (JSON)
ALTER TABLE movies ADD COLUMN streaming_providers TEXT; -- JSON array of provider names
ALTER TABLE movies ADD COLUMN streaming_regions TEXT; -- JSON object with region codes
ALTER TABLE movies ADD COLUMN watch_links TEXT; -- JSON object with provider URLs

-- Additional Metadata
ALTER TABLE movies ADD COLUMN tagline TEXT;
ALTER TABLE movies ADD COLUMN budget INTEGER;
ALTER TABLE movies ADD COLUMN revenue INTEGER;
ALTER TABLE movies ADD COLUMN imdb_id TEXT;
ALTER TABLE movies ADD COLUMN homepage TEXT;
ALTER TABLE movies ADD COLUMN spoken_languages TEXT; -- JSON array
ALTER TABLE movies ADD COLUMN status TEXT; -- Released, In Production, etc.
ALTER TABLE movies ADD COLUMN media_type TEXT DEFAULT 'movie'; -- movie or tv
ALTER TABLE movies ADD COLUMN collection_id INTEGER; -- For movie series
ALTER TABLE movies ADD COLUMN collection_name TEXT;

-- TV Show specific fields (if media_type = 'tv')
ALTER TABLE movies ADD COLUMN number_of_seasons INTEGER;
ALTER TABLE movies ADD COLUMN number_of_episodes INTEGER;
ALTER TABLE movies ADD COLUMN episode_run_time TEXT; -- JSON array of typical episode lengths
ALTER TABLE movies ADD COLUMN first_air_date TEXT;
ALTER TABLE movies ADD COLUMN last_air_date TEXT;
ALTER TABLE movies ADD COLUMN in_production BOOLEAN;
ALTER TABLE movies ADD COLUMN creator TEXT; -- Creator name(s) for TV shows
ALTER TABLE movies ADD COLUMN networks TEXT; -- JSON array of networks

-- Indexes for new fields
CREATE INDEX IF NOT EXISTS idx_movies_media_type ON movies(media_type);
CREATE INDEX IF NOT EXISTS idx_movies_imdb_id ON movies(imdb_id);
CREATE INDEX IF NOT EXISTS idx_movies_collection ON movies(collection_id);