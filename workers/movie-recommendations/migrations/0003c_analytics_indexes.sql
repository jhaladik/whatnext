-- Migration 0003c: Analytics Indexes

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_session_embeddings_cluster ON session_embeddings(cluster_id);
CREATE INDEX IF NOT EXISTS idx_session_embeddings_created ON session_embeddings(created_at);
CREATE INDEX IF NOT EXISTS idx_recommendation_results_session ON recommendation_results(session_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_results_movie ON recommendation_results(movie_id);
CREATE INDEX IF NOT EXISTS idx_recommendation_results_outcome ON recommendation_results(final_outcome);
CREATE INDEX IF NOT EXISTS idx_question_effectiveness_domain ON question_effectiveness(domain);
CREATE INDEX IF NOT EXISTS idx_question_effectiveness_variance ON question_effectiveness(embedding_variance);
CREATE INDEX IF NOT EXISTS idx_temporal_preferences_session ON temporal_preferences(session_id);
CREATE INDEX IF NOT EXISTS idx_temporal_preferences_time ON temporal_preferences(hour_of_day, day_of_week);
CREATE INDEX IF NOT EXISTS idx_question_variants_active ON question_variants(question_id, is_active);
CREATE INDEX IF NOT EXISTS idx_embedding_refinements_session ON embedding_refinements(session_id);