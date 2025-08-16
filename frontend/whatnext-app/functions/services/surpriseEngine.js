// src/services/surpriseEngine.js
export class SurpriseEngine {
  constructor(env) {
    this.env = env;
    
    // Surprise configuration
    this.surpriseFactors = {
      controlled_chaos: 0.1,      // 10% random factor in base recommendations
      adjacent_discovery: 0.15,    // 15% similar but different genre
      wildcard: 0.05,             // 5% complete surprise
      hidden_gem: 0.2,            // 20% chance to include lesser-known films
      time_capsule: 0.1,          // 10% chance for older classics
      foreign_surprise: 0.15,     // 15% chance for foreign films
      genre_bending: 0.1          // 10% chance for genre-mixing films
    };

    // Surprise categories for different moods
    this.surpriseCategories = {
      safe_surprises: [
        'acclaimed_underseen',     // High-rated but less popular
        'festival_darlings',        // Film festival winners
        'critics_choice',          // Critical favorites
        'award_nominees'           // Oscar/award nominees that didn't win
      ],
      adventurous_surprises: [
        'cult_classics',           // Cult following films
        'foreign_gems',            // International cinema
        'indie_breakouts',         // Independent successes
        'genre_defying',           // Films that mix genres
        'experimental',            // Avant-garde cinema
        'midnight_movies'          // Weird late-night films
      ],
      nostalgic_surprises: [
        'forgotten_classics',      // Old films worth rediscovering
        'childhood_revisited',     // Family films from the past
        'decade_best',            // Best of specific decades
        'remakes_originals'       // Original versions of remade films
      ],
      mood_shifters: [
        'unexpected_comedy',       // Comedy in serious genres
        'hidden_depth',           // Seemingly simple films with depth
        'genre_subversion',       // Films that subvert expectations
        'tonal_shifts'            // Films with surprising tone changes
      ]
    };

    // Wildcard pools based on time and context
    this.wildcardPools = {
      lateNight: [
        { genre: 'noir', weight: 0.3 },
        { genre: 'psychological', weight: 0.3 },
        { genre: 'surreal', weight: 0.2 },
        { genre: 'midnight', weight: 0.2 }
      ],
      weekend: [
        { genre: 'adventure', weight: 0.3 },
        { genre: 'epic', weight: 0.2 },
        { genre: 'ensemble', weight: 0.2 },
        { genre: 'feelgood', weight: 0.3 }
      ],
      weekday: [
        { genre: 'efficient', weight: 0.4 },
        { genre: 'satisfying', weight: 0.3 },
        { genre: 'familiar', weight: 0.3 }
      ]
    };
  }

  /**
   * Inject surprise elements into recommendations
   */
  async injectSurprise(baseRecommendations, userProfile, context = {}) {
    try {
      const surpriseStrategy = this.determineSurpriseStrategy(userProfile, context);
      const surpriseCount = this.calculateSurpriseCount(baseRecommendations.length, userProfile);
      
      // Split recommendations into expected and surprise
      const expectedCount = baseRecommendations.length - surpriseCount;
      const expected = baseRecommendations.slice(0, expectedCount);
      
      // Generate surprise recommendations
      const surprises = await this.generateSurprises(
        surpriseCount,
        userProfile,
        context,
        surpriseStrategy,
        expected
      );
      
      // Mix surprises strategically
      const mixed = this.strategicMix(expected, surprises, userProfile);
      
      // Add surprise explanations
      return this.addSurpriseMetadata(mixed, surprises);
      
    } catch (error) {
      console.error('Surprise injection failed:', error);
      // Fallback to base recommendations
      return baseRecommendations;
    }
  }

  /**
   * Determine surprise strategy based on user profile
   */
  determineSurpriseStrategy(userProfile, context) {
    // High openness = more adventurous surprises
    if (userProfile.emotionalProfile?.openness === 'experimental') {
      return 'adventurous';
    }
    
    // Low energy = safe surprises
    if (userProfile.emotionalProfile?.energy === 'drained') {
      return 'safe';
    }
    
    // Late night = mood shifters or weird stuff
    if (context.timeOfDay === 'lateNight') {
      return Math.random() > 0.5 ? 'mood_shifter' : 'adventurous';
    }
    
    // Weekend = more room for adventure
    if (context.dayOfWeek === 'weekend') {
      return 'adventurous';
    }
    
    // Default to safe surprises
    return 'safe';
  }

  /**
   * Calculate how many surprises to include
   */
  calculateSurpriseCount(totalRecs, userProfile) {
    const baseCount = 2; // Always include at least 2 surprises in 8-10 recommendations
    
    // Add more if user selected "surprise me"
    if (userProfile.answers?.discovery_mode === 'surprise') {
      return Math.min(4, Math.floor(totalRecs * 0.4)); // Up to 40% surprises
    }
    
    // Add one more if user is adventurous
    if (userProfile.emotionalProfile?.openness === 'exploring') {
      return baseCount + 1;
    }
    
    return baseCount;
  }

  /**
   * Generate surprise recommendations
   */
  async generateSurprises(count, userProfile, context, strategy, avoidList) {
    const surprises = [];
    const avoidIds = new Set(avoidList.map(m => m.movieId));
    
    // Generate different types of surprises
    for (let i = 0; i < count; i++) {
      const surpriseType = this.selectSurpriseType(i, strategy);
      const surprise = await this.generateSingleSurprise(
        surpriseType,
        userProfile,
        context,
        avoidIds
      );
      
      if (surprise) {
        surprises.push(surprise);
        avoidIds.add(surprise.movieId);
      }
    }
    
    return surprises;
  }

  /**
   * Select surprise type based on position and strategy
   */
  selectSurpriseType(position, strategy) {
    if (position === 0) {
      // First surprise should be safer
      return strategy === 'adventurous' ? 'adjacent_discovery' : 'hidden_gem';
    } else if (position === 1) {
      // Second can be more adventurous
      return strategy === 'adventurous' ? 'wildcard' : 'adjacent_discovery';
    } else {
      // Additional surprises vary
      const types = ['hidden_gem', 'time_capsule', 'foreign_surprise', 'genre_bending'];
      return types[Math.floor(Math.random() * types.length)];
    }
  }

  /**
   * Generate a single surprise recommendation
   */
  async generateSingleSurprise(type, userProfile, context, avoidIds) {
    switch (type) {
      case 'hidden_gem':
        return this.findHiddenGem(userProfile, avoidIds);
        
      case 'adjacent_discovery':
        return this.findAdjacentDiscovery(userProfile, avoidIds);
        
      case 'wildcard':
        return this.findWildcard(context, avoidIds);
        
      case 'time_capsule':
        return this.findTimeCapsule(userProfile, avoidIds);
        
      case 'foreign_surprise':
        return this.findForeignSurprise(userProfile, avoidIds);
        
      case 'genre_bending':
        return this.findGenreBender(userProfile, avoidIds);
        
      default:
        return this.findHiddenGem(userProfile, avoidIds);
    }
  }

  /**
   * Find a hidden gem (good but not popular)
   */
  async findHiddenGem(userProfile, avoidIds) {
    // This would query the vector database with specific filters
    const filters = {
      minRating: 7.0,
      maxPopularity: 30,  // Low popularity score
      minVoteCount: 50,    // Enough votes to be reliable
      excludeIds: Array.from(avoidIds)
    };
    
    // Simulate finding a hidden gem
    return {
      movieId: `hidden_${Date.now()}`,
      title: 'Hidden Gem Movie',
      surpriseType: 'hidden_gem',
      surpriseReason: 'A critically acclaimed film you might have missed',
      confidence: 75,
      filters
    };
  }

  /**
   * Find adjacent discovery (similar genre, different approach)
   */
  async findAdjacentDiscovery(userProfile, avoidIds) {
    // Get user's preferred genres and find adjacent ones
    const preferredGenres = this.extractPreferredGenres(userProfile);
    const adjacentGenres = this.getAdjacentGenres(preferredGenres);
    
    const filters = {
      genres: adjacentGenres,
      minRating: 6.5,
      excludeIds: Array.from(avoidIds)
    };
    
    return {
      movieId: `adjacent_${Date.now()}`,
      title: 'Adjacent Discovery',
      surpriseType: 'adjacent_discovery',
      surpriseReason: 'Similar to what you like, but with a twist',
      confidence: 80,
      filters
    };
  }

  /**
   * Find a complete wildcard
   */
  async findWildcard(context, avoidIds) {
    const pool = this.wildcardPools[context.timeOfDay] || this.wildcardPools.weekday;
    const selected = this.weightedRandom(pool);
    
    const filters = {
      genre: selected.genre,
      randomSort: true,  // Completely random selection
      limit: 1,
      excludeIds: Array.from(avoidIds)
    };
    
    return {
      movieId: `wildcard_${Date.now()}`,
      title: 'Wildcard Pick',
      surpriseType: 'wildcard',
      surpriseReason: 'Because sometimes magic happens',
      confidence: 50,
      filters
    };
  }

  /**
   * Find a time capsule (older classic)
   */
  async findTimeCapsule(userProfile, avoidIds) {
    const decade = this.selectNostalgicDecade(userProfile);
    
    const filters = {
      releaseYearRange: [decade, decade + 9],
      minRating: 7.5,
      classic: true,
      excludeIds: Array.from(avoidIds)
    };
    
    return {
      movieId: `timecapsule_${Date.now()}`,
      title: `${decade}s Classic`,
      surpriseType: 'time_capsule',
      surpriseReason: `A timeless classic from the ${decade}s`,
      confidence: 70,
      filters
    };
  }

  /**
   * Find a foreign surprise
   */
  async findForeignSurprise(userProfile, avoidIds) {
    const regions = ['korean', 'japanese', 'french', 'spanish', 'scandinavian'];
    const selected = regions[Math.floor(Math.random() * regions.length)];
    
    const filters = {
      language: selected,
      minRating: 7.0,
      subtitled: true,
      excludeIds: Array.from(avoidIds)
    };
    
    return {
      movieId: `foreign_${Date.now()}`,
      title: 'International Cinema',
      surpriseType: 'foreign_surprise',
      surpriseReason: `Acclaimed ${selected} cinema`,
      confidence: 65,
      filters
    };
  }

  /**
   * Find a genre-bending film
   */
  async findGenreBender(userProfile, avoidIds) {
    const combinations = [
      ['comedy', 'horror'],
      ['romance', 'scifi'],
      ['western', 'scifi'],
      ['musical', 'horror'],
      ['documentary', 'comedy']
    ];
    
    const selected = combinations[Math.floor(Math.random() * combinations.length)];
    
    const filters = {
      genres: selected,
      genreMode: 'all',  // Must have all genres
      minRating: 6.5,
      excludeIds: Array.from(avoidIds)
    };
    
    return {
      movieId: `genrebend_${Date.now()}`,
      title: 'Genre Bender',
      surpriseType: 'genre_bending',
      surpriseReason: `A unique blend of ${selected.join(' and ')}`,
      confidence: 60,
      filters
    };
  }

  /**
   * Strategically mix expected and surprise recommendations
   */
  strategicMix(expected, surprises, userProfile) {
    const mixed = [];
    let surpriseIndex = 0;
    
    // Position surprises strategically
    for (let i = 0; i < expected.length + surprises.length; i++) {
      if (i === 2 || i === 5 || i === 7) {
        // Place surprises at positions 3, 6, and 8 (1-indexed)
        if (surpriseIndex < surprises.length) {
          mixed.push(surprises[surpriseIndex++]);
        } else {
          mixed.push(expected.shift());
        }
      } else {
        if (expected.length > 0) {
          mixed.push(expected.shift());
        } else if (surpriseIndex < surprises.length) {
          mixed.push(surprises[surpriseIndex++]);
        }
      }
    }
    
    return mixed;
  }

  /**
   * Add metadata explaining surprises
   */
  addSurpriseMetadata(recommendations, surprises) {
    const surpriseIds = new Set(surprises.map(s => s.movieId));
    
    return recommendations.map(rec => {
      if (surpriseIds.has(rec.movieId)) {
        const surprise = surprises.find(s => s.movieId === rec.movieId);
        return {
          ...rec,
          isSurprise: true,
          surpriseType: surprise.surpriseType,
          surpriseReason: surprise.surpriseReason,
          surpriseConfidence: surprise.confidence
        };
      }
      return {
        ...rec,
        isSurprise: false
      };
    });
  }

  /**
   * Extract preferred genres from user profile
   */
  extractPreferredGenres(userProfile) {
    const genreWeights = {
      intense: ['thriller', 'horror', 'crime'],
      uplifting: ['comedy', 'romance', 'family'],
      contemplative: ['drama', 'documentary', 'arthouse'],
      escapist: ['fantasy', 'scifi', 'adventure']
    };
    
    const emotionalTone = userProfile.answers?.emotional_tone;
    return genreWeights[emotionalTone] || ['drama', 'comedy'];
  }

  /**
   * Get adjacent genres for discovery
   */
  getAdjacentGenres(genres) {
    const adjacencyMap = {
      thriller: ['mystery', 'crime', 'noir'],
      comedy: ['dramedy', 'satire', 'romcom'],
      drama: ['melodrama', 'character_study', 'indie'],
      horror: ['psychological', 'supernatural', 'thriller'],
      scifi: ['cyberpunk', 'dystopian', 'space'],
      fantasy: ['magical_realism', 'mythology', 'fairytale'],
      action: ['martial_arts', 'heist', 'spy'],
      romance: ['period', 'dramedy', 'indie']
    };
    
    const adjacent = new Set();
    for (const genre of genres) {
      const related = adjacencyMap[genre] || [];
      related.forEach(g => adjacent.add(g));
    }
    
    return Array.from(adjacent);
  }

  /**
   * Select nostalgic decade based on user age estimate
   */
  selectNostalgicDecade(userProfile) {
    // Estimate based on personal context
    if (userProfile.answers?.personal_context === 'reflecting') {
      return 1980; // Older classics for reflection
    } else if (userProfile.answers?.personal_context === 'exploring') {
      return 2000; // Recent enough to be relevant
    }
    
    // Random classic decade
    const decades = [1960, 1970, 1980, 1990, 2000];
    return decades[Math.floor(Math.random() * decades.length)];
  }

  /**
   * Weighted random selection
   */
  weightedRandom(items) {
    const weights = items.map(item => item.weight);
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    let random = Math.random() * totalWeight;
    
    for (let i = 0; i < items.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return items[i];
      }
    }
    
    return items[items.length - 1];
  }

  /**
   * Explain why a surprise was chosen
   */
  explainSurprise(surprise) {
    const explanations = {
      hidden_gem: "We found this critically acclaimed film that deserves more attention",
      adjacent_discovery: "Based on your preferences, but with an interesting twist",
      wildcard: "Sometimes the best discoveries are completely unexpected",
      time_capsule: "A classic that feels surprisingly relevant today",
      foreign_surprise: "Expanding horizons with international cinema",
      genre_bending: "This unique blend might surprise and delight you"
    };
    
    return explanations[surprise.surpriseType] || surprise.surpriseReason;
  }
}