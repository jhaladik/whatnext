// src/services/momentValidationService.js
export class MomentValidationService {
  constructor(env) {
    this.env = env;
    
    // Validation response options
    this.validationOptions = {
      immediate: {
        prompt: "How did we do?",
        options: [
          { id: 'perfect', text: 'Nailed it!', emoji: '🎯', score: 5 },
          { id: 'good', text: 'Pretty good', emoji: '👍', score: 4 },
          { id: 'okay', text: 'Not quite', emoji: '🤔', score: 2 },
          { id: 'miss', text: 'Way off', emoji: '😅', score: 1 }
        ]
      },
      
      microFeedback: {
        hover: {
          enabled: true,
          showReasoning: true,
          template: "We picked this because..."
        },
        quickReact: [
          { id: 'seen', icon: '👁️', text: 'Seen it', action: 'exclude_similar' },
          { id: 'perfect', icon: '❤️', text: 'Perfect', action: 'amplify_traits' },
          { id: 'meh', icon: '😐', text: 'Meh', action: 'reduce_traits' },
          { id: 'never', icon: '❌', text: 'No way', action: 'exclude_type' }
        ],
        contextMenu: [
          'Save for later',
          'Show similar',
          'Hide similar',
          'Tell me more'
        ]
      },
      
      discovery: {
        reveal: {
          enabled: true,
          title: "Here's your moment",
          showEmotionalFingerprint: true,
          showMatchReasons: true
        },
        visualization: {
          type: 'emotional_map',
          dimensions: ['energy', 'mood', 'openness', 'focus']
        },
        sharing: {
          enabled: true,
          options: ['save_moment', 'share_link', 'export_list']
        }
      }
    };

    // Feedback collection templates
    this.feedbackTemplates = {
      firstImpression: {
        timing: 'immediate',
        questions: [
          {
            id: 'overall',
            text: 'First impression?',
            type: 'emotion',
            options: ['😍', '😊', '😐', '🤔', '😕']
          }
        ]
      },
      
      detailed: {
        timing: 'after_browsing',
        questions: [
          {
            id: 'accuracy',
            text: 'How well did we understand your mood?',
            type: 'scale',
            min: 1,
            max: 5
          },
          {
            id: 'surprise_quality',
            text: 'How were the surprise picks?',
            type: 'multiple_choice',
            options: [
              'Loved them!',
              'Interesting choices',
              'Not for me',
              'Too random'
            ]
          },
          {
            id: 'missing',
            text: 'What was missing?',
            type: 'tags',
            options: [
              'More variety',
              'Different genres',
              'Newer movies',
              'Older classics',
              'More mainstream',
              'More indie',
              'Nothing'
            ]
          }
        ]
      },
      
      refinement: {
        timing: 'after_adjustment',
        questions: [
          {
            id: 'improvement',
            text: 'Are these better?',
            type: 'comparison',
            options: [
              'Much better',
              'Slightly better',
              'About the same',
              'Actually worse'
            ]
          }
        ]
      }
    };

    // Moment success metrics
    this.successMetrics = {
      perfect_match: {
        threshold: 0.8,
        indicators: [
          'high_engagement',
          'positive_feedback',
          'saves_movies',
          'explores_details'
        ]
      },
      good_match: {
        threshold: 0.6,
        indicators: [
          'moderate_engagement',
          'mixed_feedback',
          'some_interest'
        ]
      },
      needs_refinement: {
        threshold: 0.4,
        indicators: [
          'low_engagement',
          'negative_feedback',
          'quick_exit',
          'requests_changes'
        ]
      }
    };
  }

  /**
   * Validate moment capture success
   */
  async validateMoment(sessionId, recommendations, userProfile) {
    try {
      const validation = {
        sessionId,
        timestamp: Date.now(),
        recommendations: recommendations.length,
        emotionalMatch: await this.calculateEmotionalMatch(recommendations, userProfile),
        diversityScore: this.calculateDiversity(recommendations),
        surpriseQuality: await this.evaluateSurprises(recommendations),
        overallScore: 0
      };

      // Calculate overall validation score
      validation.overallScore = this.calculateOverallScore(validation);

      // Generate validation message
      validation.message = this.generateValidationMessage(validation);

      // Store validation for learning
      await this.storeValidation(validation);

      return validation;
      
    } catch (error) {
      console.error('Moment validation failed:', error);
      return {
        success: false,
        message: 'Unable to validate moment'
      };
    }
  }

  /**
   * Calculate emotional match between recommendations and profile
   */
  async calculateEmotionalMatch(recommendations, userProfile) {
    if (!userProfile.emotionalProfile) {
      return { score: 0.5, confidence: 'low' };
    }

    let matchScore = 0;
    let matchedTraits = [];

    // Check each recommendation against emotional profile
    for (const rec of recommendations) {
      const traits = this.extractEmotionalTraits(rec);
      const profileMatch = this.compareTraits(traits, userProfile.emotionalProfile);
      
      matchScore += profileMatch.score;
      matchedTraits.push(...profileMatch.matched);
    }

    const averageMatch = matchScore / recommendations.length;
    const confidence = this.calculateConfidence(matchedTraits, recommendations.length);

    return {
      score: averageMatch,
      confidence,
      matchedTraits: [...new Set(matchedTraits)],
      explanation: this.explainEmotionalMatch(averageMatch, matchedTraits)
    };
  }

  /**
   * Extract emotional traits from recommendation
   */
  extractEmotionalTraits(recommendation) {
    const traits = {
      energy: 'neutral',
      mood: 'neutral',
      complexity: 'moderate',
      intensity: 'moderate'
    };

    // Analyze genres
    if (recommendation.genres) {
      if (recommendation.genres.includes('action') || recommendation.genres.includes('thriller')) {
        traits.energy = 'high';
        traits.intensity = 'high';
      }
      if (recommendation.genres.includes('drama')) {
        traits.mood = 'contemplative';
        traits.complexity = 'high';
      }
      if (recommendation.genres.includes('comedy')) {
        traits.mood = 'light';
        traits.energy = 'positive';
      }
    }

    // Analyze other metadata
    if (recommendation.rating > 8) {
      traits.quality = 'high';
    }
    if (recommendation.year < 2000) {
      traits.style = 'classic';
    }
    if (recommendation.isSurprise) {
      traits.discovery = 'unexpected';
    }

    return traits;
  }

  /**
   * Compare traits between recommendation and profile
   */
  compareTraits(recTraits, profileTraits) {
    let score = 0;
    const matched = [];

    for (const [key, value] of Object.entries(recTraits)) {
      if (profileTraits[key] === value) {
        score += 1;
        matched.push(key);
      } else if (this.areTraitsCompatible(profileTraits[key], value)) {
        score += 0.5;
        matched.push(`${key}_partial`);
      }
    }

    return {
      score: score / Object.keys(recTraits).length,
      matched
    };
  }

  /**
   * Check if traits are compatible
   */
  areTraitsCompatible(trait1, trait2) {
    const compatibility = {
      'high': ['moderate'],
      'moderate': ['high', 'low'],
      'low': ['moderate'],
      'contemplative': ['deep', 'artistic'],
      'light': ['fun', 'comfortable'],
      'intense': ['dark', 'gripping']
    };

    return compatibility[trait1]?.includes(trait2) || false;
  }

  /**
   * Calculate diversity of recommendations
   */
  calculateDiversity(recommendations) {
    const diversity = {
      genres: new Set(),
      decades: new Set(),
      styles: new Set(),
      ratings: new Set(),
      surpriseCount: 0
    };

    for (const rec of recommendations) {
      // Genre diversity
      if (rec.genres) {
        rec.genres.forEach(g => diversity.genres.add(g));
      }
      
      // Decade diversity
      if (rec.year) {
        diversity.decades.add(Math.floor(rec.year / 10) * 10);
      }
      
      // Style diversity
      if (rec.style) {
        diversity.styles.add(rec.style);
      }
      
      // Rating diversity
      if (rec.rating) {
        diversity.ratings.add(Math.floor(rec.rating));
      }
      
      // Count surprises
      if (rec.isSurprise) {
        diversity.surpriseCount++;
      }
    }

    const score = (
      diversity.genres.size * 0.3 +
      diversity.decades.size * 0.2 +
      diversity.styles.size * 0.2 +
      diversity.ratings.size * 0.2 +
      (diversity.surpriseCount / recommendations.length) * 0.1
    ) / recommendations.length;

    return {
      score: Math.min(score, 1),
      details: {
        genres: diversity.genres.size,
        decades: diversity.decades.size,
        styles: diversity.styles.size,
        surprises: diversity.surpriseCount
      }
    };
  }

  /**
   * Evaluate surprise quality
   */
  async evaluateSurprises(recommendations) {
    const surprises = recommendations.filter(r => r.isSurprise);
    
    if (surprises.length === 0) {
      return { score: 0, count: 0 };
    }

    let qualityScore = 0;
    
    for (const surprise of surprises) {
      // Evaluate surprise quality based on confidence and type
      if (surprise.surpriseConfidence > 70) {
        qualityScore += 1;
      } else if (surprise.surpriseConfidence > 50) {
        qualityScore += 0.7;
      } else {
        qualityScore += 0.4;
      }
      
      // Bonus for certain surprise types
      if (surprise.surpriseType === 'hidden_gem') {
        qualityScore += 0.2;
      }
    }

    return {
      score: qualityScore / surprises.length,
      count: surprises.length,
      types: surprises.map(s => s.surpriseType)
    };
  }

  /**
   * Calculate overall validation score
   */
  calculateOverallScore(validation) {
    const weights = {
      emotionalMatch: 0.4,
      diversity: 0.3,
      surpriseQuality: 0.3
    };

    const score = 
      (validation.emotionalMatch?.score || 0) * weights.emotionalMatch +
      (validation.diversityScore?.score || 0) * weights.diversity +
      (validation.surpriseQuality?.score || 0) * weights.surpriseQuality;

    return Math.round(score * 100);
  }

  /**
   * Generate validation message
   */
  generateValidationMessage(validation) {
    const score = validation.overallScore;
    
    if (score >= 80) {
      return {
        type: 'success',
        title: 'We totally get your vibe!',
        subtitle: 'These recommendations should be perfect for your moment',
        emoji: '🎯'
      };
    } else if (score >= 60) {
      return {
        type: 'good',
        title: 'Pretty good match!',
        subtitle: 'These should work well, with a few surprises',
        emoji: '👍'
      };
    } else if (score >= 40) {
      return {
        type: 'moderate',
        title: 'Give these a try',
        subtitle: 'Let us know if you need adjustments',
        emoji: '🤔'
      };
    } else {
      return {
        type: 'uncertain',
        title: 'Experimental picks',
        subtitle: 'We took some creative liberties - let us know!',
        emoji: '🎲'
      };
    }
  }

  /**
   * Collect immediate feedback
   */
  async collectImmediateFeedback(sessionId, feedbackType, response) {
    const feedback = {
      sessionId,
      type: feedbackType,
      response,
      timestamp: Date.now()
    };

    // Process feedback based on type
    switch (feedbackType) {
      case 'overall_impression':
        return this.processOverallFeedback(feedback);
      case 'movie_reaction':
        return this.processMovieReaction(feedback);
      case 'refinement_request':
        return this.processRefinementRequest(feedback);
      default:
        return this.processGenericFeedback(feedback);
    }
  }

  /**
   * Process overall feedback
   */
  async processOverallFeedback(feedback) {
    const score = this.validationOptions.immediate.options
      .find(opt => opt.id === feedback.response.id)?.score || 3;

    const processed = {
      ...feedback,
      score,
      needsRefinement: score < 3,
      message: this.generateFeedbackResponse(score)
    };

    await this.storeFeedback(processed);
    return processed;
  }

  /**
   * Process individual movie reaction
   */
  async processMovieReaction(feedback) {
    const reaction = this.validationOptions.microFeedback.quickReact
      .find(r => r.id === feedback.response.reaction);

    const processed = {
      ...feedback,
      action: reaction?.action,
      impact: this.calculateReactionImpact(reaction)
    };

    await this.storeFeedback(processed);
    return processed;
  }

  /**
   * Generate feedback response message
   */
  generateFeedbackResponse(score) {
    const responses = {
      5: "Awesome! We're on the same wavelength",
      4: "Great! These should work well",
      3: "Okay, these might need some tweaking",
      2: "Let's try adjusting these for you",
      1: "No worries, let's find something better"
    };

    return responses[score] || "Thanks for the feedback!";
  }

  /**
   * Calculate reaction impact for adjustments
   */
  calculateReactionImpact(reaction) {
    const impacts = {
      'exclude_similar': { strength: 'high', scope: 'genre' },
      'amplify_traits': { strength: 'medium', scope: 'traits' },
      'reduce_traits': { strength: 'low', scope: 'traits' },
      'exclude_type': { strength: 'high', scope: 'type' }
    };

    return impacts[reaction?.action] || { strength: 'low', scope: 'general' };
  }

  /**
   * Generate moment summary for user
   */
  async generateMomentSummary(sessionId, userProfile, recommendations) {
    const emotionalExplanation = this.explainEmotionalProfile(userProfile.emotionalProfile);
    const topPicks = recommendations.slice(0, 3);
    const surprises = recommendations.filter(r => r.isSurprise);

    return {
      sessionId,
      moment: {
        description: emotionalExplanation,
        emoji: this.getEmotionalEmoji(userProfile.emotionalProfile),
        confidence: userProfile.confidence || 75
      },
      highlights: {
        topPicks: topPicks.map(p => ({
          title: p.title,
          reason: p.matchReason || 'Great match for your mood'
        })),
        surprises: surprises.map(s => ({
          title: s.title,
          reason: s.surpriseReason
        }))
      },
      visualization: await this.generateMoodVisualization(userProfile),
      actions: [
        'Save this moment',
        'Share recommendations',
        'Adjust preferences'
      ]
    };
  }

  /**
   * Explain emotional profile in user-friendly terms
   */
  explainEmotionalProfile(profile) {
    if (!profile) return "Exploring your preferences";

    const parts = [];
    
    if (profile.energy === 'energized') {
      parts.push("high energy and ready for intensity");
    } else if (profile.energy === 'drained') {
      parts.push("seeking comfort and ease");
    }

    if (profile.mood === 'adventurous') {
      parts.push("open to new experiences");
    } else if (profile.mood === 'contemplative') {
      parts.push("in a thoughtful mood");
    }

    if (profile.openness === 'experimental') {
      parts.push("craving something different");
    }

    return `Tonight you're ${parts.join(', ')}`;
  }

  /**
   * Get emoji for emotional state
   */
  getEmotionalEmoji(profile) {
    if (!profile) return '🎬';

    const emojiMap = {
      'energized_adventurous': '🚀',
      'energized_content': '⚡',
      'drained_content': '🛋️',
      'drained_melancholic': '🌙',
      'neutral_exploring': '🧭',
      'neutral_comfort_zone': '🏠'
    };

    const key = `${profile.energy}_${profile.mood}`;
    return emojiMap[key] || '✨';
  }

  /**
   * Generate mood visualization data
   */
  async generateMoodVisualization(userProfile) {
    return {
      type: 'radar',
      dimensions: [
        { axis: 'Energy', value: this.scaleValue(userProfile.emotionalProfile?.energy) },
        { axis: 'Mood', value: this.scaleValue(userProfile.emotionalProfile?.mood) },
        { axis: 'Openness', value: this.scaleValue(userProfile.emotionalProfile?.openness) },
        { axis: 'Focus', value: this.scaleValue(userProfile.emotionalProfile?.focus) },
        { axis: 'Discovery', value: userProfile.answers?.discovery_mode === 'surprise' ? 0.8 : 0.3 }
      ],
      color: this.getMoodColor(userProfile.emotionalProfile)
    };
  }

  /**
   * Scale emotional value to 0-1 range
   */
  scaleValue(value) {
    const scale = {
      'drained': 0.2, 'low': 0.2,
      'neutral': 0.5, 'moderate': 0.5,
      'energized': 0.8, 'high': 0.8,
      'comfort_zone': 0.3,
      'exploring': 0.6,
      'experimental': 0.9,
      'scattered': 0.3,
      'present': 0.6,
      'immersed': 0.9
    };

    return scale[value] || 0.5;
  }

  /**
   * Get color for mood visualization
   */
  getMoodColor(profile) {
    if (!profile) return '#6B7280'; // Gray

    const colors = {
      'energized': '#EF4444', // Red
      'neutral': '#3B82F6',   // Blue
      'drained': '#8B5CF6',   // Purple
      'adventurous': '#F59E0B', // Amber
      'content': '#10B981',   // Green
      'melancholic': '#6366F1' // Indigo
    };

    return colors[profile.mood] || colors[profile.energy] || '#6B7280';
  }

  /**
   * Store validation for analytics
   */
  async storeValidation(validation) {
    if (!this.env.ENABLE_ANALYTICS) return;

    try {
      await this.env.DB.prepare(`
        INSERT INTO moment_validations (
          session_id,
          emotional_match_score,
          diversity_score,
          surprise_quality_score,
          overall_score,
          created_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `).bind(
        validation.sessionId,
        validation.emotionalMatch?.score || 0,
        validation.diversityScore?.score || 0,
        validation.surpriseQuality?.score || 0,
        validation.overallScore,
        Math.floor(Date.now() / 1000)
      ).run();
    } catch (error) {
      console.error('Failed to store validation:', error);
    }
  }

  /**
   * Store feedback for analytics
   */
  async storeFeedback(feedback) {
    if (!this.env.ENABLE_ANALYTICS) return;

    try {
      await this.env.DB.prepare(`
        INSERT INTO moment_feedback (
          session_id,
          feedback_type,
          response,
          score,
          created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        feedback.sessionId,
        feedback.type,
        JSON.stringify(feedback.response),
        feedback.score || null,
        Math.floor(Date.now() / 1000)
      ).run();
    } catch (error) {
      console.error('Failed to store feedback:', error);
    }
  }

  /**
   * Calculate confidence for emotional match
   */
  calculateConfidence(matchedTraits, recommendationCount) {
    const uniqueTraits = new Set(matchedTraits).size;
    const traitDensity = matchedTraits.length / recommendationCount;
    
    if (uniqueTraits > 5 && traitDensity > 2) {
      return 'high';
    } else if (uniqueTraits > 3 && traitDensity > 1) {
      return 'medium';
    } else {
      return 'low';
    }
  }

  /**
   * Explain emotional match quality
   */
  explainEmotionalMatch(score, traits) {
    if (score > 0.8) {
      return `Excellent match - we understood your ${traits.slice(0, 2).join(' and ')} perfectly`;
    } else if (score > 0.6) {
      return `Good match - capturing your ${traits[0] || 'mood'} well`;
    } else if (score > 0.4) {
      return 'Moderate match - some adjustments might help';
    } else {
      return 'Experimental picks - let us know what works';
    }
  }

  /**
   * Process refinement request
   */
  async processRefinementRequest(feedback) {
    return {
      ...feedback,
      action: 'refine',
      strategy: this.determineRefinementStrategy(feedback.response)
    };
  }

  /**
   * Determine refinement strategy from feedback
   */
  determineRefinementStrategy(response) {
    if (response.includes('different')) {
      return 'variety';
    } else if (response.includes('lighter')) {
      return 'lighter';
    } else if (response.includes('deeper')) {
      return 'deeper';
    } else {
      return 'adjust';
    }
  }

  /**
   * Process generic feedback
   */
  async processGenericFeedback(feedback) {
    await this.storeFeedback(feedback);
    return {
      ...feedback,
      processed: true
    };
  }
}