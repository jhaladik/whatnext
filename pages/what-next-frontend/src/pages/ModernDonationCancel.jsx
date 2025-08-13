import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const ModernDonationCancel = () => {
  const navigate = useNavigate();
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);
  
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
      
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative max-w-lg w-full z-20"
      >
        {/* Card glow */}
        <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl" />
        
        {/* Main content */}
        <div className="relative bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 text-center shadow-2xl">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.1 }}
            className="text-5xl mb-4"
          >
            🤔
          </motion.div>
          
          <h1 className="text-2xl font-bold mb-3">
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Donation Cancelled
            </span>
          </h1>
          
          <p className="text-gray-300 mb-8">
            No worries! You can always come back if you change your mind.
          </p>
          
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="group relative w-full"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition" />
              <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 py-3 rounded-full font-semibold">
                Back to Finding Movies
              </div>
            </motion.button>
            
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-sm text-gray-500"
            >
              Enjoying What Next? Consider supporting us later! 💜
            </motion.p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default ModernDonationCancel;