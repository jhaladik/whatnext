import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useState, useEffect } from 'react';

const ModernTermsOfService = () => {
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
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
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
      
      <div className="relative z-20 max-w-4xl mx-auto py-12 px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative"
        >
          {/* Card glow */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-pink-600/10 rounded-3xl blur-2xl" />
          
          {/* Main content */}
          <div className="relative bg-black/40 backdrop-blur-xl rounded-3xl border border-white/10 p-8 md:p-12">
            {/* Header */}
            <div className="text-center mb-10">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="inline-block mb-4"
              >
                <span className="text-4xl">📜</span>
              </motion.div>
              
              <h1 className="text-4xl font-bold mb-3">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Terms of Service
                </span>
              </h1>
              <p className="text-sm text-gray-400 mb-2">Effective Date: August 12, 2025</p>
              <p className="text-sm text-purple-300">Service Provider: Haládik Advisory s.r.o.</p>
            </div>
            
            <div className="space-y-8">
              {/* Section 1 */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
                className="group"
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold mr-3">
                    1
                  </div>
                  <h2 className="text-xl font-semibold text-white">Service Description</h2>
                </div>
                <p className="text-gray-300 ml-11">
                  What Next is a content recommendation service that helps you discover personalized content based on your preferences through interactive questions.
                </p>
              </motion.section>
              
              {/* Section 2 */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold mr-3">
                    2
                  </div>
                  <h2 className="text-xl font-semibold text-white">User Agreement</h2>
                </div>
                <p className="text-gray-300 ml-11 mb-3">By using this service, you agree to:</p>
                <ul className="space-y-2 ml-11">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Provide accurate information during the recommendation process</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Use the service for personal, non-commercial purposes</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Respect intellectual property rights of recommended content</span>
                  </li>
                </ul>
              </motion.section>
              
              {/* Section 3 */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold mr-3">
                    3
                  </div>
                  <h2 className="text-xl font-semibold text-white">Service Availability</h2>
                </div>
                <ul className="space-y-2 ml-11">
                  <li className="flex items-start">
                    <span className="text-pink-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Service is provided "as is" without warranties</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">We reserve the right to modify or discontinue the service at any time</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Temporary interruptions may occur for maintenance</span>
                  </li>
                </ul>
              </motion.section>
              
              {/* Section 4 */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold mr-3">
                    4
                  </div>
                  <h2 className="text-xl font-semibold text-white">Data & Privacy</h2>
                </div>
                <ul className="space-y-2 ml-11">
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">We collect minimal data necessary to provide recommendations</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Personal data is processed in accordance with GDPR</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">We do not sell your data to third parties</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-purple-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Session data may be stored temporarily to improve recommendations</span>
                  </li>
                </ul>
              </motion.section>
              
              {/* Section 5 */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold mr-3">
                    5
                  </div>
                  <h2 className="text-xl font-semibold text-white">Limitation of Liability</h2>
                </div>
                <ul className="space-y-2 ml-11">
                  <li className="flex items-start">
                    <span className="text-pink-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Recommendations are suggestions only</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">We are not responsible for the content or availability of recommended materials</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-pink-400 mr-2 mt-1">▸</span>
                    <span className="text-gray-300">Use recommendations at your own discretion</span>
                  </li>
                </ul>
              </motion.section>
              
              {/* Section 6 */}
              <motion.section
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center mb-3">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 flex items-center justify-center text-sm font-bold mr-3">
                    6
                  </div>
                  <h2 className="text-xl font-semibold text-white">Contact</h2>
                </div>
                <p className="text-gray-300 ml-11 mb-3">For questions about these terms:</p>
                <div className="ml-11 p-4 bg-white/5 backdrop-blur-md rounded-xl border border-white/10">
                  <p className="font-semibold text-purple-300">Haládik Advisory s.r.o.</p>
                  <p className="text-gray-400">U družstva Práce 747/29, Praha - Podolí, 140 00</p>
                  <p className="text-gray-400">Registration: C 187909, Municipal Court in Prague</p>
                </div>
              </motion.section>
              
              {/* Footer note */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="pt-6 border-t border-white/10"
              >
                <p className="text-sm text-gray-500 text-center">
                  These terms are governed by Czech law.
                </p>
              </motion.div>
            </div>
            
            {/* Back button */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.8 }}
              className="mt-10 flex justify-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/')}
                className="group relative px-8 py-3"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md opacity-70 group-hover:opacity-100 transition" />
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-8 py-3 rounded-full font-semibold">
                  Back to Home
                </div>
              </motion.button>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ModernTermsOfService;