# What Next Frontend - Modern Content Discovery UI 🎬

The beautiful, responsive frontend for What Next - an AI-powered content recommendation engine that helps users find their perfect movie, TV series, or documentary in 30 seconds.

## 🎯 Current Status: LIVE & OPERATIONAL

✅ **Production URL**: https://whatnext.pages.dev  
✅ **Backend API**: https://what-next-prod.jhaladik.workers.dev  
✅ **Status**: Fully functional with all features working
✅ **Version**: 3.0.0  
✅ **Last Updated**: December 2024

## 🚀 Current Production Features

### Core Features ✅
- **Swipe Interface**: Tinder-like card swiping with smooth animations
- **Smart Movie Discovery**: 5-7 questions lead to 5 perfect recommendations
- **Find More Movies**: Get additional recommendations with same preferences (excludes already shown)
- **TMDB Integration**: Rich movie data with posters, ratings, cast, runtime
- **Stripe Donations**: Full payment integration for supporting the project
- **Terms of Service**: Legal compliance with integrated ToS page
- **Responsive Design**: Optimized for mobile and desktop
- **Progress Tracking**: Visual progress bar showing session completion

### User Flow ✅
1. Landing page with clear value proposition
2. One-click start (defaults to movies domain)
3. 5-7 adaptive questions using information theory
4. AI-powered recommendations via Claude 3.5 Sonnet
5. Results page with enriched movie data
6. "Find more movies" button for additional recommendations
7. Optional donation prompt to support the project

## 🛠️ Tech Stack

- **React 19** - UI framework
- **Vite** - Build tool and dev server
- **Tailwind CSS** - Styling
- **Framer Motion** - Animations
- **React Hot Toast** - Notifications
- **Cloudflare Pages** - Deployment

## 📦 Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 🔧 Configuration

Create a `.env` file based on `.env.example`:

```env
VITE_API_URL=https://what-next-prod.jhaladik.workers.dev
```

## 🚀 Deployment

Deploy to Cloudflare Pages:

```bash
# Deploy to production
npm run deploy

# Deploy preview branch
npm run deploy:preview
```

## 🏗️ Project Structure

```
src/
├── components/
│   ├── SwipeCard.jsx       # Main swipe interaction component
│   └── RecommendationCard.jsx # Movie result display
├── hooks/
│   └── useSwipeSession.js  # Session management hook
├── services/
│   └── apiClient.js        # Backend API integration
├── App.jsx                 # Main application
└── App.css                 # Global styles
```

## 🎯 How It Works

1. **Landing Page**: User clicks "What should I watch?"
2. **Domain Selection**: Choose Movies or General Content
3. **Swipe Questions**: Answer 4-6 binary questions by swiping
4. **AI Recommendations**: Get 3 perfect movie matches
5. **Rich Results**: See posters, ratings, trailers, streaming info

## 🔌 API Integration

The frontend connects to the What Next backend API:

### Session Management
- `POST /api/start` - Start a new session (defaults to movies)
- `POST /api/swipe/:sessionId` - Submit answers and get next question/recommendations
- `POST /api/more-recommendations/:sessionId` - Get more movies with same preferences

### Donation System
- `POST /api/donation/create-checkout` - Create Stripe checkout session
- `GET /api/donation/verify/:stripeSessionId` - Verify payment completion

### Feedback
- `POST /api/feedback/:sessionId` - Submit recommendation feedback

## 🎨 Component Features

### SwipeCard
- Drag gestures with Framer Motion
- Visual feedback during swipe
- Click support for non-touch devices
- Loading states
- Auto-progress after each swipe

### RecommendationCard
- TMDB poster display with fallback
- Rating display (7.7/10 format)
- Cast and director information
- Runtime and genre badges
- Year of release
- Detailed plot descriptions
- Feedback buttons (thumbs up/down)

### DonationPrompt
- Stripe integration for payments
- Dynamic pricing based on time saved
- Success/cancel page routing
- Secure checkout flow

## 📱 Responsive Design

- Mobile-first approach
- Touch-optimized swipe gestures
- Adaptive layouts for all screen sizes
- Progressive enhancement

## ✅ Recent Fixes & Improvements

### December 2024 Updates
- ✅ Fixed "Find more movies" 500 error - session now persists after recommendations
- ✅ Implemented movie exclusion to prevent duplicate recommendations
- ✅ Removed domain selector modal - defaults directly to movies
- ✅ Fixed Stripe donation integration (bypassed problematic abstraction layers)
- ✅ Added Terms of Service page from ToS.md
- ✅ Fixed "Find more movies" to skip questions and use same preferences
- ✅ Resolved `.toFixed()` error with non-numeric ratings
- ✅ Fixed card animation issues (no more stuck at 60% angle)
- ✅ Improved state management for recommendations display

## 🔮 Next Phase Features

### Immediate Priorities
- [x] Donation system with Stripe integration ✅ DONE
- [x] "Find more movies" feature ✅ DONE
- [x] Terms of Service page ✅ DONE
- [ ] Save/share recommendations functionality
- [ ] Export recommendations to watchlist
- [ ] Performance metrics dashboard

### Phase 2 Enhancements
- [ ] PWA features (offline support, installable)
- [ ] Social sharing with preview cards
- [ ] User accounts with preference history
- [ ] More content domains (Books, Restaurants, Games)
- [ ] Analytics tracking with privacy focus
- [ ] A/B testing framework for questions

## 📊 Current Metrics

- **Response Time**: < 100ms for API calls
- **Question Flow**: 5-7 questions, ~30 seconds total
- **Recommendations**: 5 personalized results per request
- **Success Rate**: 100% completion for valid sessions
- **Movie Exclusion**: Prevents duplicate recommendations
- **Session Duration**: 1 hour timeout
- **Rate Limiting**: 60 requests/minute per IP

## 📄 License

MIT

## 🤝 Contributing

Pull requests welcome! Please read the contribution guidelines first.

---

Built with ❤️ using React and Cloudflare Pages