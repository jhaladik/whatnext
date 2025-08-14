# Archived Scripts - August 14, 2025

These scripts were archived as they served their purpose during development or have been replaced by better solutions.

## Test Scripts (Development Phase)
- **test-curator.js** - Initial curator service testing, used to validate curator evaluation logic
- **test-curator-scoring.js** - Tested the scoring algorithm improvements (100/100 issue fix)
- **test-non-duplicate-scoring.js** - Validated realistic scoring with fictional movies
- **test-queue-debug.js** - Debugged queue processing issues with setTimeout/Worker limits
- **test-queue-simple.js** - Simple queue operation tests
- **clear-and-test-queue.js** - Combined script for queue testing during development

## Migration Scripts (One-time Use)
- **run-curator-migration.js** - Created curator tables in D1 database (completed successfully)
- **initialize-vectors.js** - Initial Vectorize index setup (already executed)

## Deprecated Processing Methods
- **fill-database.js** - Old batch database filling, replaced by curator system
- **process-movies-direct.js** - Direct processing bypassing queue, not needed with fixed queue
- **process-sync.js** - Synchronous processing experiments, learned Worker limitations
- **queue-processor.js** - Old queue processor, replaced by improved /process-queue endpoint

## Why Archived?
1. **Test scripts**: Served their purpose during development and debugging
2. **Migration scripts**: One-time use, database changes already applied
3. **Old processors**: Replaced by curator system with better quality control
4. **Experiments**: Helped understand Cloudflare Worker limitations (no setTimeout, etc.)

## Lessons Learned
- Cloudflare Workers don't support setTimeout/setInterval
- ctx.waitUntil() is unreliable for long async operations
- Synchronous processing with proper queue management works best
- Curator system provides better quality control than bulk imports

Keep these for reference but they're no longer needed for operations.