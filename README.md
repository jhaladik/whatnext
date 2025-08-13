# What Next - AI-Powered Content Recommendation Engine 🎬📺🎥

Skip the endless scroll. Find your perfect movie, TV series, or documentary in 30 seconds.

## 🚀 Live Demo
**Frontend**: https://whatnext.pages.dev  
**API**: https://what-next-prod.jhaladik.workers.dev

## ✨ Features

### Multiple Content Domains
- **Movies** 🎬 - Feature films for every mood
- **TV Series** 📺 - Binge-worthy shows & series  
- **Documentaries** 🎥 - Real stories & learning

### Smart Recommendation System
- **Information Theory-Based Questions** - Each question maximizes information gain
- **Visual Emojis** - Every option has memorable emojis for better engagement
- **Adaptive Learning** - System learns from your feedback (Like ❤️, Dislike 👎, Already Seen 👁️)
- **Quick Results** - Get 5 personalized recommendations in under 30 seconds

### User Feedback Loop
- **Like/Dislike/Viewed Buttons** - Mark your preferences on each recommendation
- **Smart "Find More"** - Next batch uses your feedback for better matches
- **Persistent Preferences** - System remembers what you liked/disliked

### Modern UI/UX
- **Domain Selector** - Sleek dropdown to switch between Movies/Series/Documentaries
- **Swipe Interface** - Tinder-like card swiping for questions
- **Responsive Design** - Works perfectly on mobile and desktop
- **Dark Mode** - Easy on the eyes with beautiful gradients

### Support Features
- **Donation System** - Optional support via Stripe (appears after 60 seconds)
- **No Account Required** - Start immediately without signup
- **Privacy-First** - No personal data tracking

## 🛠️ Tech Stack

### Backend (Cloudflare Workers)
- **Runtime**: Cloudflare Workers (Edge Computing)
- **Database**: D1 (SQLite) for persistent data
- **Cache**: KV Storage for sessions and caching
- **AI**: Claude 3.5 Sonnet for recommendations
- **Payments**: Stripe integration for donations

### Frontend (React + Vite)
- **Framework**: React 19 with Vite
- **Styling**: Tailwind CSS with custom animations
- **Animation**: Framer Motion for smooth transitions
- **Routing**: React Router for navigation
- **Notifications**: React Hot Toast

## 📁 Project Structure

```
WHATNEXT/
├── workers/
│   └── whatnext/                 # Backend Cloudflare Worker
│       ├── src/
│       │   ├── index.js          # Main API router
│       │   ├── services/         # Business logic
│       │   │   ├── questionService.js     # Question selection AI
│       │   │   ├── recommendationService.js # Claude AI integration
│       │   │   ├── domainService.js      # Domain-specific logic
│       │   │   └── donationService.js    # Stripe payments
│       │   └── utils/            # Utilities
│       └── migrations/           # Database migrations
│
└── pages/
    └── what-next-frontend/       # Frontend React app
        ├── src/
        │   ├── App.jsx           # Main application
        │   ├── components/       # UI components
        │   │   ├── ModernSwipeCard.jsx    # Question cards
        │   │   ├── ModernRecommendationCard.jsx # Results
        │   │   ├── DomainSelector.jsx     # Domain switcher
        │   │   └── FeedbackButtons.jsx    # Like/dislike UI
        │   └── hooks/            # Custom React hooks
        └── dist/                 # Production build
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- Cloudflare account (free tier works)
- Wrangler CLI (`npm install -g wrangler`)

### Backend Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/whatnext.git
cd whatnext/workers/whatnext
```

2. Install dependencies:
```bash
npm install
```

3. Configure Cloudflare:
```bash
wrangler login
```

4. Create D1 database:
```bash
wrangler d1 create what-next-db
```

5. Update `wrangler.toml` with your database ID

6. Run migrations:
```bash
npm run db:migrate:remote
```

7. Set secrets:
```bash
wrangler secret put CLAUDE_API_KEY
wrangler secret put STRIPE_SECRET_KEY
wrangler secret put ANALYTICS_SECRET
```

8. Deploy:
```bash
npm run deploy:production
```

### Frontend Setup

1. Navigate to frontend:
```bash
cd pages/what-next-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment:
```bash
cp .env.example .env
# Edit .env with your API URL
```

4. Run development server:
```bash
npm run dev
```

5. Deploy to Cloudflare Pages:
```bash
npm run deploy:production
```

## 📊 Database Schema

### Main Tables
- **interactions** - User session tracking and analytics
- **questions** - Question library with options and emojis
- **question_performance** - ML metrics for question optimization
- **recommendation_feedback** - User feedback (liked/disliked/viewed)
- **donations** - Stripe payment tracking
- **domains** - Configuration for Movies/Series/Documentaries

## 🔍 API Endpoints

### Public Endpoints
- `GET /api/domains` - Get available content domains
- `POST /api/start` - Start new recommendation session
- `POST /api/swipe/:sessionId` - Submit answer and get next question
- `POST /api/more-recommendations/:sessionId` - Get more recommendations with feedback
- `POST /api/feedback/:sessionId` - Submit feedback on recommendations

### Analytics (Protected)
- `GET /api/analytics/:timeframe` - System analytics dashboard
- `GET /api/donation/stats/:timeframe` - Donation statistics

## 🎨 Key Features Explained

### Information Theory Algorithm
The system uses entropy calculations to select questions that maximize information gain. Each question reduces the uncertainty about user preferences by the maximum possible amount.

### Feedback Learning
When users mark content as liked/disliked/viewed, the system:
1. Stores feedback in database
2. Uses it to improve next batch of recommendations
3. Analyzes patterns for future users

### Domain-Specific Questions
Each domain has tailored questions with appropriate emojis:
- **Movies**: Mood, genre, era, runtime
- **Series**: Episode length, completion status, prestige vs guilty pleasure
- **Documentaries**: Educational vs emotional, topic depth, visual style

## 📈 Analytics & Monitoring

The system tracks (privacy-preserving):
- Session completion rates
- Question performance metrics
- User feedback patterns
- Donation conversion rates
- API response times

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

### Development Workflow
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- **Claude 3.5 Sonnet** by Anthropic for AI recommendations
- **Cloudflare Workers** for edge computing platform
- **TMDB API** for movie metadata enrichment
- **Stripe** for payment processing

## 📞 Support

For issues, questions, or suggestions:
- Open an issue on GitHub
- Email: support@whatnext.app

## 🚀 Future Roadmap

- [ ] Book recommendations domain
- [ ] Restaurant recommendations domain  
- [ ] User accounts for preference persistence
- [ ] Social sharing features
- [ ] Mobile apps (iOS/Android)
- [ ] Multi-language support
- [ ] Advanced filtering options
- [ ] Watchlist integration

---

Built with ❤️ to solve the paradox of choice in content discovery.