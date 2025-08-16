// Debug endpoint to check D1 database tables and movie data
export async function onRequest(context) {
  const { env } = context;
  
  if (!env.DB) {
    return new Response(JSON.stringify({
      error: 'D1 database not configured'
    }), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
  
  try {
    // Get list of tables
    const tables = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all();
    
    // Try to get a sample movie with poster data
    let sampleMovie = null;
    let movieCount = 0;
    let moviesWithPosters = 0;
    
    // Check all tables that might contain movie data
    const movieTables = [];
    for (const table of tables.results) {
      const tableName = table.name;
      // Check if table contains movie-related data
      if (tableName.toLowerCase().includes('movie') || 
          tableName.toLowerCase().includes('vector') ||
          tableName.toLowerCase().includes('metadata')) {
        try {
          // Get sample data and column info
          const sample = await env.DB.prepare(`SELECT * FROM ${tableName} LIMIT 1`).first();
          const columns = await env.DB.prepare(`PRAGMA table_info(${tableName})`).all();
          
          movieTables.push({
            name: tableName,
            columns: columns.results.map(c => c.name),
            hasPosterPath: columns.results.some(c => c.name === 'poster_path'),
            hasTmdbId: columns.results.some(c => c.name === 'tmdb_id'),
            sampleData: sample
          });
        } catch (e) {
          // Skip tables that can't be read
        }
      }
    }
    
    // Try different possible table names for movie data
    const possibleTables = ['movie_metadata', 'movies', 'movie_data', 'movie_cache', 'movie_vectors'];
    let workingTable = null;
    
    for (const tableName of possibleTables) {
      try {
        const result = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM ${tableName}`
        ).first();
        if (result) {
          workingTable = tableName;
          movieCount = result.count;
          break;
        }
      } catch (e) {
        // Table doesn't exist, continue
      }
    }
    
    if (workingTable) {
      // Get a sample movie
      try {
        sampleMovie = await env.DB.prepare(
          `SELECT * FROM ${workingTable} LIMIT 1`
        ).first();
      } catch (e) {
        sampleMovie = { error: e.message };
      }
      
      // Try to count movies with posters
      try {
        const posterCount = await env.DB.prepare(
          `SELECT COUNT(*) as count FROM ${workingTable} WHERE poster_path IS NOT NULL`
        ).first();
        moviesWithPosters = posterCount.count;
      } catch (e) {
        // Column might not exist
        moviesWithPosters = 0;
      }
      
      // Get schema
      const schema = await env.DB.prepare(
        `PRAGMA table_info(${workingTable})`
      ).all();
      
      return new Response(JSON.stringify({
        tables: tables.results.map(t => t.name),
        movieTables,
        workingTable,
        movieCount,
        moviesWithPosters,
        sampleMovie,
        tableSchema: schema.results.map(col => ({
          name: col.name,
          type: col.type
        }))
      }, null, 2), {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      });
    }
    
    return new Response(JSON.stringify({
      tables: tables.results.map(t => t.name),
      movieTables,
      error: 'No movie table with poster_path found',
      triedTables: possibleTables
    }, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
    
  } catch (error) {
    return new Response(JSON.stringify({
      error: 'Database query failed',
      message: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}