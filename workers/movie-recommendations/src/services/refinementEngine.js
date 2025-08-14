// src/services/refinementEngine.js
export class RefinementEngine {
  constructor(env) {
    this.env = env;
    this.session = null;
    this.interactions = [];
    this.vectorDrift = null;
    
    // Refinement strategies based on user feedback patterns
    this.refinementStrategies = {
      tooIntense: {
        trigger: ['dark', 'heavy', 'disturbing', 'violent'],
        signals: ['dislike', 'too_much', 'overwhelming'],
        action: 'Shift toward lighter content',
        vectorAdjustment: {
          darkness: -0.4,
          intensity: -0.3,
          comfort: +0.4,
          light: +0.3,
          humor: +0.2
        },
        filterAdjustment: {
          excludeGenres: ['horror', 'thriller'],
          maxRating: 'PG-13'
        }
      },
      
      notIntenseEnough: {
        trigger: ['boring', 'predictable', 'too_safe'],
        signals: ['want_more', 'too_light'],
        action: 'Add more edge and intensity',
        vectorAdjustment: {
          intensity: +0.4,
          darkness: +0.2,
          complexity: +0.3,
          mainstream: -0.3
        },
        filterAdjustment: {
          minRating: 7.0,
          includeGenres: ['thriller', 'psychological']
        }
      },
      
      wrongEnergy: {
        trigger: ['energy_mismatch', 'pace_wrong'],
        signals: ['too_slow', 'too_fast', 'wrong_vibe'],
        action: 'Recalibrate pacing and energy',
        vectorAdjustment: {
          pace: 'invert',
          energy: 'moderate',
          intensity: 'balance'
        },
        filterAdjustment: {
          runtime: 'adjust'
        }
      },
      
      genreMismatch: {
        trigger: ['wrong_genre', 'not_my_type'],
        signals: ['hate_genre', 'avoid_type'],
        action: 'Exclude problematic genres',
        vectorAdjustment: {
          genre_weights: 'recalculate'
        },
        filterAdjustment: {
          excludeGenres: 'detected_dislikes'
        }
      },
      
      hiddenDesire: {
        trigger: ['love_this', 'more_like_this'],
        signals: ['perfect', 'exactly', 'love'],
        action: 'Pivot to discovered preference',
        vectorAdjustment: {
          primary_dimension: 'shift_to_liked',
          amplify: 'liked_traits'
        },
        filterAdjustment: {
          similarTo: 'liked_movies'
        }
      },
      
      needVariety: {
        trigger: ['too_similar', 'same_thing'],
        signals: ['variety', 'different', 'mix'],
        action: 'Increase diversity',
        vectorAdjustment: {
          diversity: +0.5,
          surprise: +0.3
        },
        filterAdjustment: {
          diversifyGenres: true,
          varyDecades: true
        }
      }
    };

    // Quick adjustment presets
    this.quickAdjustments = {
      lighter: {
        label: 'Lighter',
        icon: '☀️',
        description: 'More upbeat and positive',
        vector: {
          intensity: -0.3,
          darkness: -0.4,
          light: +0.4,
          humor: +0.3,
          feel_good: +0.3
        }
      },
      deeper: {
        label: 'Deeper',
        icon: '🌊',
        description: 'More profound and meaningful',
        vector: {
          depth: +0.4,
          complexity: +0.3,
          intellectual: +0.3,
          artistic: +0.2
        }
      },
      weirder: {
        label: 'Weirder',
        icon: '🎭',
        description: 'More unusual and unexpected',
        vector: {
          unusual: +0.5,
          experimental: +0.4,
          unconventional: +0.4,
          surprise: +0.3
        }
      },
      safer: {
        label: 'Safer',
        icon: '🏠',
        description: 'More familiar and comfortable',
        vector: {
          mainstream: +0.4,
          familiar: +0.4,
          comfort: +0.3,
          predictable: +0.2
        }
      },
      shorter: {
        label: 'Shorter',
        icon: '⏱️',
        description: 'Quicker watches',
        filters: {
          maxRuntime: 100
        }
      },
      longer: {
        label: 'Epic',
        icon: '🎬',
        description: 'Epic length films',
        filters: {
          minRuntime: 150
        }
      }
    };
  }

  /**
   * Initialize refinement session
   */
  initSession(sessionId, initialRecommendations) {
    this.session = {
      id: sessionId,
      initialRecommendations,
      currentRecommendations: initialRecommendations,
      interactions: [],
      refinementCount: 0,
      vectorHistory: [],
      timestamp: Date.now()
    };
  }

  /**
   * Process user feedback and refine recommendations
   */
  async refineRecommendations(feedback, action = 'auto') {
    try {
      // Analyze feedback patterns
      const pattern = this.detectPattern(feedback);
      
      // Select refinement strategy
      const strategy = action === 'auto' 
        ? this.selectStrategy(pattern)
        : this.getStrategyForAction(action);
      
      // Calculate vector adjustments
      const vectorAdjustment = await this.calculateVectorAdjustment(
        feedback,
        strategy,
        pattern
      );
      
      // Apply adjustments and get new recommendations
      const refinedResults = await this.applyRefinement(
        vectorAdjustment,
        strategy
      );
      
      // Track refinement for learning
      this.trackRefinement(feedback, strategy, refinedResults);
      
      return {
        recommendations: refinedResults,
        strategy: strategy.action,
        confidence: this.calculateRefinementConfidence(pattern),
        adjustments: this.explainAdjustments(strategy)
      };
      
    } catch (error) {
      console.error('Refinement failed:', error);
      throw error;
    }
  }

  /**
   * Detect patterns in user feedback
   */
  detectPattern(feedback) {
    const pattern = {
      likes: [],
      dislikes: [],
      themes: [],
      genres: {},
      emotions: {},
      intensity: 0,
      consistency: 0
    };

    for (const item of feedback) {
      if (item.reaction === 'like' || item.reaction === 'love') {
        pattern.likes.push(item);
        this.analyzeMovie(item, pattern, 1);
      } else if (item.reaction === 'dislike' || item.reaction === 'hate') {
        pattern.dislikes.push(item);
        this.analyzeMovie(item, pattern, -1);
      }
    }

    // Identify common themes
    pattern.themes = this.identifyThemes(pattern);
    
    // Calculate pattern consistency
    pattern.consistency = this.calculateConsistency(pattern);
    
    // Determine intensity of preferences
    pattern.intensity = this.calculateIntensity(feedback);

    return pattern;
  }

  /**
   * Analyze individual movie feedback
   */
  analyzeMovie(item, pattern, weight) {
    // Track genre preferences
    if (item.genres) {
      for (const genre of item.genres) {
        pattern.genres[genre] = (pattern.genres[genre] || 0) + weight;
      }
    }

    // Track emotional responses
    if (item.emotionalTone) {
      pattern.emotions[item.emotionalTone] = 
        (pattern.emotions[item.emotionalTone] || 0) + weight;
    }

    // Track specific feedback tags
    if (item.tags) {
      for (const tag of item.tags) {
        if (!pattern.themes.includes(tag)) {
          pattern.themes.push(tag);
        }
      }
    }
  }

  /**
   * Identify themes from pattern
   */
  identifyThemes(pattern) {
    const themes = [];

    // Check for intensity mismatch
    if (pattern.dislikes.length > 0 && 
        pattern.dislikes.every(d => d.tags?.includes('intense'))) {
      themes.push('too_intense');
    }

    // Check for genre preference
    const topGenre = Object.entries(pattern.genres)
      .sort((a, b) => b[1] - a[1])[0];
    
    if (topGenre && Math.abs(topGenre[1]) > 2) {
      themes.push(topGenre[1] > 0 ? `loves_${topGenre[0]}` : `hates_${topGenre[0]}`);
    }

    // Check for variety need
    if (pattern.likes.length > 0 && 
        new Set(pattern.likes.map(l => l.genre)).size === 1) {
      themes.push('needs_variety');
    }

    return themes;
  }

  /**
   * Select appropriate refinement strategy
   */
  selectStrategy(pattern) {
    // Check each strategy's triggers
    for (const [key, strategy] of Object.entries(this.refinementStrategies)) {
      if (this.matchesTrigger(pattern, strategy)) {
        return strategy;
      }
    }

    // Default strategy based on likes/dislikes ratio
    if (pattern.likes.length > pattern.dislikes.length) {
      return this.refinementStrategies.hiddenDesire;
    } else if (pattern.dislikes.length > pattern.likes.length) {
      return this.refinementStrategies.genreMismatch;
    }

    return this.refinementStrategies.needVariety;
  }

  /**
   * Check if pattern matches strategy trigger
   */
  matchesTrigger(pattern, strategy) {
    // Check themes
    for (const trigger of strategy.trigger) {
      if (pattern.themes.includes(trigger)) {
        return true;
      }
    }

    // Check specific signals in feedback
    if (pattern.likes.concat(pattern.dislikes).some(item => 
      item.feedback && strategy.signals.some(signal => 
        item.feedback.toLowerCase().includes(signal)
      )
    )) {
      return true;
    }

    return false;
  }

  /**
   * Calculate vector adjustment based on strategy
   */
  async calculateVectorAdjustment(feedback, strategy, pattern) {
    const baseAdjustment = { ...strategy.vectorAdjustment };

    // Fine-tune based on specific feedback
    if (pattern.likes.length > 0) {
      // Amplify traits from liked movies
      const likedTraits = await this.extractTraitsFromMovies(pattern.likes);
      for (const [trait, weight] of Object.entries(likedTraits)) {
        baseAdjustment[trait] = (baseAdjustment[trait] || 0) + weight * 0.2;
      }
    }

    if (pattern.dislikes.length > 0) {
      // Reduce traits from disliked movies
      const dislikedTraits = await this.extractTraitsFromMovies(pattern.dislikes);
      for (const [trait, weight] of Object.entries(dislikedTraits)) {
        baseAdjustment[trait] = (baseAdjustment[trait] || 0) - weight * 0.2;
      }
    }

    // Apply intensity scaling
    const intensityScale = Math.min(pattern.intensity / 5, 1.5);
    for (const trait in baseAdjustment) {
      if (typeof baseAdjustment[trait] === 'number') {
        baseAdjustment[trait] *= intensityScale;
      }
    }

    return baseAdjustment;
  }

  /**
   * Extract vector traits from movies
   */
  async extractTraitsFromMovies(movies) {
    const traits = {};
    
    for (const movie of movies) {
      // Map movie characteristics to vector traits
      if (movie.genres?.includes('action')) {
        traits.action = (traits.action || 0) + 1;
        traits.intensity = (traits.intensity || 0) + 0.5;
      }
      if (movie.genres?.includes('drama')) {
        traits.emotional = (traits.emotional || 0) + 1;
        traits.depth = (traits.depth || 0) + 0.5;
      }
      if (movie.rating > 8) {
        traits.quality = (traits.quality || 0) + 1;
      }
      if (movie.year < 2000) {
        traits.classic = (traits.classic || 0) + 1;
      }
      // Add more trait mappings...
    }

    // Normalize traits
    const maxTrait = Math.max(...Object.values(traits));
    for (const trait in traits) {
      traits[trait] = traits[trait] / maxTrait;
    }

    return traits;
  }

  /**
   * Apply refinement to get new recommendations
   */
  async applyRefinement(vectorAdjustment, strategy) {
    // This would integrate with your vector search service
    // For now, returning a placeholder
    return {
      applied: true,
      vectorAdjustment,
      strategy: strategy.action,
      newRecommendations: []
    };
  }

  /**
   * Quick adjustment helper
   */
  async quickAdjust(adjustmentType) {
    const adjustment = this.quickAdjustments[adjustmentType];
    if (!adjustment) {
      throw new Error(`Unknown adjustment type: ${adjustmentType}`);
    }

    return {
      vector: adjustment.vector || {},
      filters: adjustment.filters || {},
      description: adjustment.description
    };
  }

  /**
   * Track refinement for analytics
   */
  trackRefinement(feedback, strategy, results) {
    if (!this.session) return;

    const refinement = {
      timestamp: Date.now(),
      feedback,
      strategy: strategy.action,
      results: results.length,
      refinementNumber: ++this.session.refinementCount
    };

    this.session.interactions.push(refinement);

    // Store in analytics if enabled
    if (this.env.ENABLE_ANALYTICS) {
      this.storeRefinementAnalytics(refinement);
    }
  }

  /**
   * Calculate refinement confidence
   */
  calculateRefinementConfidence(pattern) {
    let confidence = 50; // Base confidence

    // Higher confidence with more consistent feedback
    confidence += pattern.consistency * 20;

    // Higher confidence with clear likes/dislikes
    if (pattern.likes.length > 3 || pattern.dislikes.length > 3) {
      confidence += 15;
    }

    // Lower confidence if mixed signals
    if (pattern.themes.includes('mixed_signals')) {
      confidence -= 20;
    }

    return Math.min(Math.max(confidence, 0), 100);
  }

  /**
   * Calculate pattern consistency
   */
  calculateConsistency(pattern) {
    if (pattern.likes.length === 0 && pattern.dislikes.length === 0) {
      return 0;
    }

    // Check genre consistency
    const genreValues = Object.values(pattern.genres);
    const allPositive = genreValues.every(v => v > 0);
    const allNegative = genreValues.every(v => v < 0);
    
    if (allPositive || allNegative) {
      return 1;
    }

    // Check if preferences are mixed
    const positiveCount = genreValues.filter(v => v > 0).length;
    const negativeCount = genreValues.filter(v => v < 0).length;
    
    return 1 - Math.abs(positiveCount - negativeCount) / genreValues.length;
  }

  /**
   * Calculate feedback intensity
   */
  calculateIntensity(feedback) {
    const intensityMap = {
      love: 5,
      like: 3,
      neutral: 1,
      dislike: 3,
      hate: 5
    };

    const totalIntensity = feedback.reduce((sum, item) => 
      sum + (intensityMap[item.reaction] || 1), 0
    );

    return totalIntensity / feedback.length;
  }

  /**
   * Explain adjustments in user-friendly terms
   */
  explainAdjustments(strategy) {
    const explanations = {
      tooIntense: "Making things lighter and more comfortable",
      notIntenseEnough: "Adding more edge and excitement",
      wrongEnergy: "Adjusting the pace to match your mood",
      genreMismatch: "Avoiding genres that don't resonate",
      hiddenDesire: "Finding more of what you loved",
      needVariety: "Adding more diversity to your recommendations"
    };

    return explanations[Object.keys(this.refinementStrategies).find(
      key => this.refinementStrategies[key] === strategy
    )] || strategy.action;
  }

  /**
   * Get strategy for specific action
   */
  getStrategyForAction(action) {
    const actionMap = {
      'more_like_this': this.refinementStrategies.hiddenDesire,
      'try_different': this.refinementStrategies.needVariety,
      'too_intense': this.refinementStrategies.tooIntense,
      'too_light': this.refinementStrategies.notIntenseEnough
    };

    return actionMap[action] || this.refinementStrategies.needVariety;
  }

  /**
   * Store refinement analytics
   */
  async storeRefinementAnalytics(refinement) {
    try {
      await this.env.DB.prepare(`
        INSERT INTO refinement_analytics (
          session_id,
          refinement_number,
          strategy,
          feedback_count,
          confidence,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        this.session.id,
        refinement.refinementNumber,
        refinement.strategy,
        refinement.feedback.length,
        refinement.confidence || 0,
        Math.floor(Date.now() / 1000)
      ).run();
    } catch (error) {
      console.error('Failed to store refinement analytics:', error);
    }
  }
}