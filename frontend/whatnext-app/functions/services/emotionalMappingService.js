// src/services/emotionalMappingService.js
export class EmotionalMappingService {
  constructor(env) {
    this.env = env;
    
    // Emotional dimensions with vector weight mappings
    this.emotionalStates = {
      energy: {
        drained: { 
          vector_weights: { 
            slow_pace: 0.9, 
            comfort: 0.8, 
            simplicity: 0.7,
            familiar: 0.8,
            light: 0.6 
          },
          filters: {
            maxRuntime: 120,
            maxComplexity: 0.4
          }
        },
        neutral: { 
          vector_weights: { 
            balanced: 0.7,
            mainstream: 0.6,
            accessible: 0.7 
          },
          filters: {}
        },
        energized: { 
          vector_weights: { 
            action: 0.9, 
            intensity: 0.8,
            fast_pace: 0.9,
            excitement: 0.8,
            spectacle: 0.7 
          },
          filters: {
            minRating: 6.5
          }
        }
      },

      mood: {
        melancholic: { 
          vector_weights: { 
            drama: 0.8, 
            depth: 0.9,
            emotional: 0.9,
            character_driven: 0.8,
            artistic: 0.7 
          },
          filters: {
            genres: ['drama', 'romance'],
            excludeGenres: ['comedy', 'action']
          }
        },
        content: { 
          vector_weights: { 
            feel_good: 0.7, 
            light: 0.6,
            humor: 0.5,
            comfortable: 0.8 
          },
          filters: {}
        },
        adventurous: { 
          vector_weights: { 
            discovery: 0.9, 
            surprise: 0.8,
            exploration: 0.9,
            unconventional: 0.7,
            foreign: 0.6 
          },
          filters: {
            maxPopularity: 60
          }
        }
      },

      openness: {
        comfort_zone: { 
          vector_weights: { 
            familiar: 0.9, 
            mainstream: 0.8,
            popular: 0.9,
            safe: 0.8,
            predictable: 0.7 
          },
          filters: {
            minRating: 6.0,
            minVoteCount: 100
          }
        },
        exploring: { 
          vector_weights: { 
            indie: 0.7, 
            foreign: 0.6,
            artistic: 0.5,
            diverse: 0.7 
          },
          filters: {}
        },
        experimental: { 
          vector_weights: { 
            avant_garde: 0.9, 
            unusual: 0.9,
            challenging: 0.8,
            unconventional: 0.9,
            artistic: 0.8 
          },
          filters: {
            maxPopularity: 30
          }
        }
      },

      focus: {
        scattered: {
          vector_weights: {
            simple: 0.9,
            visual: 0.8,
            action: 0.7,
            familiar: 0.8
          },
          filters: {
            maxComplexity: 0.3,
            preferredGenres: ['action', 'comedy', 'animation']
          }
        },
        present: {
          vector_weights: {
            engaging: 0.8,
            balanced: 0.7,
            accessible: 0.8
          },
          filters: {}
        },
        immersed: {
          vector_weights: {
            complex: 0.9,
            intellectual: 0.8,
            deep: 0.9,
            artistic: 0.7
          },
          filters: {
            minRating: 7.0
          }
        }
      }
    };

    // Contextual modifiers based on time and environment
    this.contextualModifiers = {
      timeOfDay: {
        morning: { energy: 0.2, optimism: 0.3, light: 0.2 },
        afternoon: { balanced: 0.2, mainstream: 0.1 },
        evening: { relaxed: 0.2, escapist: 0.3, immersive: 0.2 },
        lateNight: { dark: 0.3, intense: 0.2, artistic: 0.2, weird: 0.3 }
      },
      dayOfWeek: {
        weekday: { efficient: 0.2, familiar: 0.2, comfortable: 0.3 },
        friday: { excitement: 0.3, social: 0.2, fun: 0.3 },
        weekend: { exploration: 0.3, lengthy: 0.2, immersive: 0.3 }
      },
      season: {
        winter: { cozy: 0.3, warm: 0.3, nostalgic: 0.2 },
        spring: { fresh: 0.3, romantic: 0.2, optimistic: 0.3 },
        summer: { adventure: 0.3, action: 0.3, fun: 0.3 },
        fall: { contemplative: 0.3, mysterious: 0.2, atmospheric: 0.3 }
      }
    };
  }

  /**
   * Map emotional state from answers to vector and filters
   */
  async mapMomentToVector(answers, context = {}) {
    try {
      // Extract emotional dimensions from answers
      const emotionalProfile = this.extractEmotionalProfile(answers);
      
      // Build base vector from emotional state
      const baseVector = this.buildBaseVector(emotionalProfile);
      
      // Apply contextual adjustments
      const contextualVector = this.applyContextualAdjustments(baseVector, context);
      
      // Add serendipity factor for discovery
      const finalVector = this.addSerendipityFactor(contextualVector, answers);
      
      // Build smart filters
      const filters = this.buildEmotionalFilters(emotionalProfile, context);
      
      return {
        vector: finalVector,
        filters,
        emotionalProfile,
        confidence: this.calculateConfidence(emotionalProfile)
      };
      
    } catch (error) {
      console.error('Error mapping moment to vector:', error);
      throw error;
    }
  }

  /**
   * Extract emotional profile from question answers
   */
  extractEmotionalProfile(answers) {
    const profile = {
      energy: 'neutral',
      mood: 'content',
      openness: 'exploring',
      focus: 'present'
    };

    // Map cognitive load to energy
    if (answers.cognitive_load === 'challenge') {
      profile.energy = 'energized';
      profile.focus = 'immersed';
    } else if (answers.cognitive_load === 'easy') {
      profile.energy = 'neutral';
      profile.focus = 'present';
    }

    // Map emotional tone to mood
    const moodMapping = {
      intense: 'melancholic',
      uplifting: 'content',
      contemplative: 'melancholic',
      escapist: 'adventurous'
    };
    profile.mood = moodMapping[answers.emotional_tone] || 'content';

    // Map attention level to focus
    const focusMapping = {
      full_focus: 'immersed',
      moderate: 'present',
      background: 'scattered'
    };
    profile.focus = focusMapping[answers.attention_level] || 'present';

    // Map discovery mode to openness
    if (answers.discovery_mode === 'surprise') {
      profile.openness = answers.emotional_tone === 'intense' ? 'experimental' : 'exploring';
    } else {
      profile.openness = 'comfort_zone';
    }

    // Personal context adjustments
    if (answers.personal_context === 'escaping') {
      profile.mood = 'adventurous';
      profile.openness = 'exploring';
    } else if (answers.personal_context === 'reflecting') {
      profile.mood = 'melancholic';
      profile.focus = 'immersed';
    }

    return profile;
  }

  /**
   * Build base vector from emotional profile
   */
  buildBaseVector(profile) {
    const vector = {};
    
    // Combine weights from each emotional dimension
    for (const [dimension, state] of Object.entries(profile)) {
      if (this.emotionalStates[dimension] && this.emotionalStates[dimension][state]) {
        const weights = this.emotionalStates[dimension][state].vector_weights;
        
        for (const [trait, weight] of Object.entries(weights)) {
          vector[trait] = (vector[trait] || 0) + weight;
        }
      }
    }
    
    // Normalize vector values
    const maxWeight = Math.max(...Object.values(vector));
    for (const trait in vector) {
      vector[trait] = vector[trait] / maxWeight;
    }
    
    return vector;
  }

  /**
   * Apply contextual adjustments based on time, day, season
   */
  applyContextualAdjustments(baseVector, context) {
    const adjustedVector = { ...baseVector };
    
    // Time of day adjustments
    if (context.timeOfDay) {
      const timeModifiers = this.contextualModifiers.timeOfDay[context.timeOfDay] || {};
      for (const [trait, modifier] of Object.entries(timeModifiers)) {
        adjustedVector[trait] = (adjustedVector[trait] || 0) + modifier;
      }
    }
    
    // Day of week adjustments
    if (context.dayOfWeek) {
      const dayModifiers = this.contextualModifiers.dayOfWeek[context.dayOfWeek] || {};
      for (const [trait, modifier] of Object.entries(dayModifiers)) {
        adjustedVector[trait] = (adjustedVector[trait] || 0) + modifier;
      }
    }
    
    // Seasonal adjustments
    if (context.season) {
      const seasonModifiers = this.contextualModifiers.season[context.season] || {};
      for (const [trait, modifier] of Object.entries(seasonModifiers)) {
        adjustedVector[trait] = (adjustedVector[trait] || 0) + modifier;
      }
    }
    
    return adjustedVector;
  }

  /**
   * Add controlled randomness for discovery
   */
  addSerendipityFactor(vector, answers) {
    const serendipityLevel = answers.discovery_mode === 'surprise' ? 0.15 : 0.05;
    const adjustedVector = { ...vector };
    
    // Add small random adjustments to encourage variety
    for (const trait in adjustedVector) {
      const randomFactor = (Math.random() - 0.5) * serendipityLevel;
      adjustedVector[trait] = Math.max(0, Math.min(1, adjustedVector[trait] + randomFactor));
    }
    
    // Add completely random trait occasionally
    if (Math.random() < serendipityLevel) {
      const surpriseTraits = ['quirky', 'cult_classic', 'hidden_gem', 'experimental'];
      const randomTrait = surpriseTraits[Math.floor(Math.random() * surpriseTraits.length)];
      adjustedVector[randomTrait] = 0.3 + Math.random() * 0.4;
    }
    
    return adjustedVector;
  }

  /**
   * Build filters based on emotional profile
   */
  buildEmotionalFilters(profile, context) {
    const filters = {};
    
    // Combine filters from each emotional dimension
    for (const [dimension, state] of Object.entries(profile)) {
      if (this.emotionalStates[dimension] && this.emotionalStates[dimension][state]) {
        const stateFilters = this.emotionalStates[dimension][state].filters || {};
        Object.assign(filters, stateFilters);
      }
    }
    
    // Time-based runtime filters
    if (context.timeOfDay === 'lateNight') {
      filters.maxRuntime = Math.min(filters.maxRuntime || 180, 150);
    }
    
    // Weekend allows longer movies
    if (context.dayOfWeek === 'weekend') {
      delete filters.maxRuntime;
    }
    
    return filters;
  }

  /**
   * Calculate confidence in emotional mapping
   */
  calculateConfidence(profile) {
    // Higher confidence when emotional signals are consistent
    const signals = Object.values(profile);
    const uniqueSignals = new Set(signals).size;
    
    // More unique signals = less confidence (mixed emotions)
    const consistency = 1 - (uniqueSignals - 1) / 4;
    
    return Math.round(consistency * 100);
  }

  /**
   * Get emotional state explanation for UI
   */
  getEmotionalExplanation(profile) {
    const explanations = {
      energy: {
        drained: "low energy, seeking comfort",
        neutral: "balanced energy",
        energized: "high energy, ready for intensity"
      },
      mood: {
        melancholic: "thoughtful and introspective",
        content: "positive and relaxed",
        adventurous: "seeking new experiences"
      },
      openness: {
        comfort_zone: "preferring familiar territory",
        exploring: "open to discovery",
        experimental: "craving the unconventional"
      },
      focus: {
        scattered: "light attention available",
        present: "moderately engaged",
        immersed: "ready for deep focus"
      }
    };

    const stateDescriptions = [];
    for (const [dimension, state] of Object.entries(profile)) {
      if (explanations[dimension] && explanations[dimension][state]) {
        stateDescriptions.push(explanations[dimension][state]);
      }
    }

    return `You're ${stateDescriptions.join(', ')}`;
  }
}