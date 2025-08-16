import { z } from 'zod';

// Types
export interface StartSessionOptions {
  domain?: 'movies' | 'tv-series';
  questionFlow?: 'standard' | 'quick' | 'deep' | 'surprise' | 'visual';
  context?: Record<string, any>;
}

export interface Question {
  id: string;
  text: string;
  type: 'standard' | 'visual' | 'creative' | 'quick';
  options: Array<{
    id: string;
    text?: string;
    emoji?: string;
    image?: string;
    vector?: Record<string, number>;
  }>;
  order: number;
}

export interface Movie {
  movieId: string;
  title: string;
  poster?: string;
  backdrop?: string;
  year: number;
  rating: number;
  genres: string[];
  overview: string;
  runtime?: number;
  director?: string;
  cast?: Array<{
    name: string;
    character: string;
    order: number;
    profile_path?: string;
  }>;
  tagline?: string;
  trailer_key?: string;
  budget?: number;
  revenue?: number;
  streaming_providers?: Array<any>;
  isSurprise?: boolean;
  surpriseReason?: string;
  streamingOn?: Array<{ name: string; logo: string }>;
  popularity?: number;
  voteCount?: number;
  releaseDate?: string;
}

export interface MomentSummary {
  description: string;
  emoji: string;
  confidence: number;
  visualization: {
    dimensions: Array<{ axis: string; value: number }>;
    color: string;
  };
}

export interface SessionResponse {
  sessionId: string;
  domain: string;
  greeting: string;
  question: Question;
  progress: { current: number; total: number };
  flowType: string;
  context: Record<string, any>;
}

export interface RecommendationsResponse {
  type: 'recommendations';
  recommendations: Movie[];
  moment: MomentSummary;
  validation: {
    message: {
      type: string;
      title: string;
      subtitle: string;
      emoji: string;
    };
    overallScore: number;
  };
  sessionId: string;
  canRefine: boolean;
  quickAdjustments: Array<{
    id: string;
    label: string;
    icon: string;
  }>;
}

class MovieRecommendationAPI {
  private baseURL: string;
  private sessionId: string | null = null;

  constructor() {
    // Use relative URLs for Pages Functions (same domain)
    // In development, this will be localhost:8788
    // In production, this will be the Pages domain
    this.baseURL = '';
    console.log('[API] Using Pages Functions (same domain)');
  }

  // Session Management
  async startSession(options?: StartSessionOptions): Promise<SessionResponse> {
    console.log('[API] Starting session with URL:', `${this.baseURL}/api/movies/start`);
    console.log('[API] Options:', options);
    
    const response = await fetch(`${this.baseURL}/api/movies/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options || {})
    });
    
    console.log('[API] Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[API] Error response:', errorText);
      throw new Error(`Failed to start session: ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('[API] Response data:', data);
    this.sessionId = data.sessionId;
    return data;
  }

  // Answer submission
  async submitAnswer(questionId: string, answer: string, responseTime?: number) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/answer/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ questionId, answer, responseTime })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to submit answer: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Refinement
  async refineRecommendations(feedback: Array<{
    movieId: string;
    reaction: 'like' | 'dislike' | 'neutral';
  }>, action?: string) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/refine/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedback, action })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to refine recommendations: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Quick adjustments
  async quickAdjust(adjustmentType: 'lighter' | 'deeper' | 'weirder' | 'safer' | 'shorter' | 'longer') {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/adjust/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adjustmentType })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to adjust: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Validation & Feedback
  async validateMoment(feedbackType: string, userResponse: any) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/validate/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackType, response: userResponse })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to validate moment: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get moment summary
  async getMomentSummary() {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/moment/${this.sessionId}`
    );
    
    if (!response.ok) {
      throw new Error(`Failed to get moment summary: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Track interaction
  async trackInteraction(movieId: string, interactionType: string, metadata?: any) {
    if (!this.sessionId) throw new Error('No active session');
    
    const response = await fetch(
      `${this.baseURL}/api/movies/interaction/${this.sessionId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ movieId, interactionType, metadata })
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to track interaction: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Get movie details
  async getMovieDetails(movieId: string) {
    const response = await fetch(`${this.baseURL}/api/movies/${movieId}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get movie details: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Analytics endpoints
  async getAnalytics(type: 'questions' | 'sessions' | 'clusters' | 'temporal' | 'recommendations' | 'drift' | 'insights') {
    const response = await fetch(`${this.baseURL}/api/analytics/${type}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get analytics: ${response.statusText}`);
    }
    
    return response.json();
  }

  // Set session ID (for resuming sessions)
  setSessionId(sessionId: string) {
    this.sessionId = sessionId;
  }

  // Get current session ID
  getSessionId() {
    return this.sessionId;
  }

  // Clear session
  clearSession() {
    this.sessionId = null;
  }
}

export const api = new MovieRecommendationAPI();