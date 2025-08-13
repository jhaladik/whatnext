import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const ModernLanding = ({ onStart }) => {
  const [showDomainSelection, setShowDomainSelection] = useState(false);
  const [hoveredDomain, setHoveredDomain] = useState(null);


  return (
    <div className="min-h-screen bg-black text-white overflow-hidden relative">
      
      {/* Simple gradient background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-900/10 via-black to-blue-900/10" />
      </div>

      {/* Simple Navigation */}
      <nav className="relative z-10 px-8 py-6">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center space-x-2"
          >
            <span className="text-2xl">🎬</span>
            <span className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              WhatNext
            </span>
          </motion.div>
        </div>
      </nav>

      {/* Hero Content - Minimalist */}
      <div className="relative z-10 flex items-center justify-center min-h-[80vh]">
        <div className="text-center px-8 max-w-2xl mx-auto">
          
          {/* Main Question */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-5xl md:text-7xl font-bold mb-12"
          >
            <span className="bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              What should I watch tonight?
            </span>
          </motion.h1>

          {/* Subtle tagline */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="text-xl text-gray-400 mb-12"
          >
            Stop scrolling. Start watching.
          </motion.p>

          {/* Single CTA button with progressive disclosure */}
          <AnimatePresence mode="wait">
            {!showDomainSelection ? (
              <motion.button
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ delay: 0.4 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDomainSelection(true)}
                className="group relative inline-block"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 px-12 py-5 rounded-full">
                  <span className="text-xl font-semibold">Tell me</span>
                  <motion.span
                    animate={{ x: [0, 5, 0] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="inline-block ml-3"
                  >
                    →
                  </motion.span>
                </div>
              </motion.button>
            ) : (
              <motion.div
                key="domains"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <p className="text-gray-400 mb-6">What are you in the mood for?</p>
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => setHoveredDomain('movies')}
                    onMouseLeave={() => setHoveredDomain(null)}
                    onClick={() => onStart('movies')}
                    className="relative w-full sm:w-auto group"
                  >
                    {/* Glow effect when hovered */}
                    <AnimatePresence>
                      {hoveredDomain === 'movies' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-md"
                        />
                      )}
                    </AnimatePresence>
                    <div className="relative px-8 py-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 group-hover:border-purple-400/50 transition">
                      <span className="text-lg">🎬 Movies</span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => setHoveredDomain('series')}
                    onMouseLeave={() => setHoveredDomain(null)}
                    onClick={() => onStart('series')}
                    className="relative w-full sm:w-auto group"
                  >
                    {/* Glow effect when hovered */}
                    <AnimatePresence>
                      {hoveredDomain === 'series' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full blur-md"
                        />
                      )}
                    </AnimatePresence>
                    <div className="relative px-8 py-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 group-hover:border-blue-400/50 transition">
                      <span className="text-lg">📺 TV Series</span>
                    </div>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onMouseEnter={() => setHoveredDomain('documentaries')}
                    onMouseLeave={() => setHoveredDomain(null)}
                    onClick={() => onStart('documentaries')}
                    className="relative w-full sm:w-auto group"
                  >
                    {/* Glow effect when hovered */}
                    <AnimatePresence>
                      {hoveredDomain === 'documentaries' && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-purple-600 rounded-full blur-md"
                        />
                      )}
                    </AnimatePresence>
                    <div className="relative px-8 py-4 bg-white/10 backdrop-blur-md rounded-full border border-white/20 group-hover:border-cyan-400/50 transition">
                      <span className="text-lg">🎥 Documentaries</span>
                    </div>
                  </motion.button>
                </div>

                <motion.button
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.3 }}
                  onClick={() => setShowDomainSelection(false)}
                  className="text-gray-500 hover:text-gray-300 text-sm mt-4 transition"
                >
                  ← Back
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Minimal stats */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-20 flex items-center justify-center gap-8 text-sm text-gray-500"
          >
            <span>5-7 questions</span>
            <span>•</span>
            <span>30 seconds</span>
            <span>•</span>
            <span>AI-powered</span>
          </motion.div>
        </div>

      </div>
    </div>
  );
};

export default ModernLanding;