# 🎬 WhatNext Frontend

An emotionally-intelligent movie recommendation app that understands your mood and preferences.

## ✨ Features

- **5 Question Flows**: Standard, Quick, Deep Dive, Surprise Me, Visual Mood
- **Emotional Intelligence**: Maps your answers to emotional vectors
- **Moment Profiles**: Captures and visualizes your current emotional state
- **Surprise Picks**: Includes hidden gems and adjacent discoveries
- **Quick Adjustments**: Instant mood shifts (lighter/deeper/weirder/safer)
- **Interactive Movie Cards**: React to recommendations with love/seen/skip
- **Beautiful Animations**: Smooth transitions with Framer Motion
- **Responsive Design**: Works perfectly on all devices

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Movie Recommendations Worker running (see workers/movie-recommendations)

### Installation

```bash
cd frontend/whatnext-app

# Install dependencies
npm install

# Set up environment variables
# Edit .env.local with your worker URL
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
```

### Development

```bash
# Start the development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🏗️ Architecture

```
app/
├── page.tsx              # Home page with welcome screen
├── questions/page.tsx    # Question flow
├── recommendations/page.tsx # Results display
└── layout.tsx           # Root layout

components/
├── welcome/             # Welcome screen & flow selection
├── questions/           # Question cards & flow logic
├── recommendations/     # Movie cards, grid, moment summary
├── ui/                  # Reusable UI components
└── feedback/            # Validation & feedback components

services/
└── api/client.ts        # API client for worker communication

store/
└── recommendations.ts   # Zustand state management
```

## 🎨 Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Animations**: Framer Motion
- **State**: Zustand
- **Icons**: Lucide React
- **Confetti**: Canvas Confetti

## 📱 User Flow

1. **Welcome Screen**: Time-aware greeting, choose question flow
2. **Questions**: Answer 3-7 questions based on selected flow
3. **Processing**: Creative loading animation
4. **Moment Summary**: See your emotional profile
5. **Recommendations**: Browse personalized movie picks
6. **Refinement**: Quick adjustments or get more recommendations

## 🔧 Configuration

### Environment Variables

```env
NEXT_PUBLIC_WORKER_URL=    # Your worker API endpoint
NEXT_PUBLIC_GA_ID=         # Optional: Google Analytics
NEXT_PUBLIC_MIXPANEL_TOKEN= # Optional: Mixpanel tracking
```

### Customization

- Colors: Edit `app/globals.css` for gradient themes
- Animations: Adjust timing in Framer Motion components
- Question flows: Configure in `WelcomeScreen.tsx`

## 🚢 Deployment

### Vercel (Recommended)

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📊 Features In Action

- **Emotional Mapping**: Converts answers to mood vectors
- **Surprise Engine**: Injects unexpected recommendations
- **Refinement**: Learn from reactions to improve picks
- **Quick Adjustments**: Instant mood shifts without re-questioning
- **Session Persistence**: Resume where you left off

## 🤝 Contributing

Pull requests are welcome! Please read our contributing guidelines first.

## 📄 License

MIT License - feel free to use this in your own projects!

---

Built with ❤️ using Next.js, Tailwind CSS, and Framer Motion