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
          SELECT id, question_text, question_type, category, expected_info_gain, options
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
            SELECT id, question_text, question_type, category, expected_info_gain, options
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
        case 'series':
          return this.getSeriesPrompt(userState);
        case 'documentaries':
          return this.getDocumentaryPrompt(userState);
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

  getSeriesPrompt(userState) {
    const choicesArray = userState.getChoices ? userState.getChoices() : userState.choices || [];
    const choices = {};
    
    choicesArray.forEach(choice => {
      choices[choice.questionId] = choice.choice;
    });
    
    const preferences = [];
    
    // Build preference description from series-specific choices
    if (choices.series_commitment === 'long') {
      preferences.push('ready for multi-season commitment');
    } else if (choices.series_commitment === 'short') {
      preferences.push('wants limited series or miniseries');
    }
    
    if (choices.series_genre_long === 'fantasy') {
      preferences.push('loves epic fantasy/sci-fi sagas');
    } else if (choices.series_genre_long === 'crime') {
      preferences.push('enjoys gripping crime/drama series');
    }
    
    if (choices.series_genre_short === 'truecrime') {
      preferences.push('fascinated by true crime');
    } else if (choices.series_genre_short === 'thriller') {
      preferences.push('loves fictional thrillers');
    }
    
    if (choices.series_complete === 'complete') {
      preferences.push('wants completed series to binge');
    } else if (choices.series_complete === 'ongoing') {
      preferences.push('okay with ongoing series');
    }
    
    if (choices.series_intensity === 'light') {
      preferences.push('prefers light and fun shows');
    } else if (choices.series_intensity === 'dark') {
      preferences.push('enjoys dark and intense content');
    }
    
    if (choices.series_prestige === 'prestige') {
      preferences.push('wants award-winning prestige drama');
    } else if (choices.series_prestige === 'guilty') {
      preferences.push('loves addictive guilty pleasures');
    }
    
    const preferenceString = preferences.length > 0 
      ? preferences.join(', ') 
      : 'has general series preferences';
    
    const excludedList = [
      ...(userState.excludedMovies || []),
      ...(userState.excludedSeries || [])
    ];
    
    return `You are a TV series recommendation expert. Based on the user's preferences, suggest 5 DIFFERENT TV series.

User preferences: ${preferenceString}

User's specific choices were:
${JSON.stringify(choices, null, 2)}

${excludedList.length > 0 ? `
EXCLUDED SERIES (DO NOT RECOMMEND THESE):
${excludedList.join(', ')}
` : ''}

${userState.feedback ? `
USER FEEDBACK ON PREVIOUS RECOMMENDATIONS:
- LOVED (watched and absolutely loved): ${userState.feedback.loved?.join(', ') || 'none'}
- LIKED (watched and enjoyed): ${userState.feedback.liked?.join(', ') || 'none'}
- DISLIKED (watched but didn't enjoy): ${userState.feedback.disliked?.join(', ') || 'none'}

IMPORTANT: All these titles have been watched. 
- Strongly prioritize patterns from LOVED titles
- Consider patterns from LIKED titles
- Avoid patterns from DISLIKED titles
` : ''}

IMPORTANT REQUIREMENTS:
- Each recommendation MUST be a DIFFERENT TV series
- Focus on TV SERIES only, not movies
- Include number of seasons and episode count
- Mix of genres within their preferences
${excludedList.length > 0 ? '- NEVER recommend any series from the excluded list above' : ''}
${userState.feedback ? '- Learn from their feedback hierarchy (loved > liked > disliked) to improve recommendations' : ''}

Provide recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "title": "Series Title",
      "year": 2024,
      "type": "series",
      "genre": "Primary genre",
      "seasons": 3,
      "episodes": 24,
      "episode_length": "45 min",
      "status": "Completed" or "Ongoing",
      "reason": "Why this matches their preferences (1-2 sentences)",
      "where_to_watch": "Netflix/HBO/Amazon/etc",
      "rating": "TV-14/TV-MA"
    }
  ],
  "explanation": "Brief explanation of recommendation strategy (1-2 sentences)"
}

Focus on:
1. TV series that strongly match the stated preferences
2. FIVE UNIQUE series - no duplicates
3. Mix of popular and hidden gems
4. Clear information about season/episode commitment
5. Available on major streaming platforms`;
  }

  getDocumentaryPrompt(userState) {
    const choicesArray = userState.getChoices ? userState.getChoices() : userState.choices || [];
    const choices = {};
    
    choicesArray.forEach(choice => {
      choices[choice.questionId] = choice.choice;
    });
    
    const preferences = [];
    
    // Build preference description from documentary-specific choices
    if (choices.doc_purpose === 'learn') {
      preferences.push('wants to learn something new');
    } else if (choices.doc_purpose === 'emotional') {
      preferences.push('seeks emotional impact');
    }
    
    if (choices.doc_topic_edu === 'science') {
      preferences.push('interested in science/nature');
    } else if (choices.doc_topic_edu === 'history') {
      preferences.push('fascinated by history/politics');
    }
    
    if (choices.doc_topic_emo === 'inspiring') {
      preferences.push('loves inspiring human stories');
    } else if (choices.doc_topic_emo === 'truecrime') {
      preferences.push('drawn to true crime stories');
    }
    
    if (choices.doc_tone === 'uplifting') {
      preferences.push('prefers uplifting and hopeful tone');
    } else if (choices.doc_tone === 'dark') {
      preferences.push('okay with dark and challenging content');
    }
    
    if (choices.doc_length === 'feature') {
      preferences.push('wants feature-length documentaries');
    } else if (choices.doc_length === 'series') {
      preferences.push('prefers documentary series');
    }
    
    if (choices.doc_visual === 'important') {
      preferences.push('values stunning visuals');
    } else if (choices.doc_visual === 'content') {
      preferences.push('content over visual style');
    }
    
    const preferenceString = preferences.length > 0 
      ? preferences.join(', ') 
      : 'has general documentary preferences';
    
    const excludedList = [
      ...(userState.excludedMovies || []),
      ...(userState.excludedDocumentaries || [])
    ];
    
    return `You are a documentary recommendation expert. Based on the user's preferences, suggest 5 DIFFERENT documentaries.

User preferences: ${preferenceString}

User's specific choices were:
${JSON.stringify(choices, null, 2)}

${excludedList.length > 0 ? `
EXCLUDED DOCUMENTARIES (DO NOT RECOMMEND THESE):
${excludedList.join(', ')}
` : ''}

${userState.feedback ? `
USER FEEDBACK ON PREVIOUS RECOMMENDATIONS:
- LOVED (watched and absolutely loved): ${userState.feedback.loved?.join(', ') || 'none'}
- LIKED (watched and enjoyed): ${userState.feedback.liked?.join(', ') || 'none'}
- DISLIKED (watched but didn't enjoy): ${userState.feedback.disliked?.join(', ') || 'none'}

IMPORTANT: All these titles have been watched. 
- Strongly prioritize patterns from LOVED titles
- Consider patterns from LIKED titles
- Avoid patterns from DISLIKED titles
` : ''}

IMPORTANT REQUIREMENTS:
- Each recommendation MUST be a DIFFERENT documentary
- Focus on DOCUMENTARIES only, not fictional content
- Include runtime and year of release
- Variety of topics within their preferences
${excludedList.length > 0 ? '- NEVER recommend any documentary from the excluded list above' : ''}
${userState.feedback ? '- Learn from their feedback hierarchy (loved > liked > disliked) to improve recommendations' : ''}

Provide recommendations in this exact JSON format:
{
  "recommendations": [
    {
      "title": "Documentary Title",
      "year": 2024,
      "type": "documentary",
      "genre": "Nature/History/True Crime/etc",
      "runtime": "90 min" or "6 episodes",
      "topic": "Specific topic covered",
      "style": "Traditional/Investigative/Observational",
      "reason": "Why this matches their preferences (1-2 sentences)",
      "where_to_watch": "Netflix/YouTube/Disney+/etc",
      "rating": "PG/PG-13/R"
    }
  ],
  "explanation": "Brief explanation of recommendation strategy (1-2 sentences)"
}

Focus on:
1. Documentaries that strongly match the stated preferences
2. FIVE UNIQUE documentaries - no duplicates
3. Mix of acclaimed and lesser-known films
4. Clear information about topic and style
5. Available on major streaming platforms`;
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