// src/services/promptBuilder.js
export class PromptBuilder {
  constructor(env) {
    this.env = env;
    this.claudeModel = env.CLAUDE_MODEL || 'claude-sonnet-4-20250514';
  }

  /**
   * Build Claude prompt for final recommendations based on user preferences
   */
  buildRecommendationPrompt(userState) {
    const choices = userState.getChoices();
    const preferenceProfile = this.analyzePreferences(choices);
    
    const prompt = `Based on the following user preference analysis, provide exactly 3 highly targeted content recommendations.

USER PREFERENCE PROFILE:
${this.formatPreferenceProfile(preferenceProfile)}

DECISION PATH:
${this.formatDecisionPath(choices)}

CONTEXT:
- Current time: ${new Date().toISOString()}
- Session duration: ${userState.getSessionDuration()} seconds
- User engagement level: ${this.inferEngagementLevel(userState)}

REQUIREMENTS:
1. Provide exactly 3 recommendations
2. Each recommendation must include:
   - Title (specific and clickable)
   - Description (2-3 sentences explaining why it matches their preferences)
   - Estimated duration/length
   - Content type (video, article, podcast, etc.)
   - Source/platform where it can be found
   - Direct URL/search terms if possible

3. Recommendations should be:
   - Available and accessible right now
   - Diverse enough to give options but unified in matching their preferences
   - Current/recent content (published within last 2 years unless asking for classics)
   - Optimized for their stated cognitive load and time commitment

4. Focus on content that's actually discoverable through search rather than platform-specific content behind paywalls

RESPONSE FORMAT:
Respond only with valid JSON in this exact format:

{
  "recommendations": [
    {
      "title": "specific title here",
      "description": "why this matches their preferences and what they'll get from it",
      "duration": "estimated time commitment",
      "type": "video/article/podcast/etc",
      "source": "platform or website",
      "searchTerms": "terms to find this content",
      "url": "direct URL if available or null",
      "matchReason": "specific preference elements this satisfies"
    }
  ],
  "reasoning": "brief explanation of the recommendation strategy for this user profile"
}

DO NOT OUTPUT ANYTHING OTHER THAN VALID JSON. Your entire response must be parseable JSON.`;

    return prompt;
  }

  /**
   * Analyze user choices to create preference profile
   */
  analyzePreferences(choices) {
    const profile = {
      cognitiveLoad: 'unknown',
      contentFormat: 'flexible',
      timeCommitment: 'flexible',
      noveltyPreference: 'balanced',
      socialContext: 'personal',
      learningOrientation: 'unknown'
    };

    choices.forEach(choice => {
      switch (choice.questionId) {
        case 'cognitive_engagement':
          profile.cognitiveLoad = choice.choice === 'challenge' ? 'high' : 'low';
          break;
        
        case 'learning_depth':
          profile.learningOrientation = choice.choice === 'new' ? 'exploration' : 'expertise';
          break;
        
        case 'content_format':
          profile.contentFormat = choice.choice; // 'video' or 'text'
          break;
        
        case 'time_commitment':
          profile.timeCommitment = choice.choice; // 'quick' or 'substantial'
          break;
        
        case 'engagement_type':
          profile.engagementStyle = choice.choice; // 'interactive' or 'passive'
          break;
        
        case 'novelty_preference':
          profile.noveltyPreference = choice.choice; // 'familiar' or 'surprise'
          break;
        
        case 'social_context':
          profile.socialContext = choice.choice; // 'personal' or 'social'
          break;
      }
    });

    return profile;
  }

  /**
   * Format preference profile for Claude prompt
   */
  formatPreferenceProfile(profile) {
    const formatMap = {
      cognitiveLoad: {
        high: 'User wants intellectually challenging content that requires active thinking and mental effort',
        low: 'User wants entertaining content they can enjoy without heavy mental effort'
      },
      contentFormat: {
        video: 'Strong preference for video/visual content over text',
        text: 'Preference for text-based content (articles, essays, books)',
        flexible: 'No strong format preference'
      },
      timeCommitment: {
        quick: 'Wants something quick (under 20 minutes) - bite-sized content',
        substantial: 'Ready for longer-form, substantial content that takes time to consume',
        flexible: 'Flexible on time commitment'
      },
      learningOrientation: {
        exploration: 'Wants to learn something completely new - expand knowledge into new areas',
        expertise: 'Wants to go deeper into familiar topics - build on existing knowledge',
        unknown: 'Learning orientation not specified'
      },
      noveltyPreference: {
        familiar: 'Prefers familiar, comforting content in known genres/topics',
        surprise: 'Open to pleasant surprises and discovering new things',
        balanced: 'Balanced approach to novelty'
      },
      socialContext: {
        personal: 'Content for personal consumption - individual experience',
        social: 'Content that can be shared or discussed with others',
        flexible: 'No strong social context preference'
      }
    };

    let formatted = '';
    Object.entries(profile).forEach(([key, value]) => {
      if (formatMap[key] && formatMap[key][value]) {
        formatted += `- ${formatMap[key][value]}\n`;
      }
    });

    return formatted;
  }

  /**
   * Format the user's decision path for context
   */
  formatDecisionPath(choices) {
    if (choices.length === 0) {
      return 'No choices made';
    }

    return choices.map((choice, index) => 
      `${index + 1}. ${this.getQuestionText(choice.questionId)} → ${this.getChoiceText(choice.questionId, choice.choice)}`
    ).join('\n');
  }

  /**
   * Get human-readable question text
   */
  getQuestionText(questionId) {
    const questionMap = {
      'cognitive_engagement': 'Challenge mind vs Entertain without effort',
      'learning_depth': 'Learn something new vs Go deeper',
      'content_format': 'Video vs Text content',
      'time_commitment': 'Quick vs Substantial time commitment',
      'engagement_type': 'Interactive vs Passive engagement',
      'novelty_preference': 'Familiar vs Surprising content',
      'social_context': 'Personal vs Social content'
    };
    
    return questionMap[questionId] || questionId;
  }

  /**
   * Get human-readable choice text
   */
  getChoiceText(questionId, choice) {
    const choiceMap = {
      'cognitive_engagement': { challenge: 'Challenge mind', entertain: 'Entertain without effort' },
      'learning_depth': { new: 'Learn something new', deeper: 'Go deeper' },
      'content_format': { video: 'Video content', text: 'Text content' },
      'time_commitment': { quick: 'Quick (under 20 min)', substantial: 'Substantial' },
      'engagement_type': { interactive: 'Interactive', passive: 'Passive' },
      'novelty_preference': { familiar: 'Familiar/comforting', surprise: 'Pleasant surprise' },
      'social_context': { personal: 'Personal', social: 'Social/shareable' }
    };
    
    return choiceMap[questionId]?.[choice] || choice;
  }

  /**
   * Infer user engagement level from interaction patterns
   */
  inferEngagementLevel(userState) {
    const choices = userState.getChoices();
    const sessionDuration = userState.getSessionDuration();
    
    // Quick heuristic based on time spent per choice
    if (choices.length === 0) return 'new_user';
    
    const avgTimePerChoice = sessionDuration / choices.length;
    
    if (avgTimePerChoice > 15000) return 'thoughtful'; // >15 seconds per choice
    if (avgTimePerChoice > 5000) return 'engaged';     // 5-15 seconds per choice
    return 'quick_decision';                           // <5 seconds per choice
  }

  /**
   * Build the complete Claude API request
   */
  buildClaudeRequest(prompt) {
    return {
      model: this.claudeModel,
      max_tokens: 1000,
      messages: [
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.3, // Lower temperature for more focused recommendations
      system: "You are a highly intelligent recommendation engine that understands user preferences through information theory. You provide specific, actionable, and currently available content recommendations that precisely match user preferences."
    };
  }

  /**
   * Build search verification prompt to ensure recommendations are findable
   */
  buildVerificationPrompt(recommendations) {
    return `Verify that these content recommendations are currently findable and accessible. For each recommendation, provide updated search terms or URLs if needed:

${JSON.stringify(recommendations, null, 2)}

Requirements:
1. Ensure each recommendation is currently available and findable
2. Update search terms to be more specific if needed
3. Add direct URLs where possible
4. Flag any recommendations that may not be easily accessible

Respond with the same JSON structure, updated with verified/improved details.`;
  }
}