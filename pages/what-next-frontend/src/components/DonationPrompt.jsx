import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

const DonationPrompt = ({ timeSaved, sessionId, onClose, show }) => {
  const [loading, setLoading] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState(5);
  const [customAmount, setCustomAmount] = useState('');
  const [showCustom, setShowCustom] = useState(false);
  
  const API_URL = import.meta.env.VITE_API_URL || 'https://what-next-prod.jhaladik.workers.dev';
  
  const suggestedAmounts = [
    { value: 3, label: '☕', title: 'Coffee', description: 'Buy me a coffee!' },
    { value: 5, label: '🍕', title: 'Pizza Slice', description: 'Awesome support!' },
    { value: 10, label: '🎬', title: 'Movie Ticket', description: 'Amazing!' },
    { value: 25, label: '🚀', title: 'Super Fan', description: 'Incredible!' }
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
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 md:p-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-gray-900 mb-2">
              🎉 Found Your Perfect Movies!
            </h2>
            <p className="text-lg text-gray-600">
              We saved you ~{timeSaved || 25} minutes of browsing
            </p>
            <p className="text-sm text-gray-500 mt-2">
              Help keep What Next free and ad-free for everyone
            </p>
          </div>
          
          {/* Amount Selection */}
          <div className="space-y-4 mb-6">
            <div className="grid grid-cols-2 gap-3">
              {suggestedAmounts.map((amount) => (
                <button
                  key={amount.value}
                  onClick={() => {
                    setSelectedAmount(amount.value);
                    setShowCustom(false);
                  }}
                  className={`
                    relative p-4 rounded-xl border-2 transition-all
                    ${!showCustom && selectedAmount === amount.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                  disabled={loading}
                >
                  <div className="text-2xl mb-1">{amount.label}</div>
                  <div className="font-bold text-lg">${amount.value}</div>
                  <div className="text-xs text-gray-500">{amount.title}</div>
                  {!showCustom && selectedAmount === amount.value && (
                    <div className="absolute top-2 right-2">
                      <div className="w-3 h-3 bg-primary-500 rounded-full"></div>
                    </div>
                  )}
                </button>
              ))}
            </div>
            
            {/* Custom Amount */}
            <button
              onClick={() => setShowCustom(!showCustom)}
              className={`
                w-full p-3 rounded-xl border-2 transition-all
                ${showCustom
                  ? 'border-primary-500 bg-primary-50'
                  : 'border-gray-200 hover:border-gray-300'
                }
              `}
              disabled={loading}
            >
              💝 Custom Amount
            </button>
            
            {showCustom && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                className="overflow-hidden"
              >
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
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
                    className="w-full pl-8 pr-3 py-3 border-2 border-gray-200 rounded-xl focus:border-primary-500 focus:outline-none"
                    autoFocus
                  />
                </div>
              </motion.div>
            )}
          </div>
          
          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleDonate}
              disabled={loading || (showCustom && !customAmount)}
              className={`
                w-full py-4 rounded-xl font-semibold text-white transition-all
                ${loading || (showCustom && !customAmount)
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-gradient-to-r from-primary-500 to-primary-600 hover:from-primary-600 hover:to-primary-700 transform hover:scale-[1.02]'
                }
              `}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin h-5 w-5 mr-3" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                `Support with $${showCustom ? customAmount || '0' : selectedAmount}`
              )}
            </button>
            
            <button
              onClick={onClose}
              disabled={loading}
              className="w-full py-3 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Maybe later
            </button>
          </div>
          
          {/* Security Note */}
          <div className="mt-4 text-center">
            <p className="text-xs text-gray-400">
              🔒 Secure payment powered by Stripe
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default DonationPrompt;