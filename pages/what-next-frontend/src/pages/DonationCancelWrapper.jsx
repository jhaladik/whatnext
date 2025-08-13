import { useState, useEffect } from 'react';
import DonationCancel from './DonationCancel';
import ModernDonationCancel from './ModernDonationCancel';

const DonationCancelWrapper = () => {
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
  
  return useModernDesign ? <ModernDonationCancel /> : <DonationCancel />;
};

export default DonationCancelWrapper;