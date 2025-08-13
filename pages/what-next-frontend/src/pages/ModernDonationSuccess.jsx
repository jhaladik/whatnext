import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import Confetti from 'react-confetti';

const ModernDonationSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [verifying, setVerifying] = useState(true);
  const [verified, setVerified] = useState(false);
  const [donationDetails, setDonationDetails] = useState(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://what-next-prod.jhaladik.workers.dev';
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
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
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
        </div>
        
        <div className="relative text-center">
          <div className="w-16 h-16 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 animate-pulse mx-auto mb-4" />
          <p className="text-gray-400">Verifying your donation...</p>
        </div>
      </div>
    );
  }
  
  if (!verified) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
        </div>
        
        <div className="relative text-center max-w-lg mx-auto p-8">
          <h1 className="text-2xl font-bold text-white mb-4">Payment Not Found</h1>
          <p className="text-gray-400 mb-6">We couldn't verify your payment. Please contact support if you believe this is an error.</p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="group relative px-6 py-3"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition" />
            <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-6 py-3 rounded-full font-semibold text-white">
              Return Home
            </div>
          </motion.button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden flex items-center justify-center p-4">
      {/* Animated gradient background */}
      <div className="fixed inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/20 via-black to-blue-900/20" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(147,51,234,0.1),transparent_50%)]" />
      </div>
      
      {/* Spotlight effect */}
      <div 
        className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
        style={{
          background: `radial-gradient(600px at ${mousePosition.x}px ${mousePosition.y}px, rgba(147, 51, 234, 0.06), transparent 40%)`
        }}
      />
      
      <Confetti
        width={window.innerWidth}
        height={window.innerHeight}
        recycle={false}
        numberOfPieces={500}
        gravity={0.1}
        colors={['#8B5CF6', '#EC4899', '#F472B6', '#A78BFA', '#C084FC']}
      />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="relative max-w-lg w-full z-20"
      >
        {/* Card glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl blur-2xl" />
        
        {/* Main content */}
        <div className="relative bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center shadow-2xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
            className="text-6xl mb-4"
          >
            🎉
          </motion.div>
          
          <h1 className="text-3xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Thank You So Much!
            </span>
          </h1>
          
          <p className="text-lg text-gray-300 mb-6">
            Your support means everything to us!
          </p>
          
          {donationDetails && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-4 mb-6 border border-purple-500/30"
            >
              <p className="text-sm text-gray-400 mb-1">
                Donation Amount
              </p>
              <p className="text-3xl font-bold">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  ${donationDetails.amount}
                </span>
              </p>
            </motion.div>
          )}
          
          <div className="space-y-4 mb-6">
            <p className="text-gray-300">
              Your generosity helps keep What Next:
            </p>
            <motion.ul 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-left space-y-3 text-gray-300"
            >
              <li className="flex items-start">
                <span className="mr-3 text-purple-400">✨</span>
                <span>Free for everyone</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-pink-400">🚫</span>
                <span>Ad-free forever</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-purple-400">🚀</span>
                <span>Constantly improving</span>
              </li>
              <li className="flex items-start">
                <span className="mr-3 text-pink-400">🎬</span>
                <span>Adding new features</span>
              </li>
            </motion.ul>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate('/')}
            className="group relative w-full"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition" />
            <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-full font-semibold">
              Find More Movies
            </div>
          </motion.button>
          
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="mt-4 text-sm text-gray-500"
          >
            You're awesome! 💜
          </motion.p>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernDonationSuccess;