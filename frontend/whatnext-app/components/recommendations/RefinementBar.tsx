import { motion } from 'framer-motion';
import { Sun, Waves, Theater, Home, Clock, Film } from 'lucide-react';

interface RefinementBarProps {
  onAdjust: (type: string) => void;
}

export function RefinementBar({ onAdjust }: RefinementBarProps) {
  const adjustments = [
    { id: 'lighter', label: 'Lighter', icon: Sun, color: 'from-yellow-400 to-orange-400' },
    { id: 'deeper', label: 'Deeper', icon: Waves, color: 'from-blue-400 to-indigo-400' },
    { id: 'weirder', label: 'Weirder', icon: Theater, color: 'from-purple-400 to-pink-400' },
    { id: 'safer', label: 'Safer', icon: Home, color: 'from-green-400 to-teal-400' },
    { id: 'shorter', label: 'Shorter', icon: Clock, color: 'from-gray-400 to-gray-600' },
    { id: 'longer', label: 'Epic', icon: Film, color: 'from-red-400 to-rose-400' }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl shadow-lg p-6"
    >
      <p className="text-gray-600 text-center mb-4">Quick mood adjustment:</p>
      <div className="flex flex-wrap gap-3 justify-center">
        {adjustments.map((adj, index) => {
          const Icon = adj.icon;
          return (
            <motion.button
              key={adj.id}
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onAdjust(adj.id)}
              className={`px-4 py-2 bg-gradient-to-r ${adj.color} text-white rounded-full flex items-center gap-2 font-semibold shadow-md hover:shadow-xl transition-all`}
            >
              <Icon className="w-4 h-4" />
              {adj.label}
            </motion.button>
          );
        })}
      </div>
    </motion.div>
  );
}