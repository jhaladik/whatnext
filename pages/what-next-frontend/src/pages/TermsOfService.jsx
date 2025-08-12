import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const TermsOfService = () => {
  const navigate = useNavigate();
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white p-4">
      <div className="max-w-4xl mx-auto py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl shadow-xl p-8"
        >
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Terms of Service</h1>
          <p className="text-sm text-gray-600 mb-6">Effective Date: August 12, 2025</p>
          <p className="text-sm text-gray-700 mb-8">Service Provider: Haládik Advisory s.r.o.</p>
          
          <div className="space-y-6 text-gray-700">
            <section>
              <h2 className="text-xl font-semibold mb-3">1. Service Description</h2>
              <p>What Next is a content recommendation service that helps you discover personalized content based on your preferences through interactive questions.</p>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">2. User Agreement</h2>
              <p className="mb-2">By using this service, you agree to:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Provide accurate information during the recommendation process</li>
                <li>Use the service for personal, non-commercial purposes</li>
                <li>Respect intellectual property rights of recommended content</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">3. Service Availability</h2>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Service is provided "as is" without warranties</li>
                <li>We reserve the right to modify or discontinue the service at any time</li>
                <li>Temporary interruptions may occur for maintenance</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">4. Data & Privacy</h2>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>We collect minimal data necessary to provide recommendations</li>
                <li>Personal data is processed in accordance with GDPR</li>
                <li>We do not sell your data to third parties</li>
                <li>Session data may be stored temporarily to improve recommendations</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">5. Limitation of Liability</h2>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Recommendations are suggestions only</li>
                <li>We are not responsible for the content or availability of recommended materials</li>
                <li>Use recommendations at your own discretion</li>
              </ul>
            </section>
            
            <section>
              <h2 className="text-xl font-semibold mb-3">6. Contact</h2>
              <p className="mb-2">For questions about these terms:</p>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="font-semibold">Haládik Advisory s.r.o.</p>
                <p>U družstva Práce 747/29, Praha - Podolí, 140 00</p>
                <p>Registration: C 187909, Municipal Court in Prague</p>
              </div>
            </section>
            
            <section className="pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">These terms are governed by Czech law.</p>
            </section>
          </div>
          
          <div className="mt-8 flex justify-center">
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-semibold transition-colors"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TermsOfService;