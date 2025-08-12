# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
What Next is an information theory-based content recommendation engine running on Cloudflare Workers. It uses binary choice questions to maximize information gain and determine user preferences, then provides targeted content recommendations through Claude API integration.

## Key Commands

### Development
- `npm run dev` - Start Wrangler development server for local testing
- `npm run lint` - Run ESLint on src/ directory
- `npm run lint:fix` - Auto-fix linting issues
- `npm test` - Run tests with Vitest
- `npm test:watch` - Run tests in watch mode

### Deployment
- `npm run deploy:staging` - Deploy to staging environment
- `npm run deploy:production` - Deploy to production environment
- `npm run build` - Build the project (runs scripts/build.js)

### Database Management
- `npm run db:migrate` - Apply D1 migrations locally
- `npm run db:migrate:remote` - Apply D1 migrations to remote database
- `npm run db:seed` - Seed database with initial data

### Data Operations
- `npm run kv:seed` - Seed KV namespaces with questions
- `npm run analytics` - Run analytics script
- `npm run optimize` - Optimize question performance

### Wrangler Secrets
- `wrangler secret put CLAUDE_API_KEY` - Set Claude API key
- `wrangler secret put ANALYTICS_SECRET` - Set analytics secret

## Architecture

### Core Components
1. **Cloudflare Worker Entry Point** (`src/index.js`): Main HTTP router using itty-router, handles session management and API endpoints
2. **Question Service** (`src/services/questionService.js`): Implements information theory algorithms to select optimal questions based on expected information gain
3. **User State Model** (`src/models/userState.js`): Tracks user choices, calculates entropy, generates preference vectors
4. **Prompt Builder** (`src/services/promptBuilder.js`): Constructs Claude API prompts for generating recommendations
5. **Recommendation Service** (referenced but not implemented): Generates final content recommendations using Claude API

### Data Storage
- **D1 Database**: Stores interactions, question performance metrics, recommendation feedback, and analytics
- **KV Namespaces**:
  - `QUESTIONS`: Question library and caching
  - `USER_SESSIONS`: Active session state (1-hour TTL)
  - `RECOMMENDATION_CACHE`: Cached recommendations for preference profiles

### Information Theory Implementation
The system uses entropy and information gain calculations to determine which questions most efficiently narrow down user preferences. Questions are scored based on:
- Expected information gain
- Historical performance metrics
- Usage frequency (exploration bonus)
- Contextual relevance (time of day, device type)

### API Endpoints
- `POST /api/start` - Initialize new recommendation session
- `POST /api/swipe/:sessionId` - Process user choice and get next question
- `GET /api/analytics/:timeframe` - Retrieve system analytics
- `POST /api/feedback/:sessionId` - Submit feedback on recommendations

## Critical Implementation Notes
- Maximum 6 questions per session (configurable via `MAX_QUESTIONS_PER_SESSION`)
- Sessions expire after 1 hour
- Questions are selected to maximize information gain while maintaining diversity
- System transitions to recommendations when entropy drops below 0.3 or max questions reached
- All database operations use prepared statements for security
- Implements A/B testing framework for question optimization