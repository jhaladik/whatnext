  1. Stripe Account Setup (if not done):
    - Sign up at https://dashboard.stripe.com
    - Get your API keys (test & production)
    - Configure your business details

  🏗️ Architecture Overview:

  Frontend (React)          Backend (Cloudflare Worker)         Stripe
       │                              │                           │
       ├─[Create Session]────────────►├──[Create Checkout]───────►│
       │                              │◄──[Session ID]────────────│
       │◄─────[Session URL]───────────│                           │
       │                                                          │
       ├─[Redirect to Stripe]────────────────────────────────────►│
       │                                                          │
       │◄─────[Success/Cancel]────────────────────────────────────│
       │                              │                           │
       ├─[Verify Success]─────────────►├──[Verify Payment]────────►│
       │◄─────[Confirmation]──────────│◄──[Payment Details]───────│

  📦 Implementation Steps:

  Phase 1: Backend Setup (Cloudflare Worker)

  1. Add Stripe API Endpoints:

  // workers/whatnext/src/routes/donation.js

  // POST /api/donation/create-checkout-session
  async function createCheckoutSession(request, env) {
    const { amount, sessionId, timeSaved } = await request.json();

    // Create Stripe checkout session
    const session = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]': 'card',
        'mode': 'payment',
        'success_url': `${env.FRONTEND_URL}/donation/success?session_id={CHECKOUT_SESSION_ID}`,
        'cancel_url': `${env.FRONTEND_URL}/donation/cancel`,
        'line_items[0][price_data][currency]': 'usd',
        'line_items[0][price_data][product_data][name]': 'Support What Next',
        'line_items[0][price_data][product_data][description]': `Thank you for supporting! You saved ${timeSaved} minutes`,      
        'line_items[0][price_data][unit_amount]': amount * 100, // Stripe uses cents
        'line_items[0][quantity]': 1,
        'metadata[whatnext_session_id]': sessionId,
        'metadata[time_saved]': timeSaved,
      })
    });

    return session.url; // Return checkout URL
  }

  // GET /api/donation/verify/:sessionId
  async function verifyDonation(sessionId, env) {
    // Verify payment with Stripe
    const session = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
      headers: {
        'Authorization': `Bearer ${env.STRIPE_SECRET_KEY}`,
      }
    });

    return session.payment_status === 'paid';
  }

  2. Add Webhook Handler (Optional but recommended):
  // POST /api/stripe/webhook
  async function handleStripeWebhook(request, env) {
    const signature = request.headers.get('stripe-signature');
    const body = await request.text();

    // Verify webhook signature
    // Process successful payments
    // Store donation records
  }

  Phase 2: Frontend Implementation

  1. Donation Component:

  // pages/what-next-frontend/src/components/DonationPrompt.jsx

  import { useState } from 'react';
  import { motion } from 'framer-motion';

  const DonationPrompt = ({ timeSaved, sessionId, onClose }) => {
    const [loading, setLoading] = useState(false);
    const [selectedAmount, setSelectedAmount] = useState(5);

    const suggestedAmounts = [
      { value: 3, label: '☕ Coffee', description: 'Thanks!' },
      { value: 5, label: '🍕 Slice', description: 'Awesome!' },
      { value: 10, label: '🎬 Movie', description: 'Amazing!' },
      { value: 25, label: '🚀 Super', description: 'Incredible!' }
    ];

    const handleDonate = async () => {
      setLoading(true);

      try {
        const response = await fetch(`${API_URL}/api/donation/create-checkout-session`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            amount: selectedAmount,
            sessionId,
            timeSaved
          })
        });

        const { checkoutUrl } = await response.json();
        window.location.href = checkoutUrl; // Redirect to Stripe
      } catch (error) {
        console.error('Donation error:', error);
        setLoading(false);
      }
    };

    return (
      <motion.div className="donation-modal">
        <h3>🎉 Found your perfect movies!</h3>
        <p>We saved you ~{timeSaved} minutes of browsing</p>

        <div className="amount-selector">
          {suggestedAmounts.map(amount => (
            <button
              key={amount.value}
              onClick={() => setSelectedAmount(amount.value)}
              className={selectedAmount === amount.value ? 'selected' : ''}
            >
              <span className="emoji">{amount.label}</span>
              <span className="price">${amount.value}</span>
            </button>
          ))}
        </div>

        <button
          onClick={handleDonate}
          disabled={loading}
          className="donate-btn"
        >
          {loading ? 'Processing...' : `Support with $${selectedAmount}`}
        </button>

        <button onClick={onClose} className="skip-btn">
          Maybe later
        </button>
      </motion.div>
    );
  };

  2. Success/Cancel Pages:

  // src/pages/DonationSuccess.jsx
  const DonationSuccess = () => {
    useEffect(() => {
      // Verify payment with backend
      const sessionId = new URLSearchParams(location.search).get('session_id');
      verifyPayment(sessionId);
    }, []);

    return (
      <div className="success-page">
        <h1>🎉 Thank You!</h1>
        <p>Your support means everything!</p>
        <button onClick={() => navigate('/')}>
          Find More Movies
        </button>
      </div>
    );
  };

  Phase 3: Integration Points

  1. When to Show Donation Prompt:

  // In App.jsx - After recommendations received
  const handleRecommendationsReceived = (recommendations) => {
    setRecommendations(recommendations);

    // Show donation prompt after 3 seconds
    setTimeout(() => {
      setShowDonationPrompt(true);
    }, 3000);
  };

  2. Donation Analytics:

  // Track donation events
  const trackDonation = async (event, data) => {
    await fetch('/api/analytics/donation', {
      method: 'POST',
      body: JSON.stringify({ event, ...data })
    });
  };

  🔑 Environment Variables Needed:

  Backend (wrangler.toml):
  [env.production.vars]
  STRIPE_PUBLISHABLE_KEY = "pk_live_..." # Actually use secrets for this
  FRONTEND_URL = "https://whatnext.pages.dev"
  ENABLE_DONATIONS = true

  # Use wrangler secret for this:
  # wrangler secret put STRIPE_SECRET_KEY

  Frontend (.env):
  VITE_STRIPE_PUBLISHABLE_KEY=pk_test_...
  VITE_API_URL=https://what-next-prod.jhaladik.workers.dev

  💰 Pricing Strategy:

  Suggested Donation Tiers:
  const DONATION_TIERS = {
    coffee: { amount: 3, icon: '☕', message: 'Buy me a coffee' },
    lunch: { amount: 10, icon: '🍕', message: 'Buy me lunch' },
    movies: { amount: 25, icon: '🎬', message: 'Movie night on you' },
    super: { amount: 50, icon: '🚀', message: 'Super supporter' }
  };

  Dynamic Suggestions Based on Usage:
  const suggestAmount = (timeSaved) => {
    if (timeSaved > 60) return 10;  // Saved an hour
    if (timeSaved > 30) return 5;   // Saved half hour
    return 3;                        // Default
  };

  🧪 Testing Strategy:

  1. Use Stripe Test Mode:
    - Test card: 4242 4242 4242 4242
    - Any future date, any CVC
  2. Test Scenarios:
    - Successful payment
    - Cancelled payment
    - Failed payment
    - Different amounts
    - Mobile vs desktop

  📊 Success Metrics:

  Track these metrics:
  - Donation conversion rate (target: 2-5%)
  - Average donation amount
  - Repeat donors
  - Time from recommendation to donation
  - Most popular donation amount

  🚀 Deployment Checklist:

  - Create Stripe account
  - Get API keys (test first, then production)
  - Implement backend endpoints
  - Add donation UI components
  - Test with Stripe test mode
  - Add error handling
  - Implement success/cancel pages
  - Add analytics tracking
  - Deploy to production
  - Switch to live keys
  - Monitor first donations

  ⏱️ Timeline:

  1. Day 1 (Today):
    - Set up Stripe account
    - Implement backend endpoints
    - Basic donation button
  2. Day 2:
    - Full UI implementation
    - Testing with test keys
    - Error handling
  3. Day 3:
    - Production deployment
    - Go live!

  Would you like me to start implementing this? I can begin with:
  1. Backend Stripe endpoints
  2. Frontend donation components
  3. Both simultaneously

  Let me know and I'll start coding!