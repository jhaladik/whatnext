# Scripts Inventory and Organization

## 🟢 KEEP - Active & Useful Scripts

### Curator System (Essential)
- **curator-dashboard.js** - Monitor database health and curator metrics
- **curator-find-themed-recommendations.js** - Find movies by theme (animation, classics, etc.)
- **curator-find-recommendations.js** - General movie discovery
- **curator-evaluate-batch.js** - Batch evaluate multiple movies

### Queue Management (Essential)
- **clear-queue.js** - Clear processing queue with options
- **check-queue.js** - Check queue status

### Database Analysis (Useful)
- **analyze-database.js** - Comprehensive database analysis
- **analyze-quality.js** - Quality metrics analysis

### Core Processing (Keep for reference)
- **fetch-quality-movies.js** - Fetch movies from TMDB
- **add-classics-by-decade.js** - Add classic movies by era

## 🔴 ARCHIVE - Obsolete/Test Scripts

### Test Scripts (Development phase)
- **test-curator.js** - Initial curator testing
- **test-curator-scoring.js** - Scoring system testing
- **test-non-duplicate-scoring.js** - Scoring validation
- **test-queue-debug.js** - Queue debugging
- **test-queue-simple.js** - Simple queue tests
- **clear-and-test-queue.js** - Combined clear and test

### Migration Scripts (One-time use)
- **run-curator-migration.js** - Database migration (already run)
- **initialize-vectors.js** - Initial vector setup (already run)

### Old Processing Methods (Replaced by curator)
- **fill-database.js** - Old batch filling method
- **process-movies-direct.js** - Direct processing (bypasses queue)
- **process-sync.js** - Synchronous processing tests
- **queue-processor.js** - Old queue processor

## Recommended Actions

1. **Keep 10 scripts** in main scripts folder
2. **Archive 12 scripts** to `/scripts/archive-2025-08-14/`
3. Each archived script should have a comment explaining why it was archived