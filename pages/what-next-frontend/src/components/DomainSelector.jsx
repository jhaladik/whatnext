import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const DomainSelector = ({ onSelectDomain, currentDomain = 'movies' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState(currentDomain);

  const domains = [
    {
      id: 'movies',
      name: 'Movies',
      icon: '🎬',
      description: 'Feature films for every mood',
      gradient: 'from-purple-500 to-pink-500'
    },
    {
      id: 'series',
      name: 'TV Series',
      icon: '📺',
      description: 'Binge-worthy shows & series',
      gradient: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'documentaries',
      name: 'Documentaries',
      icon: '🎥',
      description: 'Real stories & learning',
      gradient: 'from-green-500 to-emerald-500'
    }
  ];

  const currentDomainData = domains.find(d => d.id === selectedDomain) || domains[0];

  const handleDomainSelect = (domainId) => {
    setSelectedDomain(domainId);
    onSelectDomain(domainId);
    setIsExpanded(false);
  };

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-md px-4">
      {/* Current Selection Button */}
      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full relative group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {/* Glow effect */}
        <div className={`absolute inset-0 bg-gradient-to-r ${currentDomainData.gradient} rounded-2xl blur-md opacity-20 group-hover:opacity-30 transition`} />
        
        {/* Main button */}
        <div className="relative bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{currentDomainData.icon}</span>
            <div className="text-left">
              <div className="text-white font-semibold">{currentDomainData.name}</div>
              <div className="text-gray-400 text-xs">{currentDomainData.description}</div>
            </div>
          </div>
          
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="text-gray-400"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
            </svg>
          </motion.div>
        </div>
      </motion.button>

      {/* Expanded Domain Options */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full mt-2 w-full"
          >
            <div className="bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl p-2 shadow-2xl">
              {domains.map((domain) => (
                <motion.button
                  key={domain.id}
                  onClick={() => handleDomainSelect(domain.id)}
                  className="w-full group relative mb-1 last:mb-0"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  {/* Selected indicator */}
                  {selectedDomain === domain.id && (
                    <motion.div
                      layoutId="selected-domain"
                      className={`absolute inset-0 bg-gradient-to-r ${domain.gradient} rounded-xl opacity-10`}
                    />
                  )}
                  
                  {/* Domain option */}
                  <div className={`
                    relative p-3 rounded-xl flex items-center gap-3 transition-all
                    ${selectedDomain === domain.id 
                      ? 'bg-white/10' 
                      : 'hover:bg-white/5'
                    }
                  `}>
                    <span className="text-2xl">{domain.icon}</span>
                    <div className="text-left flex-1">
                      <div className={`
                        font-medium transition-colors
                        ${selectedDomain === domain.id 
                          ? 'text-white' 
                          : 'text-gray-300 group-hover:text-white'
                        }
                      `}>
                        {domain.name}
                      </div>
                      <div className="text-gray-500 text-xs">
                        {domain.description}
                      </div>
                    </div>
                    
                    {selectedDomain === domain.id && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className={`bg-gradient-to-r ${domain.gradient} w-2 h-2 rounded-full`}
                      />
                    )}
                  </div>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Click outside to close */}
      {isExpanded && (
        <div 
          className="fixed inset-0 -z-10" 
          onClick={() => setIsExpanded(false)}
        />
      )}
    </div>
  );
};

export default DomainSelector;