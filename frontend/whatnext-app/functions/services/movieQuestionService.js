// src/services/movieQuestionService.js

// The 5 Strategic Movie Questions
const MOVIE_QUESTIONS = {
  // Question 1: Cognitive Load (50/50 split)
  cognitive_load: {
    id: 'cognitive_load',
    order: 1,
    text: 'What kind of mental engagement do you want?',
    description: 'This helps us understand if you want something challenging or relaxing',
    options: [
      { 
        id: 'challenge', 
        text: 'Mind-bending & thought-provoking', 
        emoji: '🧠',
        examples: 'Like Inception, Interstellar, Black Mirror',
        vectorWeights: { complexity: 0.8, intellectual: 0.9, mainstream: 0.2 }
      },
      { 
        id: 'easy', 
        text: 'Easy entertainment & fun', 
        emoji: '🍿',
        examples: 'Like Marvel movies, romantic comedies, action films',
        vectorWeights: { complexity: 0.2, intellectual: 0.1, mainstream: 0.8 }
      }
    ]
  },

  // Question 2: Emotional Tone (25/25/25/25 split)
  emotional_tone: {
    id: 'emotional_tone',
    order: 2,
    text: 'How do you want to feel while watching?',
    description: 'The emotional journey matters as much as the story',
    options: [
      { 
        id: 'intense', 
        text: 'Gripped & on edge', 
        emoji: '😰',
        examples: 'Thrillers, psychological dramas, intense action',
        vectorWeights: { darkness: 0.8, suspense: 0.9, comfort: 0.1 }
      },
      { 
        id: 'uplifting', 
        text: 'Happy & inspired', 
        emoji: '😊',
        examples: 'Feel-good movies, comedies, uplifting stories',
        vectorWeights: { darkness: 0.1, humor: 0.8, comfort: 0.9 }
      },
      { 
        id: 'contemplative', 
        text: 'Thoughtful & reflective', 
        emoji: '🤔',
        examples: 'Character studies, philosophical films, quiet dramas',
        vectorWeights: { depth: 0.9, pacing_slow: 0.7, artistic: 0.8 }
      },
      { 
        id: 'escapist', 
        text: 'Transported to another world', 
        emoji: '🌟',
        examples: 'Fantasy, sci-fi adventures, epic stories',
        vectorWeights: { fantasy: 0.8, spectacle: 0.9, world_building: 0.8 }
      }
    ]
  },

  // Question 3: Personal Context (Personal & adaptive)
  personal_context: {
    id: 'personal_context',
    order: 3,
    text: 'What resonates with where you are in life right now?',
    description: 'Movies hit differently depending on our current situation',
    options: [
      { 
        id: 'exploring', 
        text: 'Figuring things out', 
        emoji: '🧭',
        examples: 'Coming-of-age, self-discovery, finding purpose',
        vectorWeights: { coming_of_age: 0.9, self_discovery: 0.8, youth: 0.7 }
      },
      { 
        id: 'building', 
        text: 'Building something meaningful', 
        emoji: '🏗️',
        examples: 'Ambition, career challenges, relationships',
        vectorWeights: { ambition: 0.8, professional: 0.7, relationships: 0.6 }
      },
      { 
        id: 'reflecting', 
        text: 'Looking back & understanding', 
        emoji: '🪞',
        examples: 'Life lessons, wisdom, understanding the past',
        vectorWeights: { wisdom: 0.9, nostalgia: 0.7, life_lessons: 0.8 }
      },
      { 
        id: 'escaping', 
        text: 'Need a break from reality', 
        emoji: '🏝️',
        examples: 'Pure fantasy, adventure, total escapism',
        vectorWeights: { fantasy: 0.9, adventure: 0.8, spectacle: 0.7 }
      }
    ]
  },

  // Question 4: Attention Level (Energy/focus available)
  attention_level: {
    id: 'attention_level',
    order: 4,
    text: 'How much mental energy do you have right now?',
    description: 'Some movies deserve full attention, others are perfect for relaxed viewing',
    options: [
      { 
        id: 'full_focus', 
        text: 'Ready for complete immersion', 
        emoji: '🎯',
        examples: 'Dense plots, subtitles, complex narratives',
        vectorWeights: { complexity: 0.9, subtitles: 0.8, art_house: 0.7 }
      },
      { 
        id: 'moderate', 
        text: 'Engaged but not overthinking', 
        emoji: '👀',
        examples: 'Clear story, some complexity, easy to follow',
        vectorWeights: { complexity: 0.5, mainstream: 0.6, accessible: 0.8 }
      },
      { 
        id: 'background', 
        text: 'Something I can partly multitask with', 
        emoji: '📱',
        examples: 'Familiar genres, predictable structure, comfort viewing',
        vectorWeights: { complexity: 0.2, comfort: 0.9, familiar: 0.8 }
      }
    ]
  },

  // Question 5: Discovery Mode (Exploration vs safety)
  discovery_mode: {
    id: 'discovery_mode',
    order: 5,
    text: 'Are you feeling adventurous with your choice?',
    description: 'Sometimes we want surprises, sometimes we want reliable satisfaction',
    options: [
      { 
        id: 'surprise', 
        text: 'Show me something unexpected', 
        emoji: '🎲',
        examples: 'Hidden gems, foreign films, unusual genres',
        vectorWeights: { popularity: 0.2, foreign: 0.7, unconventional: 0.8 }
      },
      { 
        id: 'reliable', 
        text: 'Something I know I\'ll probably like', 
        emoji: '✅',
        examples: 'Popular choices, familiar genres, safe bets',
        vectorWeights: { popularity: 0.8, mainstream: 0.9, highly_rated: 0.8 }
      }
    ]
  }
};

export class MovieQuestionService {
  constructor(env) {
    this.db = env.DB;
    this.questionsKV = env.MOVIE_QUESTIONS;
    this.defaultQuestions = MOVIE_QUESTIONS;
  }

  /**
   * Get questions for a specific domain
   * @param {string} domain - The content domain (movies, tv-series, etc.)
   * @returns {Array} Array of questions in order
   */
  async getQuestions(domain = 'movies') {
    // Try to get from KV cache first
    const cacheKey = `questions:${domain}`;
    const cached = await this.getCachedQuestions(cacheKey);
    
    if (cached) {
      return cached;
    }

    // Try to load from database
    const dbQuestions = await this.loadQuestionsFromDB(domain);
    
    if (dbQuestions && dbQuestions.length > 0) {
      // Cache for 1 hour
      await this.cacheQuestions(cacheKey, dbQuestions, 3600);
      return dbQuestions;
    }

    // Fallback to default questions
    const defaultQuestions = this.getDefaultQuestions(domain);
    
    // Cache for 1 hour
    await this.cacheQuestions(cacheKey, defaultQuestions, 3600);
    
    return defaultQuestions;
  }

  /**
   * Load questions from database
   */
  async loadQuestionsFromDB(domain) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          id,
          question_text as text,
          description,
          options,
          order_index,
          vector_weights,
          personal_context
        FROM questions 
        WHERE domain = ? OR domain = 'universal'
        ORDER BY order_index
      `);
      
      const results = await stmt.bind(domain).all();
      
      if (results.results && results.results.length > 0) {
        return results.results.map(q => this.formatQuestion(q));
      }
      
      return null;
      
    } catch (error) {
      console.error('Failed to load questions from DB:', error);
      return null;
    }
  }

  /**
   * Format database question to match expected structure
   */
  formatQuestion(dbQuestion) {
    return {
      id: dbQuestion.id,
      order: dbQuestion.order_index,
      text: dbQuestion.text,
      description: dbQuestion.description,
      options: JSON.parse(dbQuestion.options || '[]'),
      vectorWeights: JSON.parse(dbQuestion.vector_weights || '{}'),
      personalContext: dbQuestion.personal_context || false
    };
  }

  /**
   * Get default questions for domain
   */
  getDefaultQuestions(domain) {
    // Convert object to array and sort by order
    const questions = Object.values(this.defaultQuestions);
    
    // Customize questions based on domain if needed
    if (domain === 'tv-series') {
      // Modify questions for TV series context
      return this.adaptQuestionsForTVSeries(questions);
    } else if (domain === 'documentaries') {
      // Modify questions for documentaries
      return this.adaptQuestionsForDocumentaries(questions);
    }
    
    return questions.sort((a, b) => a.order - b.order);
  }

  /**
   * Adapt questions for TV series
   */
  adaptQuestionsForTVSeries(questions) {
    return questions.map(q => {
      const adapted = { ...q };
      
      // Modify attention level question for TV series
      if (q.id === 'attention_level') {
        adapted.text = 'How much time do you want to invest?';
        adapted.options = adapted.options.map(opt => {
          if (opt.id === 'full_focus') {
            return {
              ...opt,
              text: 'Ready for a long-term commitment',
              examples: 'Multi-season epics, complex storylines'
            };
          } else if (opt.id === 'moderate') {
            return {
              ...opt,
              text: 'A season or two is fine',
              examples: 'Limited series, single season stories'
            };
          } else if (opt.id === 'background') {
            return {
              ...opt,
              text: 'Something episodic I can dip in and out of',
              examples: 'Sitcoms, procedurals, anthology series'
            };
          }
          return opt;
        });
      }
      
      return adapted;
    });
  }

  /**
   * Adapt questions for documentaries
   */
  adaptQuestionsForDocumentaries(questions) {
    return questions.map(q => {
      const adapted = { ...q };
      
      // Modify emotional tone for documentaries
      if (q.id === 'emotional_tone') {
        adapted.options = adapted.options.map(opt => {
          if (opt.id === 'intense') {
            return {
              ...opt,
              text: 'Eye-opening & provocative',
              examples: 'True crime, exposés, social issues'
            };
          } else if (opt.id === 'uplifting') {
            return {
              ...opt,
              text: 'Inspiring & hopeful',
              examples: 'Human triumphs, nature, innovation'
            };
          } else if (opt.id === 'contemplative') {
            return {
              ...opt,
              text: 'Educational & informative',
              examples: 'History, science, culture'
            };
          } else if (opt.id === 'escapist') {
            return {
              ...opt,
              text: 'Fascinating & exotic',
              examples: 'Travel, wildlife, exploration'
            };
          }
          return opt;
        });
      }
      
      return adapted;
    });
  }

  /**
   * Get a specific question by ID
   */
  async getQuestionById(questionId, domain = 'movies') {
    const questions = await this.getQuestions(domain);
    return questions.find(q => q.id === questionId);
  }

  /**
   * Get next question based on current progress
   */
  async getNextQuestion(currentIndex, domain = 'movies') {
    const questions = await this.getQuestions(domain);
    
    if (currentIndex >= questions.length) {
      return null;
    }
    
    return questions[currentIndex];
  }

  /**
   * Calculate question weights based on user history
   */
  async calculateQuestionWeights(sessionId, questionId) {
    // This could be enhanced with ML-based weight adjustment
    // For now, return default weights
    const question = await this.getQuestionById(questionId);
    return question ? question.vectorWeights : {};
  }

  /**
   * Cache operations
   */
  
  async getCachedQuestions(cacheKey) {
    if (!this.questionsKV) return null;
    
    try {
      const cached = await this.questionsKV.get(cacheKey);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch (error) {
      console.error('Failed to get cached questions:', error);
    }
    
    return null;
  }

  async cacheQuestions(cacheKey, questions, ttl = 3600) {
    if (!this.questionsKV) return;
    
    try {
      await this.questionsKV.put(
        cacheKey,
        JSON.stringify(questions),
        { expirationTtl: ttl }
      );
    } catch (error) {
      console.error('Failed to cache questions:', error);
    }
  }

  /**
   * Store question response for analytics
   */
  async storeQuestionResponse(sessionId, questionId, answer, responseTime) {
    try {
      await this.db.prepare(`
        INSERT INTO question_responses (
          session_id, question_id, answer, response_time_ms, created_at
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(
        sessionId,
        questionId,
        answer,
        responseTime,
        Math.floor(Date.now() / 1000)
      ).run();
    } catch (error) {
      console.error('Failed to store question response:', error);
    }
  }

  /**
   * Get question performance metrics
   */
  async getQuestionMetrics(questionId) {
    try {
      const stmt = this.db.prepare(`
        SELECT 
          COUNT(*) as total_responses,
          AVG(response_time_ms) as avg_response_time,
          COUNT(DISTINCT answer) as unique_answers
        FROM question_responses
        WHERE question_id = ?
      `);
      
      const result = await stmt.bind(questionId).first();
      return result;
      
    } catch (error) {
      console.error('Failed to get question metrics:', error);
      return null;
    }
  }
}