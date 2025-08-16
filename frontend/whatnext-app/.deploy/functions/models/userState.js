// src/models/userState.js
export class UserState {
  constructor(sessionId) {
    this.sessionId = sessionId;
    this.choices = [];
    this.startTime = Date.now();
    this.deviceType = null;
    this.userAgent = null;
    this.contextualInfo = {};
    this.domain = 'movies';
    this.currentQuestionIndex = 0;
    this.totalQuestions = 5;
    this.recommendationsGeneratedAt = null;
    this.context = {};
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
   * Calculate progress through questions (0-100)
   */
  getProgress() {
    return Math.min(100, (this.currentQuestionIndex / this.totalQuestions) * 100);
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
   * Check if session is expired
   */
  isExpired(timeoutSeconds = 3600) {
    const ageSeconds = (Date.now() - this.startTime) / 1000;
    return ageSeconds > timeoutSeconds;
  }

  /**
   * Get answers as a map
   */
  getAnswersMap() {
    const answers = {};
    this.choices.forEach(choice => {
      answers[choice.questionId] = choice.choice;
    });
    return answers;
  }

  /**
   * Check if ready for recommendations
   */
  isReadyForRecommendations() {
    return this.currentQuestionIndex >= this.totalQuestions;
  }

  /**
   * Serialize for storage
   */
  toJSON() {
    return {
      sessionId: this.sessionId,
      choices: this.choices,
      startTime: this.startTime,
      deviceType: this.deviceType,
      userAgent: this.userAgent,
      contextualInfo: this.contextualInfo,
      domain: this.domain,
      currentQuestionIndex: this.currentQuestionIndex,
      totalQuestions: this.totalQuestions,
      recommendationsGeneratedAt: this.recommendationsGeneratedAt,
      context: this.context
    };
  }

  /**
   * Create from JSON
   */
  static fromJSON(data) {
    const state = new UserState(data.sessionId);
    Object.assign(state, data);
    return state;
  }
}