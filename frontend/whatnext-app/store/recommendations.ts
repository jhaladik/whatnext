import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { api, Question, Movie, MomentSummary, StartSessionOptions } from '@/services/api/client';

interface RecommendationState {
  // Session
  sessionId: string | null;
  domain: 'movies' | 'tv-series';
  questionFlow: string;
  
  // Questions
  questions: Question[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  
  // Recommendations
  recommendations: Movie[];
  moment: MomentSummary | null;
  validation: any;
  emotionalProfile: any;
  
  // UI State
  isLoading: boolean;
  error: string | null;
  
  // Actions
  startSession: (options?: StartSessionOptions) => Promise<void>;
  submitAnswer: (questionId: string, answer: string, responseTime?: number) => Promise<void>;
  refineRecommendations: (feedback: any) => Promise<void>;
  quickAdjust: (type: string) => Promise<void>;
  validateMoment: (feedback: any) => Promise<void>;
  trackInteraction: (movieId: string, type: string) => Promise<void>;
  loadFromStorage: (data: any) => void;
  reset: () => void;
}

export const useRecommendationStore = create<RecommendationState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial state
        sessionId: null,
        domain: 'movies',
        questionFlow: 'standard',
        questions: [],
        currentQuestionIndex: 0,
        answers: {},
        recommendations: [],
        moment: null,
        validation: null,
        emotionalProfile: null,
        isLoading: false,
        error: null,

        // Start new session
        startSession: async (options = {}) => {
          console.log('[Store] Starting session with options:', options);
          set({ isLoading: true, error: null });
          
          // Clear ALL old session data first
          if (typeof window !== 'undefined') {
            // Clear sessionStorage
            sessionStorage.removeItem('whatnext_session_id');
            sessionStorage.removeItem('whatnext_session_data');
            sessionStorage.removeItem('recommendations_data');
            sessionStorage.removeItem('session_id');
            
            // Clear localStorage debug data
            localStorage.removeItem('debug_recommendations');
            localStorage.removeItem('debug_sessionId');
            
            console.log('[Store] Cleared all old session data');
          }
          
          try {
            console.log('[Store] Calling API...');
            const response = await api.startSession(options);
            console.log('[Store] API Response:', response);
            
            // Store in sessionStorage for persistence across navigation
            if (typeof window !== 'undefined') {
              sessionStorage.setItem('whatnext_session_id', response.sessionId);
              sessionStorage.setItem('whatnext_session_data', JSON.stringify({
                questions: [response.question],
                domain: response.domain,
                flowType: response.flowType
              }));
              console.log('[Store] Saved NEW session to sessionStorage');
            }
            
            set({
              sessionId: response.sessionId,
              questions: [response.question],
              currentQuestionIndex: 0,
              domain: response.domain as 'movies' | 'tv-series',
              questionFlow: response.flowType,
              isLoading: false,
              recommendations: [], // Clear any old recommendations
              answers: {}, // Clear old answers
              moment: null, // Clear old moment
              validation: null, // Clear old validation
              emotionalProfile: null // Clear old profile
            });
            console.log('[Store] State updated successfully');
          } catch (error: any) {
            console.error('[Store] Error:', error);
            set({ error: error.message, isLoading: false });
            throw error; // Re-throw to be caught by component
          }
        },

        // Submit answer
        submitAnswer: async (questionId: string, answer: string, responseTime?: number) => {
          set({ isLoading: true });
          try {
            const response = await api.submitAnswer(questionId, answer, responseTime);
            const { answers, currentQuestionIndex } = get();
            
            set({
              answers: { ...answers, [questionId]: answer },
              currentQuestionIndex: currentQuestionIndex + 1,
              isLoading: false
            });

            // Check if we have recommendations
            if (response.type === 'recommendations') {
              // Save recommendations to sessionStorage for the recommendations page
              const { sessionId } = get();
              sessionStorage.setItem('session_id', sessionId || '');
              sessionStorage.setItem('recommendations_data', JSON.stringify({
                recommendations: response.recommendations,
                moment: response.moment,
                validation: response.validation,
                emotionalProfile: response.emotionalProfile
              }));
              
              set({
                recommendations: response.recommendations,
                moment: response.moment,
                validation: response.validation
              });
            } else if (response.question) {
              // Add next question to array if not already there
              const { questions } = get();
              const existingQuestion = questions.find(q => q.id === response.question.id);
              if (!existingQuestion) {
                set({
                  questions: [...questions, response.question]
                });
              }
            }
          } catch (error: any) {
            set({ error: error.message, isLoading: false });
          }
        },

        // Refine recommendations
        refineRecommendations: async (feedback) => {
          set({ isLoading: true });
          try {
            const response = await api.refineRecommendations(feedback);
            set({
              recommendations: response.recommendations,
              isLoading: false
            });
          } catch (error: any) {
            // If session expired, clear everything and redirect to home
            if (error.message.includes('401') || error.message.includes('expired')) {
              get().reset();
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            } else {
              set({ error: error.message, isLoading: false });
            }
          }
        },

        // Quick adjust
        quickAdjust: async (type) => {
          set({ isLoading: true });
          try {
            const response = await api.quickAdjust(type as any);
            set({
              recommendations: response.recommendations,
              isLoading: false
            });
          } catch (error: any) {
            // If session expired, clear everything and redirect to home
            if (error.message.includes('401') || error.message.includes('expired')) {
              get().reset();
              if (typeof window !== 'undefined') {
                window.location.href = '/';
              }
            } else {
              set({ error: error.message, isLoading: false });
            }
          }
        },

        // Validate moment
        validateMoment: async (feedback) => {
          try {
            await api.validateMoment('overall_impression', feedback);
          } catch (error: any) {
            console.error('Failed to validate moment:', error);
          }
        },

        // Track interaction (disabled for now - endpoint not implemented)
        trackInteraction: async (movieId, type) => {
          // Temporarily disabled - interaction tracking endpoint not yet implemented
          console.log(`[Interaction] ${type} on movie ${movieId}`);
          // try {
          //   await api.trackInteraction(movieId, type);
          // } catch (error: any) {
          //   console.error('Failed to track interaction:', error);
          // }
        },

        // Load data from storage (for debug/testing)
        loadFromStorage: (data) => {
          if (data.sessionId) {
            api.setSessionId(data.sessionId);
          }
          set({
            sessionId: data.sessionId || null,
            recommendations: data.recommendations || [],
            moment: data.moment || null,
            validation: data.validation || null,
            emotionalProfile: data.emotionalProfile || null,
            isLoading: false,
            error: null
          });
          console.log('[Store] Loaded data from storage:', {
            sessionId: data.sessionId,
            recommendationsCount: data.recommendations?.length || 0
          });
        },

        // Reset
        reset: () => {
          api.clearSession();
          // Clear sessionStorage when resetting
          if (typeof window !== 'undefined') {
            sessionStorage.removeItem('whatnext_session_id');
            sessionStorage.removeItem('whatnext_session_data');
            console.log('[Store] Cleared sessionStorage on reset');
          }
          set({
            sessionId: null,
            questions: [],
            currentQuestionIndex: 0,
            answers: {},
            recommendations: [],
            moment: null,
            validation: null,
            emotionalProfile: null,
            isLoading: false,
            error: null
          });
        }
      }),
      {
        name: 'recommendation-storage',
        partialize: (state) => ({
          // Only persist minimal session data
          sessionId: state.sessionId
          // Don't persist recommendations or answers to avoid stale data
        })
      }
    )
  )
);