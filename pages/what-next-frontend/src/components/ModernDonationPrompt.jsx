import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const ModernDonationPrompt = ({ timeSaved, sessionId, onClose, show }) => {
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://what-next-prod.jhaladik.workers.dev';
  
  const suggestedAmounts = [
    { value: 3, label: '☕', title: 'Coffee', description: 'Buy me a coffee!', color: 'from-amber-500 to-orange-500' },
    { value: 5, label: '🍕', title: 'Pizza Slice', description: 'Awesome support!', color: 'from-red-500 to-pink-500' },
    { value: 10, label: '🎬', title: 'Movie Ticket', description: 'Amazing!', color: 'from-purple-500 to-indigo-500' },
    { value: 25, label: '🚀', title: 'Super Fan', description: 'Incredible!', color: 'from-pink-500 to-rose-500' }
  ];
  
  const handleDonate = async () => {
    const amount = showCustom ? parseFloat(customAmount) : selectedAmount;
    
    if (amount < 1 || amount > 10000) {
      toast.error('Please enter an amount between $1 and $10,000');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/donation/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          sessionId,
          timeSaved: timeSaved || 25,
          userMessage: `Supporting What Next - saved ${timeSaved} minutes!`
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to create checkout session');
      }
      
      const { checkoutUrl } = await response.json();
      
      // Redirect to Stripe Checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error('Donation error:', error);
      toast.error('Failed to process donation. Please try again.');
      setLoading(false);
    }
  };
  
  if (!show) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative max-w-lg w-full"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl blur-2xl" />
          
          {/* Main content */}
          <div className="relative bg-black/60 backdrop-blur-xl rounded-3xl border border-white/10 p-8 shadow-2xl">
            {/* Close button */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition"
              disabled={loading}
            >
              <span className="text-white">×</span>
            </button>
            
            {/* Header */}
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", delay: 0.1 }}
                className="inline-block mb-4"
              >
                <span className="text-5xl">🎉</span>
              </motion.div>
              
              <h2 className="text-3xl font-bold text-white mb-3">
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Found Your Perfect Movies!
                </span>
              </h2>
              <p className="text-lg text-gray-300 mb-2">
                We saved you ~{timeSaved || 25} minutes of browsing
              </p>
              <p className="text-sm text-gray-500">
                Help keep What Next free and ad-free for everyone
              </p>
            </div>
            
            {/* Amount Selection */}
            <div className="space-y-4 mb-6">
              <div className="grid grid-cols-2 gap-3">
                {suggestedAmounts.map((amount) => (
                  <motion.button
                    key={amount.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedAmount(amount.value);
                      setShowCustom(false);
                    }}
                    className="relative group"
                    disabled={loading}
                  >
                    {/* Glow effect for selected */}
                    {!showCustom && selectedAmount === amount.value && (
                      <div className={`absolute inset-0 bg-gradient-to-r ${amount.color} rounded-2xl blur-md opacity-50`} />
                    )}
                    
                    <div className={`
                      relative p-4 rounded-2xl border-2 transition-all
                      ${!showCustom && selectedAmount === amount.value
                        ? `border-transparent bg-gradient-to-r ${amount.color} text-white`
                        : 'border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:border-white/30'
                      }
                    `}>
                      <div className="text-2xl mb-1">{amount.label}</div>
                      <div className="font-bold text-lg">${amount.value}</div>
                      <div className="text-xs opacity-80">{amount.title}</div>
                      
                      {/* Selected indicator */}
                      {!showCustom && selectedAmount === amount.value && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-2 right-2"
                        >
                          <div className="w-3 h-3 bg-white rounded-full" />
                        </motion.div>
                      )}
                    </div>
                  </motion.button>
                ))}
              </div>
              
              {/* Custom Amount Button */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowCustom(!showCustom)}
                className="relative group w-full"
                disabled={loading}
              >
                {showCustom && (
                  <div className="absolute inset-0 bg-gradient-to-r from-violet-500 to-purple-500 rounded-2xl blur-md opacity-50" />
                )}
                
                <div className={`
                  relative w-full p-4 rounded-2xl border-2 transition-all
                  ${showCustom
                    ? 'border-transparent bg-gradient-to-r from-violet-500 to-purple-500 text-white'
                    : 'border-white/20 bg-white/5 hover:bg-white/10 text-gray-300 hover:border-white/30'
                  }
                `}>
                  <span className="text-xl mr-2">💝</span>
                  <span className="font-medium">Custom Amount</span>
                </div>
              </motion.button>
              
              {/* Custom Amount Input */}
              <AnimatePresence>
                {showCustom && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">
                        $
                      </span>
                      <input
                        type="number"
                        min="1"
                        max="10000"
                        step="1"
                        value={customAmount}
                        onChange={(e) => setCustomAmount(e.target.value)}
                        placeholder="Enter amount"
                        className="w-full pl-10 pr-4 py-4 bg-white/10 backdrop-blur-md border-2 border-white/20 rounded-2xl text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none transition-all"
                        autoFocus
                      />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            {/* Action Buttons */}
            <div className="space-y-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleDonate}
                disabled={loading || (showCustom && !customAmount)}
                className="relative group w-full"
              >
                {/* Button glow */}
                <div className={`absolute inset-0 rounded-2xl blur-md transition-opacity ${
                  loading || (showCustom && !customAmount)
                    ? 'opacity-0'
                    : 'bg-gradient-to-r from-pink-600/50 to-purple-600/50 opacity-70 group-hover:opacity-100'
                }`} />
                
                <div className={`
                  relative w-full py-4 rounded-2xl font-semibold transition-all
                  ${loading || (showCustom && !customAmount)
                    ? 'bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-pink-500 to-purple-500 text-white'
                  }
                `}>
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Processing...
                    </span>
                  ) : (
                    <span className="flex items-center justify-center">
                      Support with ${showCustom ? customAmount || '0' : selectedAmount}
                      <span className="ml-2">❤️</span>
                    </span>
                  )}
                </div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onClose}
                disabled={loading}
                className="w-full py-3 text-gray-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 hover:border-white/20"
              >
                Maybe later
              </motion.button>
            </div>
            
            {/* Security Note */}
            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500 flex items-center justify-center">
                <span className="mr-1">🔒</span>
                Secure payment powered by Stripe
              </p>
            </div>
            
            {/* Decorative elements */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-purple-500/10 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-pink-500/10 rounded-full blur-3xl" />
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModernDonationPrompt;