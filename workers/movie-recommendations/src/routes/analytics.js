// src/routes/analytics.js - Analytics Dashboard Endpoints
import { asyncHandler } from '../utils/errorHandler.js';

/**
 * Get question performance analytics
 */
export const getQuestionPerformance = asyncHandler(async (request, env) => {
  const { domain = 'movies' } = request.query || {};
  
  const results = await env.DB.prepare(`
    SELECT 
      question_id,
      domain,
      total_answers,
      embedding_variance,
      outcome_correlation,
      skip_rate,
      CASE 
        WHEN outcome_correlation > 0.7 AND embedding_variance > 0.3 THEN 'High Impact'
        WHEN outcome_correlation > 0.5 OR embedding_variance > 0.5 THEN 'Medium Impact'
        ELSE 'Low Impact'
      END as impact_level,
      optimal_position
    FROM question_effectiveness
    WHERE domain = ?
    ORDER BY outcome_correlation DESC
  `).bind(domain).all();
  
  return Response.json({
    domain,
    questions: results,
    timestamp: Date.now()
  });
});

/**
 * Get session success metrics
 */
export const getSessionMetrics = asyncHandler(async (request, env) => {
  const { days = 7 } = request.query || {};
  const since = Math.floor(Date.now() / 1000) - (days * 86400);
  
  const metrics = await env.DB.prepare(`
    SELECT 
      COUNT(*) as total_sessions,
      AVG(total_recommendations) as avg_recommendations,
      AVG(CAST(clicked_count AS REAL) / NULLIF(total_recommendations, 0)) as avg_click_rate,
      AVG(CAST(liked_count AS REAL) / NULLIF(total_recommendations, 0)) as avg_like_rate,
      AVG(overall_satisfaction) as avg_satisfaction,
      SUM(CASE WHEN session_success THEN 1 ELSE 0 END) as successful_sessions,
      AVG(CASE WHEN session_success THEN 1.0 ELSE 0.0 END) as success_rate
    FROM session_feedback_summary
    WHERE created_at > ?
  `).bind(since).first();
  
  const dailyMetrics = await env.DB.prepare(`
    SELECT 
      DATE(created_at, 'unixepoch') as date,
      COUNT(*) as sessions,
      AVG(overall_satisfaction) as satisfaction
    FROM session_feedback_summary
    WHERE created_at > ?
    GROUP BY DATE(created_at, 'unixepoch')
    ORDER BY date DESC
  `).bind(since).all();
  
  return Response.json({
    period: `${days} days`,
    metrics,
    daily: dailyMetrics,
    timestamp: Date.now()
  });
});

/**
 * Get embedding cluster analysis
 */
export const getClusterAnalysis = asyncHandler(async (request, env) => {
  const clusters = await env.DB.prepare(`
    SELECT 
      cluster_id,
      cluster_name,
      cluster_label,
      session_count,
      avg_satisfaction,
      avg_interaction_rate,
      common_genres,
      common_keywords,
      optimal_questions
    FROM embedding_clusters
    ORDER BY session_count DESC
    LIMIT 20
  `).all();
  
  const clusterDistribution = await env.DB.prepare(`
    SELECT 
      cluster_id,
      COUNT(*) as session_count,
      AVG(vector_magnitude) as avg_magnitude
    FROM session_embeddings
    WHERE cluster_id IS NOT NULL
    GROUP BY cluster_id
  `).all();
  
  return Response.json({
    clusters,
    distribution: clusterDistribution,
    timestamp: Date.now()
  });
});

/**
 * Get temporal patterns
 */
export const getTemporalPatterns = asyncHandler(async (request, env) => {
  const hourlyPatterns = await env.DB.prepare(`
    SELECT 
      hour_of_day,
      COUNT(*) as session_count,
      AVG(CASE WHEN recommendation_success THEN 1.0 ELSE 0.0 END) as success_rate,
      GROUP_CONCAT(DISTINCT genres_preferred) as common_genres
    FROM temporal_preferences
    GROUP BY hour_of_day
    ORDER BY hour_of_day
  `).all();
  
  const weekdayPatterns = await env.DB.prepare(`
    SELECT 
      day_of_week,
      is_weekend,
      COUNT(*) as session_count,
      AVG(CASE WHEN recommendation_success THEN 1.0 ELSE 0.0 END) as success_rate
    FROM temporal_preferences
    GROUP BY day_of_week, is_weekend
    ORDER BY day_of_week
  `).all();
  
  return Response.json({
    hourly: hourlyPatterns,
    weekly: weekdayPatterns,
    timestamp: Date.now()
  });
});

/**
 * Get recommendation effectiveness
 */
export const getRecommendationEffectiveness = asyncHandler(async (request, env) => {
  const { limit = 100 } = request.query || {};
  
  const moviePerformance = await env.DB.prepare(`
    SELECT 
      movie_id,
      COUNT(*) as times_recommended,
      AVG(rank_position) as avg_position,
      AVG(similarity_score) as avg_similarity,
      SUM(CASE WHEN was_clicked THEN 1 ELSE 0 END) as clicks,
      SUM(CASE WHEN was_liked THEN 1 ELSE 0 END) as likes,
      SUM(CASE WHEN watch_initiated THEN 1 ELSE 0 END) as watches,
      AVG(CASE WHEN was_clicked THEN 1.0 ELSE 0.0 END) as click_rate,
      AVG(feedback_score) as avg_rating
    FROM recommendation_results
    GROUP BY movie_id
    HAVING times_recommended > 5
    ORDER BY click_rate DESC
    LIMIT ?
  `).bind(limit).all();
  
  const positionAnalysis = await env.DB.prepare(`
    SELECT 
      rank_position,
      COUNT(*) as count,
      AVG(CASE WHEN was_clicked THEN 1.0 ELSE 0.0 END) as click_rate,
      AVG(CASE WHEN was_liked THEN 1.0 ELSE 0.0 END) as like_rate
    FROM recommendation_results
    GROUP BY rank_position
    ORDER BY rank_position
  `).all();
  
  return Response.json({
    movies: moviePerformance,
    positionAnalysis,
    timestamp: Date.now()
  });
});

/**
 * Get embedding drift analysis
 */
export const getEmbeddingDrift = asyncHandler(async (request, env) => {
  const driftAnalysis = await env.DB.prepare(`
    SELECT 
      refinement_reason as reason,
      COUNT(*) as count,
      AVG(drift_magnitude) as avg_drift,
      AVG(improvement_score) as avg_improvement
    FROM embedding_refinements
    GROUP BY refinement_reason
    ORDER BY count DESC
  `).all();
  
  const driftPatterns = await env.DB.prepare(`
    SELECT 
      drift_dimensions,
      COUNT(*) as frequency
    FROM embedding_refinements
    WHERE drift_dimensions IS NOT NULL
    GROUP BY drift_dimensions
    ORDER BY frequency DESC
    LIMIT 10
  `).all();
  
  return Response.json({
    analysis: driftAnalysis,
    patterns: driftPatterns.map(p => ({
      dimensions: JSON.parse(p.drift_dimensions),
      frequency: p.frequency
    })),
    timestamp: Date.now()
  });
});

/**
 * Get A/B test results for question variants
 */
export const getQuestionVariants = asyncHandler(async (request, env) => {
  const variants = await env.DB.prepare(`
    SELECT 
      question_id,
      variant_label,
      question_text,
      sessions_count,
      avg_satisfaction,
      avg_response_time,
      conversion_rate,
      embedding_quality,
      is_active
    FROM question_variants
    WHERE is_active = TRUE
    ORDER BY question_id, variant_label
  `).all();
  
  const grouped = {};
  for (const variant of variants) {
    if (!grouped[variant.question_id]) {
      grouped[variant.question_id] = [];
    }
    grouped[variant.question_id].push(variant);
  }
  
  return Response.json({
    variants: grouped,
    timestamp: Date.now()
  });
});

/**
 * Get insights and recommendations
 */
export const getInsights = asyncHandler(async (request, env) => {
  const insights = [];
  
  // Find underperforming questions
  const weakQuestions = await env.DB.prepare(`
    SELECT question_id, outcome_correlation, embedding_variance
    FROM question_effectiveness
    WHERE outcome_correlation < 0.3 OR embedding_variance < 0.1
  `).all();
  
  if (weakQuestions.length > 0) {
    insights.push({
      type: 'warning',
      category: 'questions',
      message: `${weakQuestions.length} questions have low effectiveness`,
      details: weakQuestions,
      recommendation: 'Consider revising or replacing these questions'
    });
  }
  
  // Find successful clusters
  const successfulClusters = await env.DB.prepare(`
    SELECT cluster_id, cluster_label, avg_satisfaction, session_count
    FROM embedding_clusters
    WHERE avg_satisfaction > 4.0 AND session_count > 10
    ORDER BY avg_satisfaction DESC
    LIMIT 3
  `).all();
  
  if (successfulClusters.length > 0) {
    insights.push({
      type: 'success',
      category: 'clusters',
      message: 'High-performing user segments identified',
      details: successfulClusters,
      recommendation: 'Optimize for these preference patterns'
    });
  }
  
  // Find time-based patterns
  const peakHours = await env.DB.prepare(`
    SELECT hour_of_day, COUNT(*) as sessions
    FROM temporal_preferences
    GROUP BY hour_of_day
    ORDER BY sessions DESC
    LIMIT 3
  `).all();
  
  insights.push({
    type: 'info',
    category: 'temporal',
    message: 'Peak usage hours identified',
    details: peakHours,
    recommendation: 'Consider time-based recommendation adjustments'
  });
  
  return Response.json({
    insights,
    generated_at: Date.now()
  });
});