// src/services/domainService.js
// Domain management service for content type selection

import { QuestionService } from './questionService.js';

export class DomainService {
  constructor(env) {
    this.env = env;
    this.db = env.DB;
    this.sessionsKV = env.USER_SESSIONS;
    this.questionService = new QuestionService(env);
  }

  async getAvailableDomains() {
    try {
      const domains = await this.db
        .prepare('SELECT id, name, config FROM domains WHERE is_active = 1')
        .all();
      
      return domains.results.map(domain => ({
        id: domain.id,
        name: domain.name,
        config: domain.config ? JSON.parse(domain.config) : {}
      }));
    } catch (error) {
      console.error('Error fetching domains:', error);
      return [
        { id: 'general', name: 'General Content', config: {} },
        { id: 'movies', name: 'Movies & Shows', config: {} }
      ];
    }
  }

  async selectDomain(sessionId, domainId) {
    try {
      // Validate domain exists and is active
      const domain = await this.db
        .prepare('SELECT * FROM domains WHERE id = ? AND is_active = 1')
        .bind(domainId)
        .first();
      
      if (!domain) {
        throw new Error(`Invalid domain: ${domainId}`);
      }

      // Get or create session
      const sessionData = await this.sessionsKV.get(sessionId);
      let session = sessionData ? JSON.parse(sessionData) : {
        sessionId,
        startTime: Date.now(),
        questionsAsked: [],
        userChoices: {},
        currentEntropy: 1.0
      };

      // Update session with domain
      session.domain = domainId;
      session.domainConfig = domain.config ? JSON.parse(domain.config) : {};
      
      // Save updated session
      await this.sessionsKV.put(
        sessionId,
        JSON.stringify(session),
        { expirationTtl: this.env.SESSION_TIMEOUT_SECONDS || 3600 }
      );

      // Get first domain-specific question
      const firstQuestion = await this.getFirstDomainQuestion(domainId);
      
      // Log domain selection
      await this.logDomainSelection(sessionId, domainId);
      
      return {
        success: true,
        domain: {
          id: domain.id,
          name: domain.name,
          config: session.domainConfig
        },
        question: firstQuestion
      };
    } catch (error) {
      console.error('Error selecting domain:', error);
      throw error;
    }
  }

  async getFirstDomainQuestion(domainId) {
    try {
      // Get the perfect question for this domain
      const question = await this.db
        .prepare(`
          SELECT id, question_text, question_type, category, expected_info_gain
          FROM questions 
          WHERE domain = ? AND question_type = 'perfect' AND is_active = 1
          ORDER BY expected_info_gain DESC
          LIMIT 1
        `)
        .bind(domainId)
        .first();
      
      if (!question) {
        // Fallback to highest info gain question for domain
        const fallbackQuestion = await this.db
          .prepare(`
            SELECT id, question_text, question_type, category, expected_info_gain
            FROM questions 
            WHERE domain = ? AND is_active = 1
            ORDER BY expected_info_gain DESC
            LIMIT 1
          `)
          .bind(domainId)
          .first();
        
        if (!fallbackQuestion) {
          return null;
        }
        
        // Format the fallback question with options
        return this.questionService.formatQuestion(fallbackQuestion);
      }
      
      // Format the question with options
      return this.questionService.formatQuestion(question);
    } catch (error) {
      console.error('Error getting first domain question:', error);
      return null;
    }
  }

  async getDomainQuestions(domainId, questionType = null) {
    try {
      let query = `
        SELECT id, question_text, question_type, category, expected_info_gain
        FROM questions 
        WHERE domain = ? AND is_active = 1
      `;
      
      const params = [domainId];
      
      if (questionType) {
        query += ' AND question_type = ?';
        params.push(questionType);
      }
      
      query += ' ORDER BY expected_info_gain DESC';
      
      const questions = await this.db
        .prepare(query)
        .bind(...params)
        .all();
      
      return questions.results || [];
    } catch (error) {
      console.error('Error fetching domain questions:', error);
      return [];
    }
  }

  async getDomainPromptTemplate(domainId, userState) {
    try {
      const domain = await this.db
        .prepare('SELECT config FROM domains WHERE id = ?')
        .bind(domainId)
        .first();
      
      if (!domain || !domain.config) {
        return this.getDefaultPromptTemplate(userState);
      }
      
      const config = JSON.parse(domain.config);
      const promptTemplate = config.prompt_template;
      
      switch (domainId) {
        case 'movies':
          return this.getMoviePrompt(userState);
        case 'books':
          return this.getBookPrompt(userState);
        case 'restaurants':
          return this.getRestaurantPrompt(userState);
        default:
          return this.getDefaultPromptTemplate(userState);
      }
    } catch (error) {
      console.error('Error getting domain prompt template:', error);
      return this.getDefaultPromptTemplate(userState);
    }
  }

  getMoviePrompt(userState) {
    // Extract choices properly from userState
    const choicesArray = userState.getChoices ? userState.getChoices() : userState.choices || [];
    const choices = {};
    
    // Convert choices array to object for easier access
    choicesArray.forEach(choice => {
      choices[choice.questionId] = choice.choice;
    });
    
    // Debug logging
    console.log('Movie prompt - userState choices array:', choicesArray);
    console.log('Movie prompt - converted choices object:', choices);
    
    const preferences = [];
    
    // Build preference description from choices
    if (choices.movie_mood === 'uplifting') {
      preferences.push('looking for something uplifting and feel-good');
    } else if (choices.movie_mood === 'intense') {
      preferences.push('wanting an intense, edge-of-seat experience');
    }
    
    if (choices.movie_genre_light === 'comedy') {
      preferences.push('enjoys comedies');
    } else if (choices.movie_genre_light === 'drama') {
      preferences.push('prefers heartwarming dramas');
    }
    
    if (choices.movie_genre_intense === 'thriller') {
      preferences.push('loves thrillers');
    } else if (choices.movie_genre_intense === 'scifi') {
      preferences.push('enjoys mind-bending sci-fi');
    }
    
    if (choices.movie_era_modern === 'recent') {
      preferences.push('wants recent releases (last 5 years)');
    } else if (choices.movie_era_modern === 'classic') {
      preferences.push('appreciates timeless classics');
    }
    
    if (choices.movie_commitment_light === 'quick') {
      preferences.push('needs something under 2 hours');
    } else if (choices.movie_commitment_light === 'epic') {
      preferences.push('ready for a longer epic');
    }
    
    if (choices.movie_reality_light === 'realistic') {
      preferences.push('prefers realistic, grounded stories');
    } else if (choices.movie_reality_light === 'fantasy') {
      preferences.push('enjoys escapist fantasy');
    }
    
    const preferenceString = preferences.length > 0 
      ? preferences.join(', ') 
      : 'has general movie preferences';
    
    return `You are a movie recommendation expert. Based on the user's preferences, suggest 5 DIFFERENT movies or TV shows.

User preferences: ${preferenceString}

User's specific choices were:
${JSON.stringify(choices, null, 2)}

${userState.excludedMovies && userState.excludedMovies.length > 0 ? `
EXCLUDED MOVIES (DO NOT RECOMMEND THESE):
${userState.excludedMovies.join(', ')}
` : ''}

IMPORTANT REQUIREMENTS:
- Each recommendation MUST be a DIFFERENT movie or show
- Do NOT recommend the same movie multiple times
- Provide variety even within the preference constraints
- Include both popular and lesser-known titles
${userState.excludedMovies && userState.excludedMovies.length > 0 ? '- NEVER recommend any movie from the excluded list above' : ''}

Provide recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "title": "Movie/Show Title",
      "year": 2024,
      "type": "movie" or "series",
      "genre": "Primary genre",
      "reason": "Why this matches their preferences (1-2 sentences)",
      "where_to_watch": "Netflix/Amazon/Theater/etc",
      "runtime": "120 min" or "8 episodes",
      "rating": "PG-13/R/TV-MA"
    }
  ],
  "explanation": "Brief explanation of recommendation strategy (1-2 sentences)"
}

Focus on:
1. Movies/shows that strongly match the stated preferences
2. FIVE UNIQUE titles - no duplicates
3. Mix of well-known and hidden gems
4. Available on major streaming platforms when possible
5. Variety within the preference constraints - different subgenres, tones, or styles`;
  }

  getBookPrompt(userState) {
    // Placeholder for book recommendations
    return this.getDefaultPromptTemplate(userState);
  }

  getRestaurantPrompt(userState) {
    // Placeholder for restaurant recommendations
    return this.getDefaultPromptTemplate(userState);
  }

  getDefaultPromptTemplate(userState) {
    const preferences = Object.entries(userState.userChoices || {})
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');
    
    return `Based on these preferences: ${preferences}, recommend 5 relevant content items.`;
  }

  async logDomainSelection(sessionId, domainId) {
    try {
      await this.db
        .prepare(`
          INSERT INTO interactions 
          (session_id, action, question_id, choice, timestamp, metadata)
          VALUES (?, 'domain_selected', NULL, ?, ?, ?)
        `)
        .bind(
          sessionId,
          domainId,
          Date.now(),
          JSON.stringify({ domain: domainId })
        )
        .run();
    } catch (error) {
      console.error('Error logging domain selection:', error);
    }
  }
}