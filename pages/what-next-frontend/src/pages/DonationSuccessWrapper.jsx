import { useState, useEffect } from 'react';
import DonationSuccess from './DonationSuccess';
import ModernDonationSuccess from './ModernDonationSuccess';

const DonationSuccessWrapper = () => {
  const [useModernDesign, setUseModernDesign] = useState(() => {
    const saved = localStorage.getItem('designPreference');
    return saved !== null ? saved === 'modern' : true;
  });
  
  // Listen for design preference changes
  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('designPreference');
      setUseModernDesign(saved !== null ? saved === 'modern' : true);
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  return useModernDesign ? <ModernDonationSuccess /> : <DonationSuccess />;
};

export default DonationSuccessWrapper;