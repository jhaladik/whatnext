'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { QuestionFlow } from '@/components/questions/QuestionFlow';
import { useRecommendationStore } from '@/store/recommendations';
import { CreativeLoader } from '@/components/ui/CreativeLoader';
import { api } from '@/services/api/client';

export default function QuestionsPage() {
  const router = useRouter();
  const { sessionId, recommendations, isLoading, questions, domain, questionFlow } = useRecommendationStore();
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRestored, setIsRestored] = useState(false);

  // Wait for hydration and check sessionStorage
  useEffect(() => {
    setIsHydrated(true);
    
    // Check sessionStorage for session
    const storedSessionId = sessionStorage.getItem('whatnext_session_id');
    const storedData = sessionStorage.getItem('whatnext_session_data');
    
    console.log('[Questions Page] SessionStorage check:', storedSessionId);
    console.log('[Questions Page] SessionStorage data:', storedData);
    
    if (storedSessionId && storedData && !sessionId) {
      const data = JSON.parse(storedData);
      
      console.log('[Questions Page] Restoring session from storage');
      // Set the session ID in the API client
      api.setSessionId(storedSessionId);
      
      // Restore the store state (and clear any old recommendations)
      useRecommendationStore.setState({
        sessionId: storedSessionId,
        questions: data.questions || [],
        domain: data.domain || 'movies',
        questionFlow: data.flowType || 'standard',
        currentQuestionIndex: 0,
        isLoading: false,
        recommendations: [], // Clear any old recommendations
        answers: {} // Clear old answers
      });
      
      setIsRestored(true);
      console.log('[Questions Page] Session restored');
    } else if (sessionId) {
      // Already have session from store
      setIsRestored(true);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!isHydrated || !isRestored) return;
    
    console.log('[Questions Page] Checking session after restoration');
    console.log('[Questions Page] SessionId:', sessionId);
    console.log('[Questions Page] Questions:', questions?.length);
    
    // After restoration, check if we have a valid session
    const checkSession = setTimeout(() => {
      if (!sessionId) {
        console.log('[Questions Page] No session found after restoration, redirecting to home...');
        router.push('/');
      }
    }, 500);
    
    return () => clearTimeout(checkSession);
  }, [isHydrated, isRestored, sessionId, router, questions]);

  useEffect(() => {
    if (recommendations.length > 0) {
      console.log('[Questions Page] Has recommendations, redirecting...');
      router.push('/recommendations');
    }
  }, [recommendations, router]);

  console.log('[Questions Page] Render - sessionId:', sessionId, 'hydrated:', isHydrated, 'restored:', isRestored);

  // Show loader until fully ready
  if (!isHydrated || !isRestored || isLoading) {
    return <CreativeLoader />;
  }

  if (!sessionId || questions.length === 0) {
    console.log('[Questions Page] Waiting for session/questions...');
    return <CreativeLoader />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <QuestionFlow />
    </div>
  );
}