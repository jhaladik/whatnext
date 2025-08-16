'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { WelcomeScreen } from '@/components/welcome/WelcomeScreen';
import { useRecommendationStore } from '@/store/recommendations';

export default function HomePage() {
  const router = useRouter();
  const { sessionId, reset } = useRecommendationStore();

  useEffect(() => {
    // Only reset if we don't have a valid session in storage
    const storedSessionId = sessionStorage.getItem('whatnext_session_id');
    if (!storedSessionId && sessionId) {
      console.log('[HomePage] No stored session, resetting store');
      reset();
    }
  }, []);

  const handleFlowSelected = () => {
    console.log('[HomePage] Navigating to questions...');
    // Small delay to ensure state is saved
    setTimeout(() => {
      router.push('/questions');
    }, 100);
  };

  return (
    <div className="min-h-screen">
      <WelcomeScreen onFlowSelected={handleFlowSelected} />
    </div>
  );
}