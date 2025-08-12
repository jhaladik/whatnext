import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

const DonationSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [donationDetails, setDonationDetails] = useState(null);
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://what-next-prod.jhaladik.workers.dev';
  
  useEffect(() => {
    const verifyPayment = async () => {
      const sessionId = searchParams.get('session_id');
      
      if (!sessionId) {
        setVerifying(false);
        return;
      }
      
      try {
        const response = await fetch(`${API_URL}/api/donation/verify/${sessionId}`);
        const data = await response.json();
        
        if (data.success) {
          setVerified(true);
          setDonationDetails(data);
        }
      } catch (error) {
        console.error('Error verifying payment:', error);
      } finally {
        setVerifying(false);
      }
    };
    
    verifyPayment();
  }, [searchParams]);
  
  if (verifying) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Verifying your donation...</p>
        </div>
      </div>
    );
  }
  
  if (!verified) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Payment Not Found</h1>
          <p className="text-gray-600 mb-6">We couldn't verify your payment. Please contact support if you believe this is an error.</p>
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={500}
        gravity={0.1}
      />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-8 text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
          className="text-6xl mb-4"
        >
          🎉
        </motion.div>
        
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Thank You So Much!
        </h1>
        
        <p className="text-lg text-gray-600 mb-6">
          Your support means everything to us!
        </p>
        
        {donationDetails && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-600">
              Donation Amount
            </p>
            <p className="text-2xl font-bold text-primary-600">
              ${donationDetails.amount}
            </p>
          </div>
        )}
        
        <div className="space-y-4 mb-6">
          <p className="text-gray-700">
            Your generosity helps keep What Next:
          </p>
          <ul className="text-left space-y-2 text-gray-600">
            <li className="flex items-start">
              <span className="mr-2">✨</span>
              <span>Free for everyone</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🚫</span>
              <span>Ad-free forever</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🚀</span>
              <span>Constantly improving</span>
            </li>
            <li className="flex items-start">
              <span className="mr-2">🎬</span>
              <span>Adding new features</span>
            </li>
          </ul>
        </div>
        
        <button
          onClick={() => navigate('/')}
          className="w-full py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-lg font-semibold hover:from-primary-600 hover:to-primary-700 transition-all transform hover:scale-[1.02]"
        >
          Find More Movies
        </button>
        
        <p className="mt-4 text-sm text-gray-500">
          You're awesome! 💜
        </p>
      </motion.div>
    </div>
  );
};

export default DonationSuccess;