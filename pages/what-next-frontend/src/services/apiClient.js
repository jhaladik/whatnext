// API Client for What Next Backend
class WhatNextAPI {
  constructor() {
    this.baseURL = import.meta.env.VITE_API_URL || 'https://what-next-prod.jhaladik.workers.dev';
    this.sessionId = null;
  }

  async startSession(domain = 'movies', excludedMovies = []) {
    try {
      const response = await fetch(`${this.baseURL}/api/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          domain,
          excludedMovies: excludedMovies.length > 0 ? excludedMovies : undefined
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      this.sessionId = data.sessionId;
      return data;
    } catch (error) {
      console.error('Failed to start session:', error);
      throw error;
    }
  }

  async getAvailableDomains() {
    try {
      const response = await fetch(`${this.baseURL}/api/domains`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Failed to get domains:', error);
      throw error;
    }
  }

  async selectDomain(sessionId, domain) {
    try {
      const response = await fetch(`${this.baseURL}/api/domain`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, domain })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Failed to select domain:', error);
      throw error;
    }
  }

  async submitChoice(questionId, choice, responseTime = 2000) {
    if (!this.sessionId) {
      throw new Error('No active session. Please start a session first.');
    }
    
    try {
      const response = await fetch(`${this.baseURL}/api/swipe/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          questionId,
          choice,
          responseTime
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Failed to submit choice:', error);
      throw error;
    }
  }

  async getMoreRecommendations(sessionId, excludedMovies) {
    try {
      const response = await fetch(`${this.baseURL}/api/more-recommendations/${sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedMovies })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Failed to get more recommendations:', error);
      throw error;
    }
  }

  async submitFeedback(rating, feedback) {
    if (!this.sessionId) {
      throw new Error('No active session.');
    }
    
    try {
      const response = await fetch(`${this.baseURL}/api/feedback/${this.sessionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rating,
          feedback
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      return response.json();
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      throw error;
    }
  }

  resetSession() {
    this.sessionId = null;
  }
}

export default new WhatNextAPI();