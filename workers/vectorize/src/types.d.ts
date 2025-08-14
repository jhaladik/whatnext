// Cloudflare Vectorize types
interface VectorizeIndex {
  query(query: VectorizeQuery): Promise<VectorizeMatches>;
  upsert(vectors: VectorizeVector[]): Promise<void>;
  getByIds(ids: string[]): Promise<VectorizeVector[]>;
  deleteByIds(ids: string[]): Promise<void>;
}

interface VectorizeVector {
  id: string;
  values: number[];
  metadata?: Record<string, any>;
}

interface VectorizeQuery {
  vector: number[];
  topK: number;
  returnMetadata?: boolean;
  filter?: Record<string, any>;
}

interface VectorizeMatches {
  matches: VectorizeMatch[];
  count?: number;
}

interface VectorizeMatch {
  id: string;
  score: number;
  metadata?: Record<string, any>;
  values?: number[];
}

// Environment interface
interface Env {
  // Secrets
  TMDB_API_KEY: string;
  OPENAI_API_KEY: string;
  ADMIN_KEY?: string;
  
  // Bindings
  MOVIE_VECTORS: VectorizeIndex;
  DB: D1Database;
  RATE_LIMIT_KV: KVNamespace;
  PROCESSING_QUEUE: KVNamespace;
  
  // Variables
  TMDB_RATE_LIMIT_PER_SECOND: string;
  TMDB_BURST_DELAY_MS: string;
  OPENAI_BATCH_SIZE: string;
  VECTORIZE_BATCH_SIZE: string;
  MAX_DAILY_NEW_MOVIES: string;
  ENVIRONMENT: string;
}