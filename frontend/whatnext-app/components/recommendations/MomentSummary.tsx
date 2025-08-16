import { motion } from 'framer-motion';
import { X } from 'lucide-react';
import { MomentSummary as MomentType } from '@/services/api/client';

interface MomentSummaryProps {
  moment: MomentType;
  onDismiss: () => void;
}

export function MomentSummary({ moment, onDismiss }: MomentSummaryProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="bg-white rounded-3xl p-8 shadow-2xl relative overflow-hidden"
    >
      {/* Background gradient decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-purple-100 to-pink-100 opacity-50" />
      
      <div className="relative z-10">
        {/* Close button */}
        <button
          onClick={onDismiss}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>

        {/* Content */}
        <div className="text-center">
          {/* Emoji */}
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", delay: 0.2 }}
            className="text-6xl mb-4"
          >
            {moment.emoji}
          </motion.div>

          {/* Title */}
          <h2 className="text-3xl font-bold mb-2 text-gray-800">Your Moment</h2>
          
          {/* Description */}
          <p className="text-lg text-gray-600 mb-6 max-w-md mx-auto">
            {moment.description}
          </p>

          {/* Confidence Bar */}
          <div className="mb-8">
            <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
              <span>Confidence</span>
              <span>{moment.confidence}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${moment.confidence}%` }}
                transition={{ delay: 0.5, duration: 1 }}
                className="h-full gradient-purple-pink rounded-full"
              />
            </div>
          </div>

          {/* Emotional Dimensions */}
          {moment.visualization && moment.visualization.dimensions && (
            <div className="grid grid-cols-2 gap-4 mb-8">
              {moment.visualization.dimensions.map((dim, index) => (
                <motion.div
                  key={dim.axis}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + index * 0.1 }}
                  className="text-left"
                >
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{dim.axis}</span>
                    <span className="text-gray-800 font-medium">{dim.value}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${dim.value}%` }}
                      transition={{ delay: 0.6 + index * 0.1, duration: 0.8 }}
                      className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full"
                    />
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* CTA Button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onDismiss}
            className="px-8 py-3 gradient-purple-pink text-white rounded-full font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            Show me my movies!
          </motion.button>
        </div>
      </div>
    </motion.div>
  );
}