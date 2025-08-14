#!/usr/bin/env node

/**
 * Run curator migration through a temporary worker endpoint
 */

const WORKER_URL = 'https://whatnext-vectorize.jhaladik.workers.dev';
const ADMIN_KEY = 'UgWKZLhjrD9ngI4I3hj1G0nd6YQJLG4X';

// Split migration into smaller statements
const MIGRATION_STATEMENTS = [
  // Curation log
  `CREATE TABLE IF NOT EXISTS curation_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    action TEXT NOT NULL,
    reason TEXT,
    source TEXT,
    quality_score REAL,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT DEFAULT 'system'
  )`,
  
  // Indexes for curation_log
  `CREATE INDEX IF NOT EXISTS idx_curation_log_tmdb ON curation_log(tmdb_id)`,
  `CREATE INDEX IF NOT EXISTS idx_curation_log_action ON curation_log(action)`,
  `CREATE INDEX IF NOT EXISTS idx_curation_log_created ON curation_log(created_at DESC)`,
  
  // Duplicate mappings
  `CREATE TABLE IF NOT EXISTS duplicate_mappings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    primary_tmdb_id INTEGER NOT NULL,
    duplicate_tmdb_id INTEGER NOT NULL,
    match_type TEXT NOT NULL,
    match_confidence REAL,
    title_primary TEXT,
    title_duplicate TEXT,
    year_primary INTEGER,
    year_duplicate INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(primary_tmdb_id, duplicate_tmdb_id)
  )`,
  
  // Indexes for duplicate_mappings
  `CREATE INDEX IF NOT EXISTS idx_duplicate_primary ON duplicate_mappings(primary_tmdb_id)`,
  `CREATE INDEX IF NOT EXISTS idx_duplicate_duplicate ON duplicate_mappings(duplicate_tmdb_id)`,
  
  // Rejection log
  `CREATE TABLE IF NOT EXISTS rejection_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tmdb_id INTEGER NOT NULL,
    title TEXT,
    year INTEGER,
    rejection_reason TEXT,
    rejection_details TEXT,
    vote_average REAL,
    vote_count INTEGER,
    popularity REAL,
    runtime INTEGER,
    source TEXT,
    attempted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Indexes for rejection_log
  `CREATE INDEX IF NOT EXISTS idx_rejection_tmdb ON rejection_log(tmdb_id)`,
  `CREATE INDEX IF NOT EXISTS idx_rejection_reason ON rejection_log(rejection_reason)`,
  `CREATE INDEX IF NOT EXISTS idx_rejection_attempted ON rejection_log(attempted_at DESC)`,
  
  // Source collections
  `CREATE TABLE IF NOT EXISTS source_collections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT UNIQUE NOT NULL,
    display_name TEXT,
    description TEXT,
    total_movies INTEGER DEFAULT 0,
    movies_added INTEGER DEFAULT 0,
    movies_rejected INTEGER DEFAULT 0,
    movies_pending INTEGER DEFAULT 0,
    last_synced TIMESTAMP,
    metadata TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Movie sources
  `CREATE TABLE IF NOT EXISTS movie_sources (
    movie_id INTEGER NOT NULL,
    source_id INTEGER NOT NULL,
    rank_in_source INTEGER,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (movie_id, source_id)
  )`,
  
  // Quality metrics
  `CREATE TABLE IF NOT EXISTS quality_metrics (
    tmdb_id INTEGER PRIMARY KEY,
    rating_score REAL,
    popularity_score REAL,
    vote_confidence REAL,
    cultural_score REAL,
    longevity_score REAL,
    critical_score REAL,
    diversity_score REAL,
    uniqueness_score REAL,
    genre_balance_score REAL,
    overall_score REAL,
    score_version TEXT DEFAULT '1.0',
    calculated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Indexes for quality_metrics
  `CREATE INDEX IF NOT EXISTS idx_quality_overall ON quality_metrics(overall_score DESC)`,
  `CREATE INDEX IF NOT EXISTS idx_quality_calculated ON quality_metrics(calculated_at DESC)`,
  
  // Curation stats
  `CREATE TABLE IF NOT EXISTS curation_stats (
    date TEXT PRIMARY KEY,
    movies_evaluated INTEGER DEFAULT 0,
    movies_added INTEGER DEFAULT 0,
    movies_rejected INTEGER DEFAULT 0,
    movies_updated INTEGER DEFAULT 0,
    duplicates_found INTEGER DEFAULT 0,
    average_quality_score REAL,
    tmdb_evaluated INTEGER DEFAULT 0,
    tmdb_added INTEGER DEFAULT 0,
    manual_evaluated INTEGER DEFAULT 0,
    manual_added INTEGER DEFAULT 0,
    processing_time_ms INTEGER,
    api_calls_made INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`,
  
  // Curator config
  `CREATE TABLE IF NOT EXISTS curator_config (
    key TEXT PRIMARY KEY,
    value TEXT,
    description TEXT,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )`
];

// Default configuration values
const CONFIG_INSERTS = [
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('min_quality_score', '60', 'Minimum quality score to accept a movie')`,
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('min_vote_count', '1000', 'Minimum votes required')`,
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('min_rating', '6.5', 'Minimum TMDB rating')`,
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('min_year_age', '2', 'Movies must be at least N years old')`,
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('max_daily_additions', '50', 'Maximum movies to add per day')`,
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('duplicate_threshold', '0.85', 'Similarity threshold for duplicate detection')`,
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('enable_auto_curation', 'false', 'Enable automatic curation')`,
  `INSERT OR IGNORE INTO curator_config (key, value, description) VALUES ('curator_version', '1.0', 'Current curator version')`
];

// Source collections
const SOURCE_INSERTS = [
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('tmdb_popular', 'TMDB Popular', 'Popular movies from TMDB')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('tmdb_top_rated', 'TMDB Top Rated', 'Top rated movies from TMDB')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('tmdb_discover', 'TMDB Discover', 'Movies discovered through TMDB API')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('manual_addition', 'Manual', 'Manually added movies')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('afi_top_100', 'AFI Top 100', 'American Film Institute Top 100')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('criterion_collection', 'Criterion Collection', 'Criterion Collection films')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('oscar_winners', 'Oscar Winners', 'Academy Award winning films')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('cannes_winners', 'Cannes Winners', 'Cannes Film Festival winners')`,
  `INSERT OR IGNORE INTO source_collections (name, display_name, description) VALUES ('user_requests', 'User Requests', 'Movies requested by users')`
];

async function runMigration() {
  console.log('='.repeat(70));
  console.log('🔧 CURATOR MIGRATION RUNNER');
  console.log('='.repeat(70));
  
  console.log('\n📝 Note: Since we cannot run migrations directly on remote D1,');
  console.log('   we need to add a temporary migration endpoint to the worker.');
  console.log('   For now, we will test with the existing tables.\n');
  
  // Try to test if tables exist by running curator stats
  console.log('Testing if curator tables exist...\n');
  
  try {
    const response = await fetch(`${WORKER_URL}/curator/stats`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminKey: ADMIN_KEY,
        days: 1
      })
    });
    
    if (response.ok) {
      const stats = await response.json();
      console.log('✅ Curator tables appear to exist!');
      console.log('   Stats:', JSON.stringify(stats, null, 2));
    } else {
      const error = await response.text();
      if (error.includes('no such table')) {
        console.log('❌ Curator tables do not exist yet.');
        console.log('\n🔄 To create them, you need to:');
        console.log('   1. Go to Cloudflare Dashboard');
        console.log('   2. Navigate to Workers & Pages > whatnext-vectorize');
        console.log('   3. Go to Settings > D1 Database Bindings');
        console.log('   4. Click on the database "whatnext-vectorize"');
        console.log('   5. Go to Console tab');
        console.log('   6. Run the SQL from migrations/0003_curator_tables.sql');
        
        console.log('\n📋 Or add a migration endpoint to the worker temporarily.');
        console.log('\n🎯 For now, let\'s create a simplified migration endpoint...');
        
        // Show the SQL that needs to be run
        console.log('\n📜 SQL to run in Cloudflare Console:');
        console.log('-'.repeat(70));
        console.log(MIGRATION_STATEMENTS[0]); // Show first table as example
        console.log('...(and the rest from migrations/0003_curator_tables.sql)');
      }
    }
  } catch (error) {
    console.log('❌ Error testing curator:', error.message);
  }
  
  console.log('\n' + '='.repeat(70));
}

runMigration().catch(console.error);