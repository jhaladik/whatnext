import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { Film, Popcorn, Star, Heart, Sparkles } from 'lucide-react';

export function CreativeLoader() {
  const [message, setMessage] = useState('Finding your perfect matches...');
  
  const messages = [
    'Finding your perfect matches...',
    'Analyzing your mood...',
    'Discovering hidden gems...',
    'Curating your experience...',
    'Almost there...'
  ];

  const icons = [Film, Popcorn, Star, Heart, Sparkles];

  useEffect(() => {
    let index = 0;
    const interval = setInterval(() => {
      index = (index + 1) % messages.length;
      setMessage(messages[index]);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Animated Icons Circle */}
      <div className="relative w-32 h-32 mb-12">
        {icons.map((Icon, i) => (
          <motion.div
            key={i}
            className="absolute inset-0 flex items-center justify-center"
            animate={{
              rotate: 360,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear",
              delay: i * 0.6,
            }}
          >
            <motion.div
              animate={{
                scale: [1, 1.2, 1],
                opacity: [0.3, 1, 0.3],
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.4,
              }}
              style={{
                transform: `rotate(${i * 72}deg) translateY(-40px)`,
              }}
            >
              <Icon className="w-8 h-8 text-purple-500" />
            </motion.div>
          </motion.div>
        ))}
        
        {/* Center dot */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          animate={{
            scale: [1, 1.5, 1],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
          }}
        >
          <div className="w-4 h-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" />
        </motion.div>
      </div>
      
      {/* Loading message */}
      <motion.p
        key={message}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="text-lg text-gray-600 font-medium"
      >
        {message}
      </motion.p>
      
      {/* Progress dots */}
      <div className="flex space-x-2 mt-8">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-2 h-2 bg-purple-400 rounded-full"
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.5, 1, 0.5],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    </div>
  );
}