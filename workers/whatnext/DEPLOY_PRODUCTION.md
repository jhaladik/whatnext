# 🚀 Production Deployment Guide

## Quick Start (One Command Setup)

```bash
npm run setup:production
```

This interactive script will:
1. Create D1 database
2. Create all KV namespaces
3. Apply database migrations
4. Seed initial data
5. Set up secrets
6. Deploy to production

## Manual Step-by-Step Deployment

### 1. Install Dependencies
```bash
npm install
```

### 2. Create Cloudflare Resources

#### Create D1 Database:
```bash
npx wrangler d1 create what-next-db
```
Copy the `database_id` from the output and update it in `wrangler.toml`:
```toml
[[d1_databases]]
binding = "DB"
database_name = "what-next-db"
database_id = "YOUR_DATABASE_ID_HERE"  # <-- Update this
```

#### Create KV Namespaces:
```bash
npx wrangler kv:namespace create "QUESTIONS"
npx wrangler kv:namespace create "USER_SESSIONS"
npx wrangler kv:namespace create "RECOMMENDATION_CACHE"
npx wrangler kv:namespace create "RATE_LIMITS"
npx wrangler kv:namespace create "CIRCUIT_BREAKERS"
```

Update each namespace ID in `wrangler.toml` with the IDs from the output.

### 3. Set Production Secrets

#### Required:
```bash
npx wrangler secret put CLAUDE_API_KEY
# Enter your Claude API key when prompted
```

#### Optional:
```bash
npx wrangler secret put ANALYTICS_SECRET
# Enter a secure random string for analytics authentication
```

### 4. Deploy Database Schema & Seed Data
```bash
# Apply migrations to remote database
npx wrangler d1 migrations apply what-next-db

# Seed with initial questions (run the setup script)
npm run setup:production
# OR manually execute the seed SQL
```

### 5. Deploy to Production
```bash
npm run deploy
# OR
npx wrangler deploy --env production
```

## Verify Deployment

### 1. Check Health Endpoint
```bash
curl https://your-worker.workers.dev/
```

Expected response:
```json
{
  "status": "healthy",
  "service": "what-next-recommendation-engine",
  "version": "1.0.0"
}
```

### 2. Test Session Creation
```bash
curl -X POST https://your-worker.workers.dev/api/start \
  -H "Content-Type: application/json"
```

### 3. View Live Logs
```bash
npm run logs:production
# OR
npx wrangler tail --env production
```

## Production Configuration

### Environment Variables (in wrangler.toml)
```toml
[env.production]
name = "what-next-prod"

[vars]
CLAUDE_API_ENDPOINT = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = "claude-3-sonnet-20240229"
MAX_QUESTIONS_PER_SESSION = 6
SESSION_TIMEOUT_SECONDS = 3600
RATE_LIMIT_PER_MINUTE = 60
ENABLE_ANALYTICS = true
ENABLE_DONATIONS = false
```

### Custom Domain (Optional)
```bash
# Add custom domain
npx wrangler domains add api.yourdomain.com

# Update routes in wrangler.toml
[env.production]
routes = [
  { pattern = "api.yourdomain.com/*", zone_name = "yourdomain.com" }
]
```

## Monitoring & Maintenance

### View Analytics
```bash
# Get analytics data (requires ANALYTICS_SECRET)
curl -H "Authorization: Bearer YOUR_ANALYTICS_SECRET" \
  https://your-worker.workers.dev/api/analytics/24h
```

### Database Queries
```bash
# Check questions
npx wrangler d1 execute what-next-db \
  --command="SELECT * FROM questions"

# Check recent sessions
npx wrangler d1 execute what-next-db \
  --command="SELECT * FROM interactions WHERE timestamp > strftime('%s', 'now', '-1 day') * 1000"

# Check question performance
npx wrangler d1 execute what-next-db \
  --command="SELECT * FROM question_performance ORDER BY avg_info_gain DESC"
```

### Update Worker Code
```bash
# Make changes to code
# Then redeploy
npm run deploy
```

### Rollback if Needed
```bash
npx wrangler rollback
```

## Troubleshooting

### Common Issues

#### 1. "Database not found"
- Ensure database_id in wrangler.toml matches the created database
- Run migrations: `npx wrangler d1 migrations apply what-next-db`

#### 2. "KV namespace not found"
- Check that all KV namespace IDs in wrangler.toml are correct
- Namespaces must be created before deployment

#### 3. "Claude API error"
- Verify CLAUDE_API_KEY is set: `npx wrangler secret list`
- Check Claude API quota and billing

#### 4. Rate limiting issues
- Adjust RATE_LIMIT_PER_MINUTE in wrangler.toml
- Clear rate limit cache if needed

### Debug Mode
```bash
# View detailed logs
npx wrangler tail --env production

# Test locally with production config
npx wrangler dev --env production --local
```

## Security Checklist

- [ ] CLAUDE_API_KEY is set as secret (not in code)
- [ ] ANALYTICS_SECRET is set for analytics endpoint
- [ ] Rate limiting is enabled
- [ ] CORS headers are properly configured
- [ ] Input validation is active
- [ ] No sensitive data in logs

## Performance Optimization

1. **Cache Hit Rate**: Monitor cache effectiveness
   ```bash
   npx wrangler d1 execute what-next-db \
     --command="SELECT * FROM system_metrics WHERE metric_name = 'cache_hit'"
   ```

2. **Response Times**: Check Server-Timing headers in responses

3. **Question Performance**: Regularly run optimization
   ```bash
   npm run optimize
   ```

## Cost Management

Cloudflare Workers Free Tier includes:
- 100,000 requests/day
- 10ms CPU time per request
- Unlimited KV reads (with limits)
- 500 D1 queries per day

Monitor usage:
- Workers Dashboard: https://dash.cloudflare.com
- D1 Dashboard: Check database metrics
- KV Dashboard: Monitor storage usage

## Support

- Worker Logs: `npm run logs:production`
- Database State: Check D1 dashboard
- Error Tracking: Monitor worker analytics
- Performance: Check Server-Timing headers

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Status**: Production Ready