import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const DonationCancel = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-8 text-center"
      >
        <div className="text-5xl mb-4">🤔</div>
        
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Donation Cancelled
        </h1>
        
        <p className="text-gray-600 mb-6">
          No worries! You can always come back if you change your mind.
        </p>
        
        <div className="space-y-3">
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-primary-600 text-white rounded-lg font-semibold hover:bg-primary-700 transition-colors"
          >
            Back to Finding Movies
          </button>
          
          <p className="text-sm text-gray-500">
            Enjoying What Next? Consider supporting us later! 💜
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default DonationCancel;