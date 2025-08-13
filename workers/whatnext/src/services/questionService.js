// src/services/questionService.js
import { calculateEntropy, calculateInformationGain } from '../utils/informationTheory.js';

export class QuestionService {
  constructor(env) {
    this.env = env;
    this.maxQuestionsPerSession = env.MAX_QUESTIONS_PER_SESSION || 6;
  }

  /**
   * Get the perfect first question that maximally bisects preference space
   */
  async getPerfectQuestion() {
    // Try to get from cache first
    const cachedQuestion = await this.env.QUESTIONS.get('perfect_question');
    if (cachedQuestion) {
      return JSON.parse(cachedQuestion);
    }

    // Fallback to database
    const result = await this.env.DB.prepare(
      'SELECT * FROM questions WHERE question_type = ? AND is_active = 1 ORDER BY expected_info_gain DESC LIMIT 1'
    ).bind('perfect').first();

    if (!result) {
      throw new Error('No perfect question found');
    }

    const question = this.formatQuestion(result);
    
    // Cache for 1 hour
    await this.env.QUESTIONS.put('perfect_question', JSON.stringify(question), {
      expirationTtl: 3600
    });

    return question;
  }

  /**
   * Determine next step: another question or final recommendations
   */
  async getNextStep(userState) {
    const choices = userState.getChoices();
    const questionsAsked = choices.length;

    // Check if we have enough information or reached max questions
    if (questionsAsked >= this.maxQuestionsPerSession) {
      return { type: 'recommendations' };
    }

    // Calculate current uncertainty
    const remainingEntropy = this.calculateRemainingEntropy(userState);
    
    // If entropy is low enough, we can make good recommendations
    if (remainingEntropy < 0.3) {
      return { type: 'recommendations' };
    }

    // Get next optimal question
    const nextQuestion = await this.selectOptimalQuestion(userState);
    
    if (!nextQuestion) {
      return { type: 'recommendations' };
    }

    return {
      type: 'question',
      question: nextQuestion
    };
  }

  /**
   * Select the question that maximizes expected information gain
   */
  async selectOptimalQuestion(userState) {
    const choices = userState.getChoices();
    const askedQuestionIds = choices.map(c => c.questionId);

    // Get candidate questions based on current path
    const candidates = await this.getCandidateQuestions(userState, askedQuestionIds);

    if (candidates.length === 0) {
      return null;
    }

    // Score each candidate question
    const scoredCandidates = candidates.map(question => ({
      ...question,
      score: this.calculateQuestionScore(question, userState)
    }));

    // Sort by score and return best
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    // Log the selection for learning
    try {
      await this.logQuestionSelection(scoredCandidates[0].id, scoredCandidates[0].score, userState.sessionId);
    } catch (error) {
      console.error('Failed to log question selection:', error);
    }

    return this.formatQuestion(scoredCandidates[0]);
  }

  /**
   * Get candidate questions based on current user path
   */
  async getCandidateQuestions(userState, excludeIds) {
    const choices = userState.getChoices();
    const domain = userState.domain || 'general';
    
    // Determine question category based on user's path
    let categoryFilter = 'followup';
    let additionalFilter = '';
    
    // Add domain filter
    let domainFilter = `AND domain = '${domain}'`;
    
    if (domain === 'movies') {
      // For movie domain, filter based on mood choice
      if (choices.length > 0) {
        const moodChoice = choices.find(c => c.questionId === 'movie_mood');
        if (moodChoice) {
          if (moodChoice.choice === 'uplifting') {
            // For uplifting mood, use light/positive questions
            additionalFilter = "AND id IN ('movie_genre_light', 'movie_era_modern', 'movie_reality_light', 'movie_commitment_light', 'movie_solo_social')";
          } else if (moodChoice.choice === 'intense') {
            // For intense mood, use intense/thriller questions
            additionalFilter = "AND id IN ('movie_genre_intense', 'movie_pace', 'movie_stakes', 'movie_violence', 'movie_ending')";
          }
        }
      }
    } else if (domain === 'series') {
      // For TV series domain, filter based on commitment choice
      if (choices.length > 0) {
        const commitmentChoice = choices.find(c => c.questionId === 'series_commitment');
        if (commitmentChoice) {
          if (commitmentChoice.choice === 'long') {
            // For multi-season commitment, use long-form series questions
            additionalFilter = "AND id IN ('series_genre_long', 'series_complete', 'series_prestige', 'series_episode_long', 'series_platform', 'series_subtitles', 'series_animation')";
          } else if (commitmentChoice.choice === 'short') {
            // For weekend binge, use short-form series questions
            additionalFilter = "AND id IN ('series_genre_short', 'series_intensity', 'series_era_short', 'series_based', 'series_platform', 'series_subtitles', 'series_animation')";
          }
        }
      }
    } else if (domain === 'documentaries') {
      // For documentary domain, filter based on purpose choice
      if (choices.length > 0) {
        const purposeChoice = choices.find(c => c.questionId === 'doc_purpose');
        if (purposeChoice) {
          if (purposeChoice.choice === 'learn') {
            // For educational purpose, use learning-focused questions
            additionalFilter = "AND id IN ('doc_topic_edu', 'doc_depth_edu', 'doc_style_edu', 'doc_presenter', 'doc_length', 'doc_visual', 'doc_controversy')";
          } else if (purposeChoice.choice === 'emotional') {
            // For emotional purpose, use emotion-focused questions
            additionalFilter = "AND id IN ('doc_topic_emo', 'doc_tone', 'doc_scope', 'doc_recent', 'doc_length', 'doc_visual', 'doc_controversy')";
          }
        }
      }
    } else if (domain === 'general') {
      // Original logic for general domain
      domainFilter = "AND (domain = 'general' OR domain IS NULL)";
      if (choices.length > 0) {
        const firstChoice = choices[0];
        if (firstChoice.questionId === 'cognitive_engagement') {
          if (firstChoice.choice === 'challenge') {
            // High cognitive load path
            additionalFilter = "AND category IN ('learning', 'format', 'complexity', 'time')";
          } else {
            // Low cognitive load path  
            additionalFilter = "AND category IN ('engagement', 'novelty', 'social', 'time', 'mood')";
          }
        }
      }
    }

    try {
      const placeholders = excludeIds.map(() => '?').join(',');
      const sql = `
        SELECT * FROM questions 
        WHERE question_type = ? 
          AND is_active = 1 
          ${domainFilter}
          ${additionalFilter}
          ${excludeIds.length > 0 ? `AND id NOT IN (${placeholders})` : ''}
        ORDER BY expected_info_gain DESC
        LIMIT 5
      `;

      const params = [categoryFilter, ...excludeIds];
      const result = await this.env.DB.prepare(sql).bind(...params).all();
      
      return result.results || [];
    } catch (error) {
      console.error('Error getting candidate questions:', error);
      console.error('SQL:', sql);
      console.error('Params:', params);
      return [];
    }
  }

  /**
   * Calculate score for a question based on current user state
   */
  calculateQuestionScore(question, userState) {
    const baseScore = question.expected_info_gain || 0.5;
    
    // Boost score for questions that haven't been used much (exploration)
    const usageBoost = Math.max(0, 1 - (question.usage_count || 0) / 100);
    
    // Boost score for questions with good historical performance
    const performanceBoost = (question.avg_satisfaction || 0.5) - 0.5;
    
    // Context relevance (time of day, etc.)
    const contextBoost = this.calculateContextRelevance(question, userState);
    
    return baseScore + (usageBoost * 0.1) + (performanceBoost * 0.2) + (contextBoost * 0.1);
  }

  /**
   * Calculate how relevant this question is to current context
   */
  calculateContextRelevance(question, userState) {
    // Time-based relevance
    const hour = new Date().getHours();
    let timeRelevance = 0;
    
    if (question.category === 'time' && (hour < 9 || hour > 20)) {
      timeRelevance = 0.3; // Time questions more relevant during leisure hours
    }
    
    if (question.category === 'learning' && hour >= 9 && hour <= 17) {
      timeRelevance = 0.2; // Learning questions more relevant during work hours
    }

    // Device-based relevance (if available in userState)
    let deviceRelevance = 0;
    if (userState.deviceType === 'mobile' && question.category === 'format') {
      deviceRelevance = 0.2; // Format questions more relevant on mobile
    }

    return timeRelevance + deviceRelevance;
  }

  /**
   * Calculate remaining uncertainty in user preferences
   */
  calculateRemainingEntropy(userState) {
    const choices = userState.getChoices();
    
    // Simple entropy calculation based on number of choices made
    // In a real implementation, this would consider the actual content space
    const maxEntropy = Math.log2(8); // Assume 8 major content categories
    const reductionPerChoice = 0.4;   // Average entropy reduction per choice
    
    const currentEntropy = Math.max(0, maxEntropy - (choices.length * reductionPerChoice));
    return currentEntropy;
  }

  /**
   * Format question for API response
   */
  formatQuestion(questionData) {
    let options;
    
    // First check if we have predefined options with emojis
    const predefinedOptions = this.getQuestionOptions(questionData.id);
    
    if (predefinedOptions) {
      // Use predefined options that already have emojis
      options = predefinedOptions;
    } else if (questionData.options) {
      // Parse options from database and convert to expected format
      try {
        const dbOptions = JSON.parse(questionData.options);
        
        // Check if options are in new format with objects
        if (dbOptions.left && dbOptions.right) {
          // Handle both old format {left: "text", right: "text"} 
          // and new format {left: {text: "text", emoji: "emoji", id: "id"}}
          if (typeof dbOptions.left === 'object' && typeof dbOptions.right === 'object') {
            // New format with emoji
            options = [
              { 
                id: dbOptions.left.id || 'left', 
                text: dbOptions.left.text, 
                emoji: dbOptions.left.emoji 
              },
              { 
                id: dbOptions.right.id || 'right', 
                text: dbOptions.right.text, 
                emoji: dbOptions.right.emoji 
              }
            ];
          } else {
            // Old format - just text
            options = [
              { 
                id: 'left', 
                text: dbOptions.left, 
                emoji: '👈' 
              },
              { 
                id: 'right', 
                text: dbOptions.right, 
                emoji: '👉' 
              }
            ];
          }
        } else {
          // Fallback if options format is unexpected
          options = [
            { id: 'yes', text: 'Yes', emoji: '👍' },
            { id: 'no', text: 'No', emoji: '👎' }
          ];
        }
      } catch (e) {
        console.error('Failed to parse question options:', e);
        options = [
          { id: 'yes', text: 'Yes', emoji: '👍' },
          { id: 'no', text: 'No', emoji: '👎' }
        ];
      }
    } else {
      // Fallback to default options
      options = [
        { id: 'yes', text: 'Yes', emoji: '👍' },
        { id: 'no', text: 'No', emoji: '👎' }
      ];
    }

    return {
      id: questionData.id,
      text: questionData.question_text || questionData.text,
      type: 'binary_choice',
      options: options,
      expectedInfoGain: questionData.expected_info_gain,
      category: questionData.category
    };
  }

  /**
   * Get options for a specific question
   */
  getQuestionOptions(questionId) {
    const optionsMap = {
      'cognitive_engagement': [
        { id: 'challenge', text: 'Challenge my mind', emoji: '🧠' },
        { id: 'entertain', text: 'Entertain without effort', emoji: '🍿' }
      ],
      'learning_depth': [
        { id: 'new', text: 'Learn something completely new', emoji: '🌟' },
        { id: 'deeper', text: 'Go deeper into what I know', emoji: '🔍' }
      ],
      'content_format': [
        { id: 'video', text: 'Video content', emoji: '📺' },
        { id: 'text', text: 'Text-based content', emoji: '📖' }
      ],
      'time_commitment': [
        { id: 'quick', text: 'Something quick (under 20 min)', emoji: '⚡' },
        { id: 'substantial', text: 'Something substantial', emoji: '🏛️' }
      ],
      'engagement_type': [
        { id: 'interactive', text: 'Interactive and engaging', emoji: '🎮' },
        { id: 'passive', text: 'Passive and relaxing', emoji: '🛋️' }
      ],
      'novelty_preference': [
        { id: 'familiar', text: 'Familiar and comforting', emoji: '🏠' },
        { id: 'surprise', text: 'A pleasant surprise', emoji: '🎁' }
      ],
      'social_context': [
        { id: 'personal', text: 'Just for me', emoji: '👤' },
        { id: 'social', text: 'To share with others', emoji: '👥' }
      ],
      'mood_preference': [
        { id: 'uplifting', text: 'Something uplifting', emoji: '☀️' },
        { id: 'thoughtful', text: 'Something thought-provoking', emoji: '🤔' }
      ],
      'complexity_level': [
        { id: 'beginner', text: 'Beginner-friendly', emoji: '🌱' },
        { id: 'advanced', text: 'Advanced/Expert level', emoji: '🚀' }
      ],
      'practical_theoretical': [
        { id: 'practical', text: 'Practical how-to', emoji: '🔧' },
        { id: 'theoretical', text: 'Theoretical concepts', emoji: '📐' }
      ],
      'content_length': [
        { id: 'bite', text: 'Bite-sized content', emoji: '🍬' },
        { id: 'immersive', text: 'Longer immersive experience', emoji: '🌊' }
      ],
      'topic_preference': [
        { id: 'tech', text: 'Technology/Science', emoji: '💻' },
        { id: 'arts', text: 'Arts/Humanities', emoji: '🎨' }
      ],
      'visual_preference': [
        { id: 'visual', text: 'Highly visual', emoji: '👁️' },
        { id: 'ideas', text: 'Focus on ideas', emoji: '💭' }
      ],
      'creator_preference': [
        { id: 'established', text: 'Established experts', emoji: '🏆' },
        { id: 'emerging', text: 'Emerging voices', emoji: '🌟' }
      ],
      'interactivity_level': [
        { id: 'participate', text: 'Actively participate', emoji: '🙋' },
        { id: 'observe', text: 'Just observe', emoji: '👀' }
      ],
      
      // Movie-specific questions
      'movie_mood': [
        { id: 'uplifting', text: 'Feel-good vibes', emoji: '😊' },
        { id: 'intense', text: 'Edge of my seat', emoji: '😰' }
      ],
      'movie_genre_light': [
        { id: 'comedy', text: 'Make me laugh', emoji: '😂' },
        { id: 'drama', text: 'Warm my heart', emoji: '❤️' }
      ],
      'movie_genre_intense': [
        { id: 'thriller', text: 'Heart-pounding thriller', emoji: '💓' },
        { id: 'scifi', text: 'Mind-bending sci-fi', emoji: '🌌' }
      ],
      'movie_era_modern': [
        { id: 'recent', text: 'Last 5 years', emoji: '🆕' },
        { id: 'classic', text: 'Timeless classics', emoji: '🎭' }
      ],
      'movie_reality_light': [
        { id: 'realistic', text: 'Could happen IRL', emoji: '🌍' },
        { id: 'fantasy', text: 'Pure imagination', emoji: '🦄' }
      ],
      'movie_commitment_light': [
        { id: 'quick', text: 'Under 2 hours', emoji: '⚡' },
        { id: 'epic', text: "I'm invested", emoji: '🍿' }
      ],
      'movie_solo_social': [
        { id: 'solo', text: 'Watching alone', emoji: '👤' },
        { id: 'group', text: 'With others', emoji: '👥' }
      ],
      'movie_pace': [
        { id: 'slow', text: 'Slow burn', emoji: '🕯️' },
        { id: 'fast', text: 'Non-stop action', emoji: '💥' }
      ],
      'movie_stakes': [
        { id: 'personal', text: 'Personal stakes', emoji: '💔' },
        { id: 'global', text: 'World-ending', emoji: '🌎' }
      ],
      'movie_violence': [
        { id: 'realistic', text: 'Gritty realism', emoji: '🩸' },
        { id: 'stylized', text: 'Stylized fantasy', emoji: '⚔️' }
      ],
      'movie_ending': [
        { id: 'satisfying', text: 'Satisfying conclusion', emoji: '🎁' },
        { id: 'ambiguous', text: 'Open to interpretation', emoji: '❓' }
      ],
      'movie_franchise': [
        { id: 'standalone', text: 'Stand-alone story', emoji: '📖' },
        { id: 'universe', text: 'Part of universe', emoji: '🌐' }
      ],
      'movie_cast': [
        { id: 'stars', text: 'Star-studded', emoji: '⭐' },
        { id: 'unknown', text: 'Hidden gems', emoji: '💎' }
      ],
      'movie_subtitles': [
        { id: 'english', text: 'English only', emoji: '🇬🇧' },
        { id: 'foreign', text: 'Foreign films OK', emoji: '🌍' }
      ],
      'movie_rating': [
        { id: 'family', text: 'Family-friendly', emoji: '👨‍👩‍👧‍👦' },
        { id: 'mature', text: 'Mature content OK', emoji: '🔞' }
      ],
      
      // TV Series questions
      'series_commitment': [
        { id: 'long', text: 'Multiple seasons', emoji: '📺' },
        { id: 'short', text: 'Weekend binge', emoji: '⚡' }
      ],
      'series_genre_long': [
        { id: 'fantasy', text: 'Epic fantasy/sci-fi', emoji: '🐉' },
        { id: 'crime', text: 'Crime/drama', emoji: '🔍' }
      ],
      'series_complete': [
        { id: 'complete', text: 'Completed series', emoji: '✅' },
        { id: 'ongoing', text: 'Ongoing series', emoji: '🔄' }
      ],
      'series_prestige': [
        { id: 'prestige', text: 'Prestige drama', emoji: '🏆' },
        { id: 'guilty', text: 'Guilty pleasure', emoji: '🍿' }
      ],
      'series_episode_long': [
        { id: 'long', text: 'Hour-long episodes', emoji: '⏰' },
        { id: 'short', text: '20-30 min episodes', emoji: '⚡' }
      ],
      'series_genre_short': [
        { id: 'truecrime', text: 'True crime', emoji: '🔪' },
        { id: 'thriller', text: 'Fictional thriller', emoji: '😱' }
      ],
      'series_intensity': [
        { id: 'light', text: 'Light and fun', emoji: '😄' },
        { id: 'dark', text: 'Dark and intense', emoji: '😈' }
      ],
      'series_era_short': [
        { id: 'modern', text: 'Modern day', emoji: '📱' },
        { id: 'period', text: 'Period piece', emoji: '🏛️' }
      ],
      'series_based': [
        { id: 'true', text: 'Based on true events', emoji: '📰' },
        { id: 'fiction', text: 'Pure fiction', emoji: '🎭' }
      ],
      'series_platform': [
        { id: 'any', text: 'Any platform', emoji: '🌐' },
        { id: 'major', text: 'Netflix/Prime/Disney+', emoji: '📺' }
      ],
      'series_subtitles': [
        { id: 'english', text: 'English only', emoji: '🇬🇧' },
        { id: 'international', text: 'Subtitles okay', emoji: '🌍' }
      ],
      'series_animation': [
        { id: 'live', text: 'Live action only', emoji: '🎬' },
        { id: 'animated', text: 'Animated okay', emoji: '🎨' }
      ],
      
      // Documentary questions
      'doc_purpose': [
        { id: 'learn', text: 'Learn something new', emoji: '🧠' },
        { id: 'emotional', text: 'Be emotionally moved', emoji: '❤️' }
      ],
      'doc_topic_edu': [
        { id: 'science', text: 'Science/nature', emoji: '🔬' },
        { id: 'history', text: 'History/politics', emoji: '📜' }
      ],
      'doc_depth_edu': [
        { id: 'deep', text: 'Deep dive', emoji: '🤿' },
        { id: 'broad', text: 'Broad overview', emoji: '🗺️' }
      ],
      'doc_style_edu': [
        { id: 'traditional', text: 'Traditional style', emoji: '🎥' },
        { id: 'experimental', text: 'Innovative/experimental', emoji: '🎪' }
      ],
      'doc_presenter': [
        { id: 'celebrity', text: 'Celebrity presenter', emoji: '⭐' },
        { id: 'expert', text: 'Expert interviews', emoji: '👨‍🔬' }
      ],
      'doc_topic_emo': [
        { id: 'inspiring', text: 'Inspiring stories', emoji: '✨' },
        { id: 'truecrime', text: 'True crime', emoji: '🔍' }
      ],
      'doc_tone': [
        { id: 'uplifting', text: 'Uplifting', emoji: '☀️' },
        { id: 'dark', text: 'Dark and challenging', emoji: '🌙' }
      ],
      'doc_scope': [
        { id: 'personal', text: 'Personal story', emoji: '👤' },
        { id: 'global', text: 'Global issue', emoji: '🌍' }
      ],
      'doc_recent': [
        { id: 'current', text: 'Current events', emoji: '📰' },
        { id: 'historical', text: 'Historical', emoji: '📚' }
      ],
      'doc_length': [
        { id: 'feature', text: 'Feature length', emoji: '🎬' },
        { id: 'series', text: 'Episodic series', emoji: '📺' }
      ],
      'doc_controversy': [
        { id: 'balanced', text: 'Balanced perspective', emoji: '⚖️' },
        { id: 'controversial', text: 'Controversial okay', emoji: '🔥' }
      ],
      'doc_visual': [
        { id: 'visual', text: 'Stunning visuals', emoji: '🎨' },
        { id: 'content', text: 'Content over style', emoji: '📝' }
      ]
    };

    return optionsMap[questionId] || null;
  }

  /**
   * Log question selection for learning algorithm
   */
  async logQuestionSelection(questionId, score, sessionId) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO interactions (session_id, action, question_id, timestamp, metadata) VALUES (?, ?, ?, ?, ?)'
      ).bind(
        sessionId,
        'question_selected',
        questionId,
        Date.now(),
        JSON.stringify({ score, selectionAlgorithm: 'information_theory_v1' })
      ).run();
    } catch (error) {
      console.error('Failed to log question selection:', error);
    }
  }

  /**
   * Update question performance based on outcomes
   */
  async updateQuestionPerformance(questionId, actualInfoGain, userSatisfaction) {
    try {
      // Get current performance
      const current = await this.env.DB.prepare(
        'SELECT * FROM question_performance WHERE question_id = ?'
      ).bind(questionId).first();

      if (current) {
        // Update existing record
        const newUsageCount = current.usage_count + 1;
        const newAvgInfoGain = ((current.avg_info_gain * current.usage_count) + actualInfoGain) / newUsageCount;
        const newAvgSatisfaction = ((current.avg_satisfaction * current.usage_count) + userSatisfaction) / newUsageCount;

        await this.env.DB.prepare(
          'UPDATE question_performance SET avg_info_gain = ?, usage_count = ?, avg_satisfaction = ?, last_updated = ? WHERE question_id = ?'
        ).bind(newAvgInfoGain, newUsageCount, newAvgSatisfaction, Date.now(), questionId).run();
      } else {
        // Create new record
        await this.env.DB.prepare(
          'INSERT INTO question_performance (question_id, avg_info_gain, usage_count, avg_satisfaction, last_updated) VALUES (?, ?, ?, ?, ?)'
        ).bind(questionId, actualInfoGain, 1, userSatisfaction, Date.now()).run();
      }

      // Invalidate cache
      await this.env.QUESTIONS.delete(`question_performance_${questionId}`);
      
    } catch (error) {
      console.error('Failed to update question performance:', error);
    }
  }
}