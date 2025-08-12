// src/models/userState.js
export class UserState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.choices = [];
    this.startTime = Date.now();
    this.deviceType = null;
    this.userAgent = null;
    this.contextualInfo = {};
    this.vector = null; // For future vector-based implementation
  }

  /**
   * Add a user choice to the state
   */
  addChoice(questionId, choice, metadata = {}) {
    this.choices.push({
      questionId,
      choice,
      timestamp: Date.now(),
      responseTime: this.calculateResponseTime(),
      metadata
    });
  }

  /**
   * Get all user choices
   */
  getChoices() {
    return [...this.choices];
  }

  /**
   * Get session duration in milliseconds
   */
  getSessionDuration() {
    return Date.now() - this.startTime;
  }

  /**
   * Calculate progress through decision tree (0-100)
   */
  getProgress() {
    const maxQuestions = 6; // From environment or config
    return Math.min(100, (this.choices.length / maxQuestions) * 100);
  }

  /**
   * Get the most recent choice
   */
  getLastChoice() {
    return this.choices[this.choices.length - 1] || null;
  }

  /**
   * Check if user has made a specific choice
   */
  hasChoice(questionId, choice = null) {
    const questionChoices = this.choices.filter(c => c.questionId === questionId);
    if (choice === null) {
      return questionChoices.length > 0;
    }
    return questionChoices.some(c => c.choice === choice);
  }

  /**
   * Get choice for specific question
   */
  getChoice(questionId) {
    const choice = this.choices.find(c => c.questionId === questionId);
    return choice ? choice.choice : null;
  }

  /**
   * Set contextual information
   */
  setContext(key, value) {
    this.contextualInfo[key] = value;
  }

  /**
   * Get contextual information
   */
  getContext(key = null) {
    if (key) {
      return this.contextualInfo[key];
    }
    return { ...this.contextualInfo };
  }

  /**
   * Calculate response time for last question
   */
  calculateResponseTime() {
    if (this.choices.length === 0) {
      return Date.now() - this.startTime;
    }
    
    const lastChoice = this.choices[this.choices.length - 1];
    return Date.now() - lastChoice.timestamp;
  }

  /**
   * Get user's cognitive load preference
   */
  getCognitiveLoadPreference() {
    const cognitiveChoice = this.getChoice('cognitive_engagement');
    if (cognitiveChoice === 'challenge') return 'high';
    if (cognitiveChoice === 'entertain') return 'low';
    return 'unknown';
  }

  /**
   * Get user's preferred content format
   */
  getContentFormatPreference() {
    return this.getChoice('content_format') || 'flexible';
  }

  /**
   * Get user's time commitment preference
   */
  getTimeCommitmentPreference() {
    return this.getChoice('time_commitment') || 'flexible';
  }

  /**
   * Get user's novelty preference
   */
  getNoveltyPreference() {
    return this.getChoice('novelty_preference') || 'balanced';
  }

  /**
   * Calculate information entropy remaining in user preferences
   */
  calculateRemainingEntropy() {
    // Simplified entropy calculation
    // In practice, this would be more sophisticated
    const totalPossiblePreferences = 8; // Number of major preference dimensions
    const resolvedPreferences = this.choices.length;
    const entropyReductionPerChoice = 0.4;
    
    const initialEntropy = Math.log2(totalPossiblePreferences);
    const currentEntropy = Math.max(0, initialEntropy - (resolvedPreferences * entropyReductionPerChoice));
    
    return currentEntropy;
  }

  /**
   * Generate preference vector for future ML implementation
   */
  generatePreferenceVector() {
    // This will be used when we migrate to vector-based approach
    const vector = new Array(128).fill(0); // 128-dimensional vector
    
    // Encode choices into vector
    this.choices.forEach((choice, index) => {
      const questionHash = this.hashString(choice.questionId) % 64;
      const choiceHash = this.hashString(choice.choice) % 64;
      
      vector[questionHash] = 1;
      vector[64 + choiceHash] = 1;
    });
    
    // Add contextual information
    const timeOfDay = new Date().getHours() / 24;
    const dayOfWeek = new Date().getDay() / 7;
    const sessionDuration = Math.min(1, this.getSessionDuration() / (5 * 60 * 1000)); // Normalize to 5 minutes
    
    // Use last few dimensions for context
    vector[125] = timeOfDay;
    vector[126] = dayOfWeek;
    vector[127] = sessionDuration;
    
    this.vector = vector;
    return vector;
  }

  /**
   * Simple hash function for strings
   */
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Export state to JSON for storage
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      choices: this.choices,
      startTime: this.startTime,
      deviceType: this.deviceType,
      userAgent: this.userAgent,
      contextualInfo: this.contextualInfo,
      vector: this.vector
    };
  }

  /**
   * Create UserState from JSON
   */
  static fromJSON(data) {
    const userState = new UserState(data.sessionId);
    userState.choices = data.choices || [];
    userState.startTime = data.startTime;
    userState.deviceType = data.deviceType;
    userState.userAgent = data.userAgent;
    userState.contextualInfo = data.contextualInfo || {};
    userState.vector = data.vector;
    
    return userState;
  }

  /**
   * Generate cache key for this user's preference profile
   */
  generateCacheKey() {
    const sortedChoices = this.choices
      .map(c => `${c.questionId}:${c.choice}`)
      .sort()
      .join('|');
    
    const contextKey = [
      this.deviceType || 'unknown',
      new Date().getHours() > 17 ? 'evening' : 'day'
    ].join('|');
    
    return `recommendations:${this.hashString(sortedChoices + contextKey)}`;
  }

  /**
   * Check if user is likely to be satisfied with current information
   */
  isReadyForRecommendations() {
    const entropy = this.calculateRemainingEntropy();
    const choiceCount = this.choices.length;
    
    // Ready if entropy is low enough OR we've asked enough questions
    return entropy < 0.3 || choiceCount >= 5;
  }

  /**
   * Get user engagement metrics for optimization
   */
  getEngagementMetrics() {
    if (this.choices.length === 0) {
      return {
        avgResponseTime: 0,
        consistency: 0,
        engagement: 'new'
      };
    }

    const responseTimes = this.choices.map(c => c.responseTime || 5000);
    const avgResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
    
    // Measure consistency in response times
    const responseTimeVariance = responseTimes.reduce((sum, time) => {
      return sum + Math.pow(time - avgResponseTime, 2);
    }, 0) / responseTimes.length;
    
    const consistency = 1 / (1 + Math.sqrt(responseTimeVariance) / 1000); // Normalize
    
    let engagement = 'low';
    if (avgResponseTime > 3000 && avgResponseTime < 15000) engagement = 'high';
    else if (avgResponseTime > 1000) engagement = 'medium';
    
    return {
      avgResponseTime,
      consistency,
      engagement
    };
  }
}