// src/services/analyticsService.js
export class AnalyticsService {
  constructor(env) {
    this.db = env.DB;
    this.enabled = env.ENABLE_ANALYTICS || false;
  }

  /**
   * Store complete session embedding for analysis
   */
  async storeSessionEmbedding(sessionId, embedding, questionAnswers, searchVector) {
    if (!this.enabled) return;

    try {
      // Calculate vector magnitude
      const magnitude = Math.sqrt(
        embedding.reduce((sum, val) => sum + val * val, 0)
      );

      // Find dominant dimensions (top 20 strongest values)
      const dimensionsWithIndex = embedding.map((val, idx) => ({ idx, val: Math.abs(val) }));
      const dominantDims = dimensionsWithIndex
        .sort((a, b) => b.val - a.val)
        .slice(0, 20)
        .map(d => ({ dimension: d.idx, value: embedding[d.idx] }));

      // Convert embedding to binary blob for storage
      const embeddingBuffer = new Float32Array(embedding);
      const embeddingBlob = new Uint8Array(embeddingBuffer.buffer);

      // Create embedding hash for similarity lookups
      const embeddingHash = await this.hashEmbedding(embedding);

      await this.db.prepare(`
        INSERT INTO session_embeddings (
          session_id, 
          embedding_vector, 
          embedding_json,
          question_answers,
          vector_magnitude,
          dominant_dimensions,
          embedding_hash,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        embeddingBlob,
        JSON.stringify(embedding.slice(0, 100)), // Store first 100 dims as JSON for queries
        JSON.stringify(questionAnswers),
        magnitude,
        JSON.stringify(dominantDims),
        embeddingHash,
        Math.floor(Date.now() / 1000)
      ).run();

      // Assign to cluster (simplified - would use k-means or similar in production)
      const clusterId = await this.assignToCluster(embedding);
      if (clusterId) {
        await this.db.prepare(`
          UPDATE session_embeddings 
          SET cluster_id = ? 
          WHERE session_id = ?
        `).bind(clusterId, sessionId).run();
      }

    } catch (error) {
      console.error('Failed to store session embedding:', error);
    }
  }

  /**
   * Track recommendation results
   */
  async trackRecommendationResults(sessionId, recommendations) {
    if (!this.enabled) return;

    try {
      const insertPromises = recommendations.map((movie, index) => 
        this.db.prepare(`
          INSERT INTO recommendation_results (
            session_id,
            movie_id,
            rank_position,
            similarity_score,
            was_displayed,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id, movie_id) DO UPDATE SET
            rank_position = excluded.rank_position,
            similarity_score = excluded.similarity_score,
            updated_at = excluded.created_at
        `).bind(
          sessionId,
          movie.movieId || movie.id,
          index + 1,
          movie.similarity || movie.searchRelevance || 0,
          true,
          Math.floor(Date.now() / 1000)
        ).run()
      );

      await Promise.all(insertPromises);

    } catch (error) {
      console.error('Failed to track recommendation results:', error);
    }
  }

  /**
   * Track user interaction with a recommendation
   */
  async trackInteraction(sessionId, movieId, interactionType, metadata = {}) {
    if (!this.enabled) return;

    try {
      const updates = {
        click: 'was_clicked = TRUE',
        like: 'was_liked = TRUE',
        dislike: 'was_disliked = TRUE',
        save: 'was_saved = TRUE',
        watch: 'watch_initiated = TRUE',
        complete: 'watch_completed = TRUE'
      };

      const updateClause = updates[interactionType] || '';
      if (!updateClause) return;

      await this.db.prepare(`
        UPDATE recommendation_results
        SET ${updateClause},
            interaction_type = ?,
            time_to_interaction = ?,
            final_outcome = ?,
            updated_at = ?
        WHERE session_id = ? AND movie_id = ?
      `).bind(
        interactionType,
        metadata.timeToInteraction || null,
        metadata.outcome || interactionType,
        Math.floor(Date.now() / 1000),
        sessionId,
        movieId
      ).run();

      // Update session summary
      await this.updateSessionSummary(sessionId, interactionType);

    } catch (error) {
      console.error('Failed to track interaction:', error);
    }
  }

  /**
   * Analyze question effectiveness
   */
  async analyzeQuestionEffectiveness(questionId, domain) {
    if (!this.enabled) return;

    try {
      // Calculate embedding variance for this question
      const varianceResult = await this.db.prepare(`
        SELECT 
          AVG(variance) as avg_variance,
          COUNT(*) as sample_size
        FROM (
          SELECT 
            session_id,
            json_extract(question_answers, '$.' || ?) as answer,
            -- Simplified variance calculation
            AVG(ABS(json_extract(value, '$'))) as variance
          FROM session_embeddings, json_each(dominant_dimensions)
          WHERE json_extract(question_answers, '$.' || ?) IS NOT NULL
          GROUP BY session_id
        )
      `).bind(questionId, questionId).first();

      // Calculate outcome correlation
      const correlationResult = await this.db.prepare(`
        SELECT 
          AVG(CASE WHEN sf.session_success THEN 1.0 ELSE 0.0 END) as success_rate,
          AVG(sf.overall_satisfaction) as avg_satisfaction
        FROM session_embeddings se
        JOIN session_feedback_summary sf ON se.session_id = sf.session_id
        WHERE json_extract(se.question_answers, '$.' || ?) IS NOT NULL
      `).bind(questionId).first();

      // Update question effectiveness
      await this.db.prepare(`
        INSERT INTO question_effectiveness (
          question_id,
          domain,
          total_answers,
          embedding_variance,
          outcome_correlation,
          last_calculated
        ) VALUES (?, ?, ?, ?, ?, ?)
        ON CONFLICT(question_id) DO UPDATE SET
          total_answers = excluded.total_answers,
          embedding_variance = excluded.embedding_variance,
          outcome_correlation = excluded.outcome_correlation,
          last_calculated = excluded.last_calculated
      `).bind(
        questionId,
        domain,
        varianceResult?.sample_size || 0,
        varianceResult?.avg_variance || 0,
        correlationResult?.success_rate || 0,
        Math.floor(Date.now() / 1000)
      ).run();

    } catch (error) {
      console.error('Failed to analyze question effectiveness:', error);
    }
  }

  /**
   * Track embedding refinement
   */
  async trackEmbeddingRefinement(sessionId, originalEmbedding, refinedEmbedding, reason) {
    if (!this.enabled) return;

    try {
      // Calculate drift vector
      const driftVector = originalEmbedding.map((val, idx) => 
        refinedEmbedding[idx] - val
      );

      // Calculate drift magnitude
      const driftMagnitude = Math.sqrt(
        driftVector.reduce((sum, val) => sum + val * val, 0)
      );

      // Find dimensions with largest changes
      const driftDimensions = driftVector
        .map((val, idx) => ({ dimension: idx, change: Math.abs(val) }))
        .sort((a, b) => b.change - a.change)
        .slice(0, 10);

      const originalBuffer = new Float32Array(originalEmbedding);
      const refinedBuffer = new Float32Array(refinedEmbedding);
      const driftBuffer = new Float32Array(driftVector);

      await this.db.prepare(`
        INSERT INTO embedding_refinements (
          session_id,
          original_embedding,
          refined_embedding,
          drift_vector,
          drift_magnitude,
          drift_dimensions,
          refinement_reason,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        new Uint8Array(originalBuffer.buffer),
        new Uint8Array(refinedBuffer.buffer),
        new Uint8Array(driftBuffer.buffer),
        driftMagnitude,
        JSON.stringify(driftDimensions),
        reason,
        Math.floor(Date.now() / 1000)
      ).run();

    } catch (error) {
      console.error('Failed to track embedding refinement:', error);
    }
  }

  /**
   * Track temporal preferences
   */
  async trackTemporalPreferences(sessionId, embedding, context) {
    if (!this.enabled) return;

    try {
      const now = new Date();
      const hourOfDay = now.getHours();
      const dayOfWeek = now.getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // Get average embedding for this time period
      const avgEmbedding = await this.getAverageEmbeddingForTime(hourOfDay, dayOfWeek);
      
      let embeddingShift = null;
      if (avgEmbedding) {
        const shift = embedding.map((val, idx) => val - (avgEmbedding[idx] || 0));
        const shiftBuffer = new Float32Array(shift);
        embeddingShift = new Uint8Array(shiftBuffer.buffer);
      }

      await this.db.prepare(`
        INSERT INTO temporal_preferences (
          session_id,
          hour_of_day,
          day_of_week,
          is_weekend,
          timezone,
          embedding_shift,
          context_signals,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        hourOfDay,
        dayOfWeek,
        isWeekend,
        context.timezone || 'UTC',
        embeddingShift,
        JSON.stringify(context),
        Math.floor(Date.now() / 1000)
      ).run();

    } catch (error) {
      console.error('Failed to track temporal preferences:', error);
    }
  }

  /**
   * Update session feedback summary
   */
  async updateSessionSummary(sessionId, interactionType = null) {
    if (!this.enabled) return;

    try {
      // Get current stats
      const stats = await this.db.prepare(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN was_clicked THEN 1 ELSE 0 END) as clicked,
          SUM(CASE WHEN was_liked THEN 1 ELSE 0 END) as liked,
          SUM(CASE WHEN watch_initiated THEN 1 ELSE 0 END) as watched
        FROM recommendation_results
        WHERE session_id = ?
      `).bind(sessionId).first();

      const satisfaction = stats.liked > 0 ? 
        (stats.liked / stats.total) * 5 : null;

      const success = stats.clicked > 0 || stats.liked > 0 || stats.watched > 0;

      await this.db.prepare(`
        INSERT INTO session_feedback_summary (
          session_id,
          total_recommendations,
          clicked_count,
          liked_count,
          watch_initiated_count,
          overall_satisfaction,
          session_success,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(session_id) DO UPDATE SET
          total_recommendations = excluded.total_recommendations,
          clicked_count = excluded.clicked_count,
          liked_count = excluded.liked_count,
          watch_initiated_count = excluded.watch_initiated_count,
          overall_satisfaction = excluded.overall_satisfaction,
          session_success = excluded.session_success
      `).bind(
        sessionId,
        stats.total || 0,
        stats.clicked || 0,
        stats.liked || 0,
        stats.watched || 0,
        satisfaction,
        success,
        Math.floor(Date.now() / 1000)
      ).run();

    } catch (error) {
      console.error('Failed to update session summary:', error);
    }
  }

  /**
   * Helper: Hash embedding for similarity lookups
   */
  async hashEmbedding(embedding) {
    // Simple hash - in production would use LSH or similar
    const buckets = 32;
    const hash = new Array(buckets).fill(0);
    
    for (let i = 0; i < embedding.length; i++) {
      const bucket = i % buckets;
      hash[bucket] += embedding[i];
    }
    
    return hash.map(v => Math.sign(v)).join('');
  }

  /**
   * Helper: Assign embedding to cluster
   */
  async assignToCluster(embedding) {
    // Simplified clustering - in production would use k-means or DBSCAN
    try {
      // Get existing clusters
      const clusters = await this.db.prepare(`
        SELECT cluster_id, centroid_json
        FROM embedding_clusters
        ORDER BY session_count DESC
        LIMIT 10
      `).all();

      if (clusters.length === 0) {
        // Create first cluster
        return await this.createNewCluster(embedding);
      }

      // Find nearest cluster
      let nearestCluster = null;
      let minDistance = Infinity;

      for (const cluster of clusters) {
        const centroid = JSON.parse(cluster.centroid_json);
        const distance = this.cosineDistance(embedding, centroid);
        
        if (distance < minDistance) {
          minDistance = distance;
          nearestCluster = cluster.cluster_id;
        }
      }

      // If close enough, assign to cluster; otherwise create new
      if (minDistance < 0.3) {
        return nearestCluster;
      } else {
        return await this.createNewCluster(embedding);
      }

    } catch (error) {
      console.error('Failed to assign cluster:', error);
      return null;
    }
  }

  /**
   * Helper: Create new cluster
   */
  async createNewCluster(embedding) {
    try {
      const embeddingBuffer = new Float32Array(embedding.slice(0, 100));
      const result = await this.db.prepare(`
        INSERT INTO embedding_clusters (
          centroid_vector,
          centroid_json,
          cluster_label,
          session_count,
          last_updated
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        new Uint8Array(embeddingBuffer.buffer),
        JSON.stringify(embedding.slice(0, 100)),
        'New Cluster',
        1,
        Math.floor(Date.now() / 1000)
      ).run();

      return result.meta.last_row_id;
    } catch (error) {
      console.error('Failed to create cluster:', error);
      return null;
    }
  }

  /**
   * Helper: Calculate cosine distance
   */
  cosineDistance(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    const length = Math.min(vec1.length, vec2.length);
    
    for (let i = 0; i < length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    const similarity = dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
    return 1 - similarity; // Convert to distance
  }

  /**
   * Helper: Get average embedding for time period
   */
  async getAverageEmbeddingForTime(hour, dayOfWeek) {
    try {
      const result = await this.db.prepare(`
        SELECT embedding_json
        FROM session_embeddings se
        JOIN temporal_preferences tp ON se.session_id = tp.session_id
        WHERE tp.hour_of_day = ? AND tp.day_of_week = ?
        LIMIT 10
      `).bind(hour, dayOfWeek).all();

      if (result.length === 0) return null;

      // Average the embeddings
      const embeddings = result.map(r => JSON.parse(r.embedding_json));
      const avgEmbedding = new Array(100).fill(0);
      
      for (const emb of embeddings) {
        for (let i = 0; i < Math.min(emb.length, 100); i++) {
          avgEmbedding[i] += emb[i] / embeddings.length;
        }
      }

      return avgEmbedding;

    } catch (error) {
      console.error('Failed to get average embedding:', error);
      return null;
    }
  }
}