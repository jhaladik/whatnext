'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RecommendationsView } from '@/components/recommendations/RecommendationsView';
import { useRecommendationStore } from '@/store/recommendations';
import { api } from '@/services/api/client';

export default function RecommendationsPage() {
  const router = useRouter();
  const store = useRecommendationStore();
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Skip debug data - only use real session data
    // Debug data causes stale sessions and wrong recommendations
    
    // Check sessionStorage for normal flow data
    const sessionData = sessionStorage.getItem('recommendations_data');
    const sessionId = sessionStorage.getItem('session_id');
    
    if (sessionData && sessionId) {
      try {
        const parsedData = JSON.parse(sessionData);
        if (parsedData.recommendations && parsedData.recommendations.length > 0) {
          // Populate store with session data using the loadFromStorage method
          store.loadFromStorage({
            sessionId: sessionId,
            recommendations: parsedData.recommendations,
            moment: parsedData.moment,
            validation: parsedData.validation,
            emotionalProfile: parsedData.emotionalProfile
          });
          
          setIsInitialized(true);
          console.log('[RecommendationsPage] Loaded session data:', parsedData.recommendations.length, 'movies');
          return;
        }
      } catch (error) {
        console.error('[RecommendationsPage] Failed to parse session data:', error);
      }
    }
    
    // If no data available and store is empty, redirect to home
    if (!store.sessionId || store.recommendations.length === 0) {
      console.log('[RecommendationsPage] No data available, redirecting to home');
      router.push('/');
    } else {
      setIsInitialized(true);
    }
  }, []);

  if (!isInitialized && store.recommendations.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading recommendations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <RecommendationsView />
    </div>
  );
}