import { useState, useCallback } from 'react';
import apiClient from '../services/apiClient';
import toast from 'react-hot-toast';

export const useSwipeSession = () => {
  const [state, setState] = useState({
    sessionId: null,
    currentQuestion: null,
    progress: 0,
    recommendations: [],
    isLoading: false,
    error: null,
    domain: 'movies',
    questionsAnswered: 0,
    sessionStartTime: null
  });

  const startSession = useCallback(async (domain = 'movies', excludedMovies = []) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const data = await apiClient.startSession(domain, excludedMovies);
      console.log('Session started:', data);
      
      // Validate question structure
      if (data.question && !data.question.options) {
        console.error('Invalid question structure:', data.question);
      }
      
      setState(prev => ({
        ...prev,
        sessionId: data.sessionId,
        currentQuestion: data.question,
        progress: data.progress || 0,
        domain,
        isLoading: false,
        questionsAnswered: 0,
        sessionStartTime: Date.now()
      }));
      
      return data;
    } catch (error) {
      const errorMessage = error.message || 'Failed to start session';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      toast.error(errorMessage);
      throw error;
    }
  }, []);

  const submitChoice = useCallback(async (questionId, choice, responseTime) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const data = await apiClient.submitChoice(questionId, choice, responseTime);
      console.log('Choice submitted, response:', data);
      console.log('Response type:', data.type);
      console.log('Has recommendations?', data.recommendations);
      
      if (data.type === 'recommendations') {
        // We got recommendations!
        console.log('Got recommendations!', data.recommendations);
        const sessionDuration = state.sessionStartTime ? 
          Math.round((Date.now() - state.sessionStartTime) / 1000) : 0;
        
        setState(prev => {
          console.log('Setting recommendations state:', {
            recommendations: data.recommendations || [],
            currentQuestion: null
          });
          return {
            ...prev,
            recommendations: data.recommendations || [],
            progress: 100,
            isLoading: false,
            currentQuestion: null,
            sessionDuration
          };
        });
        
        // Show success message
        toast.success(
          `Found ${data.recommendations?.length || 0} perfect matches in ${sessionDuration}s!`,
          { duration: 4000 }
        );
      } else {
        // Next question
        // Validate question structure
        if (data.question && !data.question.options) {
          console.error('Invalid question structure in response:', data.question);
        }
        
        setState(prev => ({
          ...prev,
          currentQuestion: data.question,
          progress: data.progress || ((prev.questionsAnswered + 1) / 6 * 100),
          isLoading: false,
          questionsAnswered: prev.questionsAnswered + 1
        }));
      }
      
      return data;
    } catch (error) {
      const errorMessage = error.message || 'Failed to submit choice';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      toast.error(errorMessage);
      throw error;
    }
  }, [state.sessionStartTime]);

  const submitFeedback = useCallback(async (recommendationIndex, feedback) => {
    try {
      const result = await apiClient.submitFeedback(5, feedback);
      toast.success('Thanks for your feedback!');
      return result;
    } catch (error) {
      console.error('Failed to submit feedback:', error);
      // Don't show error toast for feedback - it's not critical
    }
  }, []);

  const getMoreRecommendations = useCallback(async (excludedMovies) => {
    if (!state.sessionId) {
      toast.error('No active session');
      return;
    }
    
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const data = await apiClient.getMoreRecommendations(state.sessionId, excludedMovies);
      console.log('Got more recommendations:', data);
      
      setState(prev => ({
        ...prev,
        recommendations: data.recommendations || [],
        isLoading: false
      }));
      
      return data;
    } catch (error) {
      const errorMessage = error.message || 'Failed to get more recommendations';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      toast.error(errorMessage);
      throw error;
    }
  }, [state.sessionId]);

  const resetSession = useCallback(() => {
    apiClient.resetSession();
    setState({
      sessionId: null,
      currentQuestion: null,
      progress: 0,
      recommendations: [],
      isLoading: false,
      error: null,
      domain: 'movies',
      questionsAnswered: 0,
      sessionStartTime: null
    });
  }, []);

  const selectDomain = useCallback(async (domain) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      if (state.sessionId) {
        const data = await apiClient.selectDomain(state.sessionId, domain);
        setState(prev => ({
          ...prev,
          domain,
          currentQuestion: data.question,
          isLoading: false
        }));
        return data;
      } else {
        // Start new session with domain
        return startSession(domain);
      }
    } catch (error) {
      const errorMessage = error.message || 'Failed to select domain';
      setState(prev => ({
        ...prev,
        error: errorMessage,
        isLoading: false
      }));
      toast.error(errorMessage);
      throw error;
    }
  }, [state.sessionId, startSession]);

  return {
    ...state,
    startSession,
    submitChoice,
    submitFeedback,
    resetSession,
    selectDomain,
    getMoreRecommendations
  };
};