// src/services/preferenceToVectorConverter.js
export class PreferenceToVectorConverter {
  constructor(env) {
    this.openaiApiKey = env.OPENAI_API_KEY;
    this.embeddingModel = env.OPENAI_EMBEDDING_MODEL || 'text-embedding-3-small';
    this.vectorCache = env.PREFERENCE_VECTORS;
    this.fallbackToWeighted = !this.openaiApiKey;
  }

  /**
   * Convert question answers to a search vector
   * @param {Object} questionAnswers - Map of questionId to answer
   * @param {string} domain - Content domain (movies, tv-series, etc.)
   * @returns {Array<number>} 1536-dimensional vector
   */
  async convertToSearchVector(questionAnswers, domain = 'movies') {
    try {
      // Check cache first
      const cacheKey = this.generateCacheKey(questionAnswers, domain);
      const cachedVector = await this.getCachedVector(cacheKey);
      
      if (cachedVector) {
        console.log('Using cached preference vector');
        return cachedVector;
      }
      
      // Build preference description text
      const preferenceText = this.buildPreferenceText(questionAnswers, domain);
      console.log('Preference text:', preferenceText);
      
      // Generate new embedding or use weighted fallback
      let vector;
      if (this.fallbackToWeighted || !this.openaiApiKey) {
        console.log('Using weighted vector fallback (no OpenAI key)');
        vector = this.generateWeightedVector(questionAnswers);
      } else {
        vector = await this.getOpenAIEmbedding(preferenceText);
      }
      
      // Normalize vector
      vector = this.normalizeVector(vector);
      
      // Cache for 24 hours
      await this.cacheVector(cacheKey, vector, 86400);
      
      return vector;
      
    } catch (error) {
      console.error('Vector conversion error:', error);
      // Fallback to weighted vector combination
      return this.generateWeightedVector(questionAnswers);
    }
  }

  /**
   * Build natural language description of preferences
   */
  buildPreferenceText(answers, domain) {
    const domainPrefix = domain === 'movies' ? 'A movie' : 'A TV show';
    let description = `${domainPrefix} that is `;
    const traits = [];

    // Cognitive load interpretation
    if (answers.cognitive_load === 'challenge') {
      traits.push('intellectually challenging, complex, and thought-provoking');
      traits.push('requires deep thinking and analysis');
    } else if (answers.cognitive_load === 'easy') {
      traits.push('entertaining, fun, and easily accessible');
      traits.push('perfect for relaxed viewing without much mental effort');
    }

    // Emotional tone interpretation
    const emotionalTraits = {
      intense: 'dark, intense, gripping, and emotionally charged with high stakes and tension',
      uplifting: 'uplifting, feel-good, optimistic, heartwarming, and filled with hope',
      contemplative: 'thoughtful, reflective, philosophical, quiet, and deeply introspective',
      escapist: 'fantastical, imaginative, escapist, otherworldly, and immersive in its world-building'
    };
    if (answers.emotional_tone && emotionalTraits[answers.emotional_tone]) {
      traits.push(emotionalTraits[answers.emotional_tone]);
    }

    // Personal context interpretation
    const contextTraits = {
      exploring: 'about self-discovery, finding one\'s path, coming-of-age, and personal growth',
      building: 'about ambition, career challenges, building relationships, and achieving meaningful goals',
      reflecting: 'wise, mature, reflective about life experiences, with themes of nostalgia and understanding',
      escaping: 'pure escapism, fantasy, adventure, far removed from everyday reality and mundane concerns'
    };
    if (answers.personal_context && contextTraits[answers.personal_context]) {
      traits.push(contextTraits[answers.personal_context]);
    }

    // Attention level interpretation
    if (answers.attention_level === 'full_focus') {
      traits.push('complex narrative requiring complete attention, possibly with subtitles or dense plot');
      traits.push('rewards careful viewing with rich details and layered storytelling');
    } else if (answers.attention_level === 'moderate') {
      traits.push('engaging but not overly demanding, with clear narrative and accessible themes');
    } else if (answers.attention_level === 'background') {
      traits.push('comfortable, familiar, and easy to follow even with divided attention');
    }

    // Discovery mode interpretation
    if (answers.discovery_mode === 'surprise') {
      traits.push('surprising, unconventional, unexpected, possibly foreign or indie');
      traits.push('hidden gem quality with unique perspective or unusual approach');
    } else if (answers.discovery_mode === 'reliable') {
      traits.push('reliable, well-regarded, popular, and critically acclaimed');
      traits.push('guaranteed satisfaction with proven track record');
    }

    // Additional context based on combinations
    if (answers.cognitive_load === 'challenge' && answers.emotional_tone === 'intense') {
      traits.push('psychological thriller elements or mind-bending narrative');
    }
    
    if (answers.personal_context === 'escaping' && answers.emotional_tone === 'escapist') {
      traits.push('epic scale with rich fantasy or sci-fi elements');
    }

    return description + traits.join(', ') + '.';
  }

  /**
   * Get embedding from OpenAI API
   */
  async getOpenAIEmbedding(text) {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.openaiApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: this.embeddingModel,
        input: text
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid OpenAI embedding response');
    }
    
    return data.data[0].embedding;
  }

  /**
   * Generate weighted vector without API (fallback method)
   */
  generateWeightedVector(answers) {
    // Create a 1536-dimensional vector
    const vector = new Array(1536).fill(0);
    
    // Define dimension ranges for different aspects
    const dimensionMappings = {
      cognitive_load: { start: 0, end: 200 },
      emotional_tone: { start: 200, end: 500 },
      personal_context: { start: 500, end: 800 },
      attention_level: { start: 800, end: 1000 },
      discovery_mode: { start: 1000, end: 1200 }
    };

    // Weight values for different answers
    const weights = {
      cognitive_load: {
        challenge: { values: [0.9, 0.8, 0.7, 0.9, 0.6], spread: 0.1 },
        easy: { values: [0.2, 0.3, 0.1, 0.2, 0.4], spread: 0.1 }
      },
      emotional_tone: {
        intense: { values: [0.9, 0.8, 0.9, 0.7, 0.8], spread: 0.15 },
        uplifting: { values: [0.2, 0.9, 0.3, 0.8, 0.7], spread: 0.1 },
        contemplative: { values: [0.7, 0.5, 0.9, 0.8, 0.6], spread: 0.12 },
        escapist: { values: [0.4, 0.6, 0.3, 0.9, 0.8], spread: 0.15 }
      },
      personal_context: {
        exploring: { values: [0.7, 0.8, 0.9, 0.6, 0.7], spread: 0.1 },
        building: { values: [0.6, 0.7, 0.5, 0.8, 0.7], spread: 0.1 },
        reflecting: { values: [0.8, 0.6, 0.7, 0.9, 0.5], spread: 0.12 },
        escaping: { values: [0.3, 0.4, 0.2, 0.9, 0.8], spread: 0.15 }
      },
      attention_level: {
        full_focus: { values: [0.9, 0.8, 0.9, 0.7, 0.8], spread: 0.1 },
        moderate: { values: [0.5, 0.6, 0.5, 0.5, 0.6], spread: 0.08 },
        background: { values: [0.2, 0.3, 0.2, 0.3, 0.2], spread: 0.05 }
      },
      discovery_mode: {
        surprise: { values: [0.3, 0.7, 0.8, 0.9, 0.6], spread: 0.15 },
        reliable: { values: [0.8, 0.6, 0.5, 0.3, 0.7], spread: 0.1 }
      }
    };

    // Apply weights to vector dimensions
    for (const [questionId, answer] of Object.entries(answers)) {
      if (!dimensionMappings[questionId] || !weights[questionId] || !weights[questionId][answer]) {
        continue;
      }

      const { start, end } = dimensionMappings[questionId];
      const weightConfig = weights[questionId][answer];
      const rangeSize = end - start;
      
      // Apply weights with some randomization for variety
      for (let i = start; i < end; i++) {
        const baseIndex = Math.floor((i - start) / (rangeSize / weightConfig.values.length));
        const baseWeight = weightConfig.values[baseIndex % weightConfig.values.length];
        
        // Add some controlled randomness
        const randomFactor = (Math.random() - 0.5) * weightConfig.spread;
        vector[i] = Math.max(0, Math.min(1, baseWeight + randomFactor));
      }
    }

    // Add some cross-correlation between related dimensions
    this.applyCrossCorrelation(vector, answers);
    
    return vector;
  }

  /**
   * Apply cross-correlation between related preference dimensions
   */
  applyCrossCorrelation(vector, answers) {
    // If user wants challenge + intense, boost certain dimensions
    if (answers.cognitive_load === 'challenge' && answers.emotional_tone === 'intense') {
      for (let i = 1200; i < 1300; i++) {
        vector[i] = Math.min(1, vector[i] + 0.2);
      }
    }
    
    // If user wants easy + uplifting, boost comfort dimensions
    if (answers.cognitive_load === 'easy' && answers.emotional_tone === 'uplifting') {
      for (let i = 1300; i < 1400; i++) {
        vector[i] = Math.min(1, vector[i] + 0.15);
      }
    }
    
    // If exploring + surprise mode, boost discovery dimensions
    if (answers.personal_context === 'exploring' && answers.discovery_mode === 'surprise') {
      for (let i = 1400; i < 1500; i++) {
        vector[i] = Math.min(1, vector[i] + 0.18);
      }
    }
  }

  /**
   * Normalize vector to unit length
   */
  normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    
    if (magnitude === 0) {
      // Return a small random vector if magnitude is 0
      return vector.map(() => Math.random() * 0.01);
    }
    
    return vector.map(val => val / magnitude);
  }

  /**
   * Generate cache key for preference vector
   */
  generateCacheKey(answers, domain) {
    const sortedAnswers = Object.keys(answers)
      .sort()
      .map(key => `${key}:${answers[key]}`)
      .join('|');
    return `pref_vector:${domain}:${sortedAnswers}`;
  }

  /**
   * Get cached vector
   */
  async getCachedVector(cacheKey) {
    if (!this.vectorCache) return null;
    
    try {
      const cached = await this.vectorCache.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to retrieve cached vector:', error);
    }
    
    return null;
  }

  /**
   * Cache vector
   */
  async cacheVector(cacheKey, vector, ttl = 86400) {
    if (!this.vectorCache) return;
    
    try {
      await this.vectorCache.put(
        cacheKey,
        JSON.stringify(vector),
        { expirationTtl: ttl }
      );
    } catch (error) {
      console.error('Failed to cache vector:', error);
    }
  }

  /**
   * Combine multiple vectors with weights
   */
  combineVectors(vectors, weights = null) {
    if (!vectors || vectors.length === 0) {
      return new Array(1536).fill(0);
    }
    
    const effectiveWeights = weights || new Array(vectors.length).fill(1 / vectors.length);
    const combined = new Array(1536).fill(0);
    
    for (let i = 0; i < vectors.length; i++) {
      const vector = vectors[i];
      const weight = effectiveWeights[i];
      
      for (let j = 0; j < vector.length; j++) {
        combined[j] += vector[j] * weight;
      }
    }
    
    return this.normalizeVector(combined);
  }

  /**
   * Calculate similarity between two vectors
   */
  calculateSimilarity(vector1, vector2) {
    if (vector1.length !== vector2.length) {
      throw new Error('Vectors must have the same dimension');
    }
    
    let dotProduct = 0;
    for (let i = 0; i < vector1.length; i++) {
      dotProduct += vector1[i] * vector2[i];
    }
    
    return dotProduct; // Assuming normalized vectors
  }
}