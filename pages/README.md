# What Next - Frontend Specification
## Movie Recommendation App with Swipe Interface

**Version:** 1.0.0  
**Platform:** Cloudflare Pages + React  
**Backend:** Existing Cloudflare Worker API  
**Last Updated:** August 12, 2025

---

## 🎯 Project Overview

### Vision Statement
A beautiful, intuitive swipe-card interface that uses information theory to find users their perfect next movie in under 30 seconds, with optional donations to support the service.

### Core Value Proposition
- **Time Savings:** Skip 20+ minutes of endless browsing
- **Perfect Matches:** Information theory ensures highly relevant recommendations  
- **Zero Friction:** Swipe cards, no accounts, no complexity
- **Sustainable:** Donation-based model keeps it ad-free

---

## 🏗️ Technical Architecture

### Deployment Stack
```
┌─────────────────────┐    ┌─────────────────────┐
│  Cloudflare Pages   │    │  Cloudflare Worker  │
│                     │    │                     │
│  • React Frontend   │◄──►│  • Information API  │
│  • Static Assets    │    │  • Claude AI        │
│  • Edge Caching     │    │  • D1 Database      │
└─────────────────────┘    └─────────────────────┘
         │                            │
         ▼                            ▼
┌─────────────────────┐    ┌─────────────────────┐
│   Stripe/Payment    │    │   TMDB Movie API    │
│   Processing        │    │   Metadata          │
└─────────────────────┘    └─────────────────────┘
```

### Repository Structure
```
what-next-frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   ├── icons/
│   │   ├── icon-192.png
│   │   └── icon-512.png
│   └── og-image.jpg
├── src/
│   ├── components/
│   │   ├── SwipeCard/
│   │   │   ├── SwipeCard.jsx
│   │   │   ├── SwipeCard.css
│   │   │   └── index.js
│   │   ├── RecommendationCard/
│   │   │   ├── RecommendationCard.jsx
│   │   │   ├── RecommendationCard.css
│   │   │   └── index.js
│   │   ├── DonationModal/
│   │   │   ├── DonationModal.jsx
│   │   │   ├── DonationModal.css
│   │   │   └── index.js
│   │   ├── ProgressBar/
│   │   │   ├── ProgressBar.jsx
│   │   │   └── ProgressBar.css
│   │   └── Layout/
│   │       ├── Header.jsx
│   │       ├── Footer.jsx
│   │       └── Layout.css
│   ├── pages/
│   │   ├── Home/
│   │   │   ├── Home.jsx
│   │   │   └── Home.css
│   │   ├── Swipe/
│   │   │   ├── Swipe.jsx
│   │   │   └── Swipe.css
│   │   ├── Results/
│   │   │   ├── Results.jsx
│   │   │   └── Results.css
│   │   └── About/
│   │       ├── About.jsx
│   │       └── About.css
│   ├── services/
│   │   ├── apiClient.js
│   │   ├── donationService.js
│   │   ├── analyticsService.js
│   │   └── storageService.js
│   ├── hooks/
│   │   ├── useSwipeSession.js
│   │   ├── useDonations.js
│   │   ├── useRecommendations.js
│   │   └── useAnalytics.js
│   ├── utils/
│   │   ├── constants.js
│   │   ├── helpers.js
│   │   └── validation.js
│   ├── styles/
│   │   ├── globals.css
│   │   ├── variables.css
│   │   └── animations.css
│   ├── assets/
│   │   ├── images/
│   │   ├── icons/
│   │   └── lottie/
│   ├── App.jsx
│   ├── App.css
│   └── index.js
├── functions/
│   ├── donation-webhook.js
│   └── analytics.js
├── _headers
├── _redirects
├── package.json
├── wrangler.toml
├── README.md
└── .env.example
```

---

## 🎨 User Experience Design

### User Journey Flow
```
Landing Page → Start Button → Swipe Cards (3-5) → Results → Donation → Share/Restart
     ↓              ↓             ↓            ↓         ↓          ↓
   Hero CTA    Session Start   Information   Perfect   Optional   Viral Loop
   "Find It"      (API)        Gathering    Movies    Support    Growth
```

### Screen Specifications

#### 1. Landing Page (`/`)
**Purpose:** Convert visitors to users with clear value proposition

**Layout:**
```jsx
<Landing>
  <Hero>
    <h1>Skip the endless scroll.</h1>
    <h2>Find your perfect movie in 30 seconds.</h2>
    <StartButton>What should I watch?</StartButton>
  </Hero>
  
  <ValueProps>
    <Prop icon="⏱️" title="Save 20+ minutes" />
    <Prop icon="🎯" title="Perfect matches" />
    <Prop icon="🔒" title="No accounts needed" />
  </ValueProps>
  
  <SocialProof>
    <stat>2,847 movies found this week</stat>
    <testimonials>Recent happy users</testimonials>
  </SocialProof>
</Landing>
```

**Key Elements:**
- Prominent CTA button with engaging copy
- Clear time-saving value proposition  
- Social proof counters (live from API)
- Mobile-first responsive design
- Fast loading with critical CSS inlined

#### 2. Swipe Interface (`/swipe`)
**Purpose:** Gather user preferences through intuitive card interactions

**Card Design:**
```jsx
<SwipeCard>
  <CardContent>
    <LeftOption>
      <Icon>🛋️</Icon>
      <Title>Comfort Zone</Title>
      <Subtitle>Familiar & relaxing</Subtitle>
    </LeftOption>
    
    <Divider>or</Divider>
    
    <RightOption>
      <Icon>🧠</Icon>
      <Title>Challenge Mode</Title>
      <Subtitle>Mind-bending & new</Subtitle>
    </RightOption>
  </CardContent>
  
  <SwipeHints>
    <LeftHint>← Swipe for comfort</LeftHint>
    <RightHint>Swipe for challenge →</RightHint>
  </SwipeHints>
</SwipeCard>
```

**Interaction Patterns:**
- **Swipe Left:** Select left option
- **Swipe Right:** Select right option  
- **Tap:** Show enlarged view with more context
- **Pull Up:** Skip question (if allowed)

**Animation Requirements:**
- Smooth 60fps card transitions
- Physics-based swipe resistance
- Card rotation on drag (max 15 degrees)
- Satisfying snap-back or fly-away animations
- Progress bar updates with each swipe

#### 3. Results Page (`/results`)
**Purpose:** Display personalized recommendations with clear next actions

**Layout:**
```jsx
<Results>
  <Header>
    <Title>Perfect matches for you</Title>
    <Stats>Found in {sessionTime}s • {confidence}% confident</Stats>
  </Header>
  
  <RecommendationGrid>
    {recommendations.map(movie => (
      <MovieCard key={movie.id}>
        <Poster src={movie.poster} alt={movie.title} />
        <Info>
          <Title>{movie.title}</Title>
          <Year>{movie.year}</Year>
          <Reasoning>{movie.whyRecommended}</Reasoning>
          <Actions>
            <WatchButton platform={movie.streamingOn} />
            <TrailerButton />
            <FeedbackButtons />
          </Actions>
        </Info>
      </MovieCard>
    ))}
  </RecommendationGrid>
  
  <Actions>
    <DonateButton>Worth a dollar? ❤️</DonateButton>
    <RestartButton>Find another movie</RestartButton>
    <ShareButton>Share with friends</ShareButton>
  </Actions>
</Results>
```

#### 4. Donation Modal
**Purpose:** Convert satisfied users to supporters with elegant, non-pushy interface

**Design:**
```jsx
<DonationModal>
  <Header>
    <Icon>⏱️</Icon>
    <Title>You just saved ~{timeSaved} minutes!</Title>
    <Subtitle>What's that worth to you?</Subtitle>
  </Header>
  
  <ValueExplanation>
    <p>Finding that perfect movie would have taken {timeSaved} minutes of browsing.</p>
    <p>Support ad-free recommendations for everyone.</p>
  </ValueExplanation>
  
  <DonationOptions>
    <QuickAmount value="1" label="$1 ☕" />
    <QuickAmount value="5" label="$5 🍔" recommended />
    <QuickAmount value="10" label="$10 🎬" />
    <CustomInput placeholder="$" />
  </DonationOptions>
  
  <SocialProof>
    <p>{weeklyDonors} people donated this week</p>
    <p>Average: ${avgDonation}</p>
  </SocialProof>
  
  <Actions>
    <DonateButton>Support the service</DonateButton>
    <SkipButton>Maybe next time</SkipButton>
  </Actions>
</DonationModal>
```

---

## 🔧 Technical Implementation

### Core Dependencies
```json
{
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "framer-motion": "^10.16.4",
    "react-router-dom": "^6.8.0",
    "react-spring": "^9.7.0",
    "react-use-gesture": "^9.1.3",
    "@stripe/stripe-js": "^2.1.7",
    "react-intersection-observer": "^9.5.2",
    "react-hot-toast": "^2.4.1"
  },
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.3",
    "vite": "^4.4.5",
    "eslint": "^8.45.0",
    "prettier": "^3.0.0",
    "autoprefixer": "^10.4.14",
    "tailwindcss": "^3.3.3"
  }
}
```

### API Client Service
```javascript
// src/services/apiClient.js
class WhatNextAPI {
  constructor() {
    this.baseURL = 'https://what-next-prod.jhaladik.workers.dev';
    this.sessionId = null;
  }

  async startSession() {
    const response = await fetch(`${this.baseURL}/api/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    this.sessionId = data.sessionId;
    return data;
  }

  async submitChoice(questionId, choice, responseTime) {
    const response = await fetch(`${this.baseURL}/api/swipe/${this.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        questionId,
        choice,
        responseTime
      })
    });
    
    return response.json();
  }

  async submitFeedback(rating, feedback) {
    const response = await fetch(`${this.baseURL}/api/feedback/${this.sessionId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating,
        feedback
      })
    });
    
    return response.json();
  }
}

export default new WhatNextAPI();
```

### Swipe Hook Implementation
```javascript
// src/hooks/useSwipeSession.js
import { useState, useCallback } from 'react';
import apiClient from '../services/apiClient';

export const useSwipeSession = () => {
  const [state, setState] = useState({
    sessionId: null,
    currentQuestion: null,
    progress: 0,
    recommendations: [],
    isLoading: false,
    error: null
  });

  const startSession = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const data = await apiClient.startSession();
      setState(prev => ({
        ...prev,
        sessionId: data.sessionId,
        currentQuestion: data.question,
        progress: data.progress,
        isLoading: false
      }));
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, []);

  const submitChoice = useCallback(async (questionId, choice, responseTime) => {
    setState(prev => ({ ...prev, isLoading: true }));
    
    try {
      const data = await apiClient.submitChoice(questionId, choice, responseTime);
      
      if (data.type === 'recommendations') {
        setState(prev => ({
          ...prev,
          recommendations: data.recommendations,
          progress: 100,
          isLoading: false
        }));
      } else {
        setState(prev => ({
          ...prev,
          currentQuestion: data.question,
          progress: data.progress,
          isLoading: false
        }));
      }
    } catch (error) {
      setState(prev => ({
        ...prev,
        error: error.message,
        isLoading: false
      }));
    }
  }, []);

  return {
    ...state,
    startSession,
    submitChoice
  };
};
```

### Animation Configuration
```javascript
// src/utils/animations.js
export const cardVariants = {
  initial: {
    scale: 0.8,
    opacity: 0,
    rotateY: -30
  },
  animate: {
    scale: 1,
    opacity: 1,
    rotateY: 0,
    transition: {
      duration: 0.6,
      ease: "easeOut"
    }
  },
  exit: {
    scale: 0.8,
    opacity: 0,
    rotateY: 30,
    transition: {
      duration: 0.4
    }
  }
};

export const swipeConstraints = {
  left: -200,
  right: 200,
  top: 0,
  bottom: 0
};

export const dragConfig = {
  damping: 60,
  stiffness: 300
};
```

---

## 💰 Donation System

### Payment Integration
**Provider:** Stripe Elements for secure processing

**Flow:**
1. User completes recommendations
2. Show donation modal with value proposition
3. User selects amount or enters custom
4. Stripe Elements handles payment securely
5. Success confirmation with thank you message
6. Optional: Social sharing with donation badge

### Donation Service
```javascript
// src/services/donationService.js
import { loadStripe } from '@stripe/stripe-js';

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY);

class DonationService {
  async createPaymentIntent(amount, metadata = {}) {
    const response = await fetch('/api/create-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: amount * 100, // Convert to cents
        currency: 'usd',
        metadata: {
          sessionId: metadata.sessionId,
          timeSaved: metadata.timeSaved,
          recommendations: metadata.recommendations
        }
      })
    });
    
    return response.json();
  }

  async processPayment(clientSecret, paymentMethod) {
    const stripe = await stripePromise;
    
    return stripe.confirmCardPayment(clientSecret, {
      payment_method: paymentMethod
    });
  }
}

export default new DonationService();
```

### Donation Analytics
Track donation conversion to optimize prompts:

```javascript
// src/utils/donationAnalytics.js
export const trackDonationFunnel = {
  modalShown: (sessionId, timeSaved) => {
    // Track when donation modal appears
    analytics.track('donation_modal_shown', {
      session_id: sessionId,
      time_saved: timeSaved
    });
  },
  
  amountSelected: (amount, method) => {
    // Track donation amount selection
    analytics.track('donation_amount_selected', {
      amount,
      method // 'preset' or 'custom'
    });
  },
  
  paymentCompleted: (amount, sessionId) => {
    // Track successful donations
    analytics.track('donation_completed', {
      amount,
      session_id: sessionId
    });
  },
  
  modalDismissed: (reason) => {
    // Track when users dismiss without donating
    analytics.track('donation_modal_dismissed', {
      reason // 'skip_button', 'outside_click', 'escape_key'
    });
  }
};
```

---

## 🎯 Performance Optimization

### Core Web Vitals Targets
- **Largest Contentful Paint (LCP):** < 2.5s
- **First Input Delay (FID):** < 100ms  
- **Cumulative Layout Shift (CLS):** < 0.1

### Optimization Strategies

#### Bundle Optimization
```javascript
// vite.config.js
export default {
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          animations: ['framer-motion', 'react-spring'],
          payment: ['@stripe/stripe-js']
        }
      }
    }
  }
};
```

#### Image Optimization
- Poster images: WebP format with AVIF fallback
- Lazy loading with Intersection Observer
- Responsive images with `srcset`
- Cloudflare Image Resizing for optimization

#### Caching Strategy
```javascript
// _headers file for Cloudflare Pages
/*
  Cache-Control: public, max-age=31536000, immutable
  
/*.html
  Cache-Control: public, max-age=3600
  
/api/*
  Cache-Control: no-cache
```

### Error Handling & Fallbacks
```javascript
// src/components/ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Log to analytics service
    analytics.track('frontend_error', {
      error: error.message,
      stack: error.stack,
      component: errorInfo.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFallback>
          <h2>Something went wrong 😔</h2>
          <p>We've been notified and will fix this soon.</p>
          <button onClick={() => window.location.reload()}>
            Try again
          </button>
        </ErrorFallback>
      );
    }

    return this.props.children;
  }
}
```

---

## 🚀 Deployment Configuration

### Cloudflare Pages Setup
```toml
# wrangler.toml
name = "what-next-frontend"
compatibility_date = "2023-08-14"

[build]
command = "npm run build"
destination = "dist"

[[redirects]]
from = "/*"
to = "/index.html"
status = 200

[env.production.vars]
REACT_APP_API_URL = "https://what-next-prod.jhaladik.workers.dev"
REACT_APP_STRIPE_PUBLIC_KEY = "pk_live_..."
REACT_APP_ANALYTICS_ID = "G-..."
```

### Environment Variables
```bash
# .env.example
REACT_APP_API_URL=https://what-next-prod.jhaladik.workers.dev
REACT_APP_STRIPE_PUBLIC_KEY=pk_test_...
REACT_APP_ANALYTICS_ID=G-XXXXXXXXXX
REACT_APP_SENTRY_DSN=https://...
REACT_APP_VERSION=$npm_package_version
```

### CI/CD Pipeline
```yaml
# .github/workflows/deploy.yml
name: Deploy to Cloudflare Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm run test
      
      - name: Build project
        run: npm run build
        env:
          REACT_APP_API_URL: ${{ secrets.API_URL }}
          REACT_APP_STRIPE_PUBLIC_KEY: ${{ secrets.STRIPE_PUBLIC_KEY }}
      
      - name: Deploy to Cloudflare Pages
        uses: cloudflare/pages-action@v1
        with:
          apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
          projectName: what-next-frontend
          directory: dist
```

---

## 📊 Analytics & Monitoring

### Key Metrics to Track

#### User Engagement
- Session completion rate
- Average time per session
- Questions answered before completion
- Return user percentage

#### Recommendation Quality
- User satisfaction ratings (1-5 stars)
- Click-through rate to recommended movies
- Feedback sentiment analysis
- Time spent on results page

#### Business Metrics
- Donation conversion rate
- Average donation amount
- Revenue per user
- User lifetime value

#### Technical Performance  
- Page load times (Core Web Vitals)
- API response times
- Error rates and types
- Browser/device usage patterns

### Analytics Implementation
```javascript
// src/services/analyticsService.js
class AnalyticsService {
  constructor() {
    // Initialize Google Analytics 4
    gtag('config', process.env.REACT_APP_ANALYTICS_ID);
  }

  trackEvent(eventName, parameters) {
    gtag('event', eventName, parameters);
  }

  trackUserJourney = {
    sessionStarted: () => {
      this.trackEvent('session_started', {
        timestamp: Date.now()
      });
    },

    questionAnswered: (questionId, choice, responseTime) => {
      this.trackEvent('question_answered', {
        question_id: questionId,
        choice,
        response_time: responseTime
      });
    },

    recommendationsReceived: (count, sessionTime) => {
      this.trackEvent('recommendations_received', {
        recommendation_count: count,
        session_duration: sessionTime
      });
    },

    movieClicked: (movieTitle, position) => {
      this.trackEvent('movie_clicked', {
        movie_title: movieTitle,
        position_in_results: position
      });
    },

    donationCompleted: (amount) => {
      this.trackEvent('donation_completed', {
        value: amount,
        currency: 'USD'
      });
    }
  };
}

export default new AnalyticsService();
```

---

## 🧪 Testing Strategy

### Unit Testing
```javascript
// src/components/__tests__/SwipeCard.test.js
import { render, screen, fireEvent } from '@testing-library/react';
import SwipeCard from '../SwipeCard/SwipeCard';

describe('SwipeCard', () => {
  const mockQuestion = {
    id: 'test-question',
    text: 'Test question?',
    options: [
      { id: 'left', text: 'Left option' },
      { id: 'right', text: 'Right option' }
    ]
  };

  test('renders question and options correctly', () => {
    render(<SwipeCard question={mockQuestion} onSwipe={jest.fn()} />);
    
    expect(screen.getByText('Test question?')).toBeInTheDocument();
    expect(screen.getByText('Left option')).toBeInTheDocument();
    expect(screen.getByText('Right option')).toBeInTheDocument();
  });

  test('calls onSwipe with correct choice when swiped', () => {
    const mockOnSwipe = jest.fn();
    render(<SwipeCard question={mockQuestion} onSwipe={mockOnSwipe} />);
    
    const card = screen.getByTestId('swipe-card');
    fireEvent.touchStart(card, { touches: [{ clientX: 100 }] });
    fireEvent.touchMove(card, { touches: [{ clientX: 200 }] });
    fireEvent.touchEnd(card);
    
    expect(mockOnSwipe).toHaveBeenCalledWith('right');
  });
});
```

### Integration Testing
```javascript
// src/__tests__/userJourney.test.js
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import App from '../App';
import * as apiClient from '../services/apiClient';

jest.mock('../services/apiClient');

describe('User Journey Integration', () => {
  test('complete recommendation flow', async () => {
    // Mock API responses
    apiClient.startSession.mockResolvedValue({
      sessionId: 'test-session',
      question: { id: 'q1', text: 'Question 1' },
      progress: 25
    });

    apiClient.submitChoice.mockResolvedValue({
      type: 'recommendations',
      recommendations: [
        { title: 'Test Movie', year: 2023 }
      ]
    });

    render(
      <BrowserRouter>
        <App />
      </BrowserRouter>
    );

    // Start session
    fireEvent.click(screen.getByText('What should I watch?'));
    
    await waitFor(() => {
      expect(screen.getByText('Question 1')).toBeInTheDocument();
    });

    // Answer question
    fireEvent.click(screen.getByTestId('swipe-right'));
    
    await waitFor(() => {
      expect(screen.getByText('Test Movie')).toBeInTheDocument();
    });
  });
});
```

### E2E Testing with Playwright
```javascript
// tests/e2e/recommendation-flow.spec.js
import { test, expect } from '@playwright/test';

test('complete recommendation flow', async ({ page }) => {
  await page.goto('/');
  
  // Start session
  await page.click('text=What should I watch?');
  
  // Answer questions by swiping
  for (let i = 0; i < 5; i++) {
    await page.waitForSelector('[data-testid="swipe-card"]');
    await page.locator('[data-testid="swipe-card"]').swipe({ dx: 100, dy: 0 });
  }
  
  // Check results
  await expect(page.locator('text=Perfect matches for you')).toBeVisible();
  await expect(page.locator('[data-testid="movie-card"]')).toHaveCount(3);
  
  // Test donation flow
  await page.click('text=Worth a dollar?');
  await expect(page.locator('[data-testid="donation-modal"]')).toBeVisible();
});
```

---

## 🔒 Security Considerations

### Content Security Policy
```javascript
// public/_headers
/*
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.googletagmanager.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.stripe.com https://what-next-prod.jhaladik.workers.dev; frame-src https://js.stripe.com;
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  X-XSS-Protection: 1; mode=block
  Referrer-Policy: strict-origin-when-cross-origin
```

### Input Sanitization
```javascript
// src/utils/validation.js
export const sanitizeInput = (input) => {
  return input
    .trim()
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .substring(0, 1000); // Limit length
};

export const validateDonationAmount = (amount) => {
  const num = parseFloat(amount);
  return !isNaN(num) && num > 0 && num <= 10000;
};
```

### API Communication
- All API calls over HTTPS only
- Request timeout limits (10s max)
- Rate limiting on client side
- Input validation before sending
- Error messages don't expose internal details

---

## 📱 Progressive Web App Features

### Manifest Configuration
```json
{
  "name": "What Next - Movie Recommendations",
  "short_name": "What Next",
  "description": "Find your perfect movie in 30 seconds",
  "start_url": "/",
  "display": "standalone",
  "orientation": "portrait",
  "theme_color": "#6366f1",
  "background_color": "#1f2937",
  "categories": ["entertainment", "lifestyle"],
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png", 
      "sizes": "512x512",
      "type": "image/png"
    }
  ]
}
```

### Service Worker (Optional)
```javascript
// public/sw.js - Basic caching for offline functionality
const CACHE_NAME = 'what-next-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/icons/icon-192.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => response || fetch(event.request))
  );
});
```

---

## 🎨 Brand & Visual Identity

### Color Palette
```css
/* src/styles/variables.css */
:root {
  /* Primary Colors */
  --primary-50: #eff6ff;
  --primary-500: #3b82f6;  /* Main brand blue */
  --primary-600: #2563eb;
  --primary-900: #1e3a8a;
  
  /* Accent Colors */
  --accent-yellow: #fbbf24;  /* Success/positive actions */
  --accent-pink: #ec4899;    /* Donation/support actions */
  --accent-green: #10b981;   /* Confirmation states */
  
  /* Neutral Colors */
  --gray-50: #f9fafb;
  --gray-100: #f3f4f6;
  --gray-500: #6b7280;
  --gray-900: #111827;
  
  /* Semantic Colors */
  --error: #ef4444;
  --warning: #f59e0b;
  --success: #10b981;
  --info: #3b82f6;
}
```

### Typography Scale
```css
/* Typography */
:root {
  --font-display: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  --font-body: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  
  /* Font Sizes */
  --text-xs: 0.75rem;    /* 12px */
  --text-sm: 0.875rem;   /* 14px */
  --text-base: 1rem;     /* 16px */
  --text-lg: 1.125rem;   /* 18px */
  --text-xl: 1.25rem;    /* 20px */
  --text-2xl: 1.5rem;    /* 24px */
  --text-3xl: 1.875rem;  /* 30px */
  --text-4xl: 2.25rem;   /* 36px */
}
```

### Component Styling Guidelines
- **Cards:** Subtle shadows, rounded corners (8px), smooth hover states
- **Buttons:** Clear hierarchy (primary/secondary/tertiary), consistent padding
- **Animations:** Smooth 60fps, respectful of reduced motion preferences
- **Mobile First:** All designs start mobile, progressively enhance
- **Dark Mode:** Optional dark theme support

---

## 🚀 Launch Strategy

### Phase 1: MVP Launch (Week 1-2)
**Core Features:**
- Landing page with clear value prop
- 3-5 swipe questions maximum
- Basic movie recommendations
- Simple donation modal
- Mobile-optimized experience

**Success Metrics:**
- 50+ daily active users
- 40%+ completion rate
- $1+ average donation
- <3s load time

### Phase 2: Optimization (Week 3-4) 
**Enhancements:**
- A/B test different question sets
- Improve recommendation algorithm
- Add movie trailer integration
- Enhanced donation UX
- Social sharing features

**Success Metrics:**
- 200+ daily active users
- 60%+ completion rate  
- 5%+ donation conversion rate
- 4.5+ user satisfaction rating

### Phase 3: Growth (Month 2)
**New Features:**
- PWA installation prompts
- Different content types (shows, documentaries)
- User feedback loop
- Viral sharing mechanics
- Advanced analytics dashboard

**Success Metrics:**
- 1000+ daily active users
- Viral coefficient > 0.3
- $100+ monthly recurring donations
- Feature requests and community engagement

---

## 📋 Development Checklist

### Pre-Launch Checklist
- [ ] Core components built and tested
- [ ] API integration working correctly
- [ ] Donation flow tested with Stripe test mode
- [ ] Mobile responsive design verified
- [ ] Performance optimization completed
- [ ] Analytics tracking implemented
- [ ] Error handling and fallbacks in place
- [ ] Accessibility audit completed
- [ ] Security headers configured
- [ ] Domain setup and SSL certificate
- [ ] Social media preview images
- [ ] Terms of service and privacy policy

### Post-Launch Monitoring
- [ ] Real User Monitoring (RUM) setup
- [ ] Error tracking with Sentry
- [ ] User feedback collection system
- [ ] Donation tracking and reporting
- [ ] A/B test framework ready
- [ ] Performance monitoring alerts
- [ ] Analytics dashboard setup
- [ ] User support system

---

## 🎯 Success Criteria

### Week 1 Goals
- **Users:** 50 daily active users
- **Completion:** 40% of sessions complete
- **Performance:** <3s load time, 95% uptime
- **Quality:** 4+ average satisfaction rating

### Month 1 Goals  
- **Users:** 500 daily active users
- **Revenue:** $200+ monthly donations
- **Engagement:** 60% completion rate
- **Growth:** 20% week-over-week growth

### Month 3 Goals
- **Users:** 2000+ daily active users
- **Revenue:** $1000+ monthly donations  
- **Viral Growth:** 0.3+ viral coefficient
- **Product:** Feature requests from happy users

---

This specification provides a complete roadmap for building a beautiful, performant React frontend that leverages your sophisticated information theory backend. The swipe interface will be intuitive for users while the donation system creates sustainable revenue to support the service.

Ready to start building? I'd recommend beginning with the core SwipeCard component and API integration, then progressively adding the donation system and polish features.