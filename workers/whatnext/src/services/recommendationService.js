// src/services/recommendationService.js
import { PromptBuilder } from './promptBuilder.js';
import { CircuitBreaker } from '../utils/circuitBreaker.js';

export class RecommendationService {
  constructor(env) {
    this.env = env;
    this.promptBuilder = new PromptBuilder(env);
    this.circuitBreaker = new CircuitBreaker(5, 60000); // 5 failures, 1 minute timeout
    this.claudeApiKey = env.CLAUDE_API_KEY;
    this.claudeEndpoint = env.CLAUDE_API_ENDPOINT || 'https://api.anthropic.com/v1/messages';
  }

  /**
   * Get final recommendations based on user state
   */
  async getFinalRecommendations(userState) {
    try {
      // Check cache first
      const cacheKey = userState.generateCacheKey();
      const cached = await this.getCachedRecommendations(cacheKey);
      
      if (cached) {
        console.log('Cache hit for recommendations');
        return cached;
      }

      console.log('Attempting Claude API call...');
      console.log('Claude API Key exists:', !!this.claudeApiKey);
      console.log('Claude Endpoint:', this.claudeEndpoint);
      
      // Try Claude API with circuit breaker
      const recommendations = await this.circuitBreaker.execute(
        () => this.getClaudeRecommendations(userState)
      );

      // Cache the results
      await this.cacheRecommendations(cacheKey, recommendations);
      
      return recommendations;

    } catch (error) {
      console.error('Failed to get Claude recommendations:', error.message);
      console.error('Error details:', {
        name: error.name,
        stack: error.stack?.split('\n')[0],
        claudeKeySet: !!this.claudeApiKey
      });
      
      // Fallback to rule-based recommendations
      return await this.getFallbackRecommendations(userState);
    }
  }

  /**
   * Get recommendations from Claude API
   */
  async getClaudeRecommendations(userState) {
    console.log('Building Claude prompt...');
    const prompt = this.promptBuilder.buildRecommendationPrompt(userState);
    const request = this.promptBuilder.buildClaudeRequest(prompt);
    
    console.log('Making Claude API request...');
    console.log('Request size:', JSON.stringify(request).length, 'bytes');

    const response = await fetch(this.claudeEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.claudeApiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(request)
    });

    console.log('Claude API response status:', response.status);
    
    if (!response.ok) {
      const error = await response.text();
      console.error('Claude API error response:', error.substring(0, 200));
      throw new Error(`Claude API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    
    // Parse Claude's response
    const content = data.content[0].text;
    let parsedContent;
    
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse Claude response:', content);
      throw new Error('Invalid response format from Claude');
    }

    // Add metadata to recommendations
    const recommendations = parsedContent.recommendations.map(rec => ({
      ...rec,
      generatedAt: Date.now(),
      sessionId: userState.sessionId,
      source: 'claude_api'
    }));

    return {
      recommendations,
      reasoning: parsedContent.reasoning,
      timeSaved: this.calculateTimeSaved(userState),
      sessionStats: this.getSessionStats(userState)
    };
  }

  /**
   * Fallback rule-based recommendations
   */
  async getFallbackRecommendations(userState) {
    const choices = userState.getChoices();
    const cognitiveLoad = userState.getCognitiveLoadPreference();
    const contentFormat = userState.getContentFormatPreference();
    const timeCommitment = userState.getTimeCommitmentPreference();
    
    const recommendations = [];

    // High cognitive load recommendations
    if (cognitiveLoad === 'high') {
      if (contentFormat === 'video' || contentFormat === 'flexible') {
        recommendations.push({
          title: "The Art of Code",
          description: "A fascinating talk about programming as a creative art form that will challenge your thinking about software development.",
          duration: "60 minutes",
          type: "video",
          source: "YouTube",
          url: "https://www.youtube.com/results?search_query=dylan+beattie+art+of+code",
          searchTerms: "Dylan Beattie Art of Code",
          matchReason: "High cognitive challenge + programming concepts",
          confidence: 0.75
        });
      }
      
      if (contentFormat === 'text' || contentFormat === 'flexible') {
        recommendations.push({
          title: "A Mathematical Theory of Communication",
          description: "Claude Shannon's foundational paper on information theory - the basis of all modern communication systems.",
          duration: "2-3 hours",
          type: "article",
          source: "Bell System Technical Journal",
          url: "http://people.math.harvard.edu/~ctm/home/text/others/shannon/entropy/entropy.pdf",
          searchTerms: "Claude Shannon Mathematical Theory Communication PDF",
          matchReason: "Deep intellectual content + foundational concepts",
          confidence: 0.70
        });
      }
    }
    
    // Low cognitive load recommendations
    if (cognitiveLoad === 'low') {
      if (contentFormat === 'video' || contentFormat === 'flexible') {
        recommendations.push({
          title: "Kurzgesagt – In a Nutshell",
          description: "Beautifully animated videos explaining complex topics in simple, entertaining ways.",
          duration: "10-15 minutes",
          type: "video",
          source: "YouTube",
          url: "https://www.youtube.com/c/inanutshell",
          searchTerms: "Kurzgesagt latest videos",
          matchReason: "Entertaining + educational without heavy effort",
          confidence: 0.80
        });
      }
      
      if (timeCommitment === 'quick') {
        recommendations.push({
          title: "TED-Ed Riddles",
          description: "Quick, fun riddles and puzzles that entertain while gently exercising your brain.",
          duration: "5-10 minutes",
          type: "video",
          source: "YouTube",
          url: "https://www.youtube.com/results?search_query=ted-ed+riddles",
          searchTerms: "TED-Ed riddles playlist",
          matchReason: "Quick + entertaining + light mental engagement",
          confidence: 0.85
        });
      }
    }

    // Add a wildcard recommendation
    recommendations.push({
      title: "Exploratorium Online",
      description: "Interactive science exhibits and experiments you can try at home - perfect for hands-on learning.",
      duration: "Variable",
      type: "interactive",
      source: "Exploratorium",
      url: "https://www.exploratorium.edu/explore",
      searchTerms: "Exploratorium online exhibits",
      matchReason: "Interactive + educational + flexible engagement",
      confidence: 0.65
    });

    // Ensure we have at least 3 recommendations
    while (recommendations.length < 3) {
      recommendations.push({
        title: "Wikipedia Random Article",
        description: "Discover something completely unexpected - perfect for curiosity-driven exploration.",
        duration: "5-30 minutes",
        type: "article",
        source: "Wikipedia",
        url: "https://en.wikipedia.org/wiki/Special:Random",
        searchTerms: "Wikipedia random article",
        matchReason: "Serendipitous discovery",
        confidence: 0.60
      });
    }

    return {
      recommendations: recommendations.slice(0, 3),
      reasoning: "Fallback recommendations based on your preferences. These are curated suggestions that match your indicated interests.",
      timeSaved: this.calculateTimeSaved(userState),
      sessionStats: this.getSessionStats(userState),
      source: 'fallback'
    };
  }

  /**
   * Get cached recommendations if available
   */
  async getCachedRecommendations(cacheKey) {
    try {
      const cached = await this.env.RECOMMENDATION_CACHE.get(cacheKey);
      
      if (cached) {
        const data = JSON.parse(cached);
        
        // Check if cache is still valid (6 hours)
        if (Date.now() - data.generatedAt < 6 * 60 * 60 * 1000) {
          // Update cache hit count
          data.cacheHits = (data.cacheHits || 0) + 1;
          await this.env.RECOMMENDATION_CACHE.put(cacheKey, JSON.stringify(data), {
            expirationTtl: 21600 // 6 hours
          });
          
          return data;
        }
      }
    } catch (error) {
      console.error('Cache retrieval error:', error);
    }
    
    return null;
  }

  /**
   * Cache recommendations for future use
   */
  async cacheRecommendations(cacheKey, recommendations) {
    try {
      const cacheData = {
        ...recommendations,
        generatedAt: Date.now(),
        expiresAt: Date.now() + (6 * 60 * 60 * 1000),
        cacheHits: 0
      };
      
      await this.env.RECOMMENDATION_CACHE.put(
        cacheKey,
        JSON.stringify(cacheData),
        { expirationTtl: 21600 } // 6 hours
      );
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  /**
   * Calculate estimated time saved by using the recommendation engine
   */
  calculateTimeSaved(userState) {
    const choices = userState.getChoices();
    const sessionDuration = userState.getSessionDuration();
    
    // Estimate: average user spends 15-30 minutes browsing for content
    const averageBrowsingTime = 22.5 * 60 * 1000; // 22.5 minutes in ms
    const ourTime = sessionDuration;
    
    const timeSaved = Math.max(0, averageBrowsingTime - ourTime);
    const minutesSaved = Math.round(timeSaved / 60000);
    
    return `~${minutesSaved} minutes of browsing`;
  }

  /**
   * Get session statistics
   */
  getSessionStats(userState) {
    const choices = userState.getChoices();
    const metrics = userState.getEngagementMetrics();
    
    return {
      questionsAsked: choices.length,
      totalTime: Math.round(userState.getSessionDuration() / 1000), // seconds
      avgResponseTime: Math.round(metrics.avgResponseTime / 1000 * 10) / 10, // seconds with 1 decimal
      engagement: metrics.engagement
    };
  }

  /**
   * Verify recommendations are accessible (future enhancement)
   */
  async verifyRecommendations(recommendations) {
    // This could check if URLs are still valid, content is available, etc.
    // For now, just return as-is
    return recommendations;
  }

  /**
   * Track recommendation performance for learning
   */
  async logRecommendationGeneration(userState, recommendations, source) {
    try {
      await this.env.DB.prepare(
        'INSERT INTO interactions (session_id, action, timestamp, metadata) VALUES (?, ?, ?, ?)'
      ).bind(
        userState.sessionId,
        'recommendations_generated',
        Date.now(),
        JSON.stringify({
          source,
          recommendationCount: recommendations.length,
          questionsAsked: userState.getChoices().length,
          sessionDuration: userState.getSessionDuration()
        })
      ).run();
    } catch (error) {
      console.error('Failed to log recommendation generation:', error);
    }
  }
}