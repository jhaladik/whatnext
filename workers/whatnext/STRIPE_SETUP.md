# Stripe Setup Guide

## Quick Setup

### 1. Get Your Stripe Keys
1. Go to https://dashboard.stripe.com/test/apikeys (for test mode)
2. Copy your **Secret key** (starts with `sk_test_`)
3. Copy your **Publishable key** (starts with `pk_test_`)

### 2. Configure Backend (Worker)

Add the secret key to your worker:

```bash
# For development/staging
wrangler secret put STRIPE_SECRET_KEY
# Enter your test secret key when prompted (sk_test_...)

# For production (when ready)
wrangler secret put STRIPE_SECRET_KEY --env production
# Enter your live secret key when prompted (sk_live_...)
```

### 3. Configure Frontend

Update `pages/what-next-frontend/.env`:

```env
# Test mode
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_YOUR_KEY_HERE

# Production (when ready)
# VITE_STRIPE_PUBLISHABLE_KEY=pk_live_YOUR_KEY_HERE
```

### 4. Test the Integration

1. Use Stripe test cards: https://stripe.com/docs/testing
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

2. Test flow:
   - Complete the movie recommendation flow
   - Click "Support What Next" button
   - Select an amount
   - Complete checkout with test card
   - Verify success page shows

### 5. Monitor Donations

View donations in Stripe Dashboard:
- Test mode: https://dashboard.stripe.com/test/payments
- Live mode: https://dashboard.stripe.com/payments

### 6. Switch to Production

When ready to accept real payments:

1. Get live keys from https://dashboard.stripe.com/apikeys
2. Update worker secret: `wrangler secret put STRIPE_SECRET_KEY --env production`
3. Update frontend `.env` with live publishable key
4. Deploy both frontend and backend to production

## Webhook Setup (Optional)

For real-time donation tracking:

1. Go to https://dashboard.stripe.com/webhooks
2. Add endpoint: `https://what-next-prod.jhaladik.workers.dev/api/stripe/webhook`
3. Select events: `checkout.session.completed`
4. Copy webhook secret
5. Add to worker: `wrangler secret put STRIPE_WEBHOOK_SECRET`

## Environment Variables Summary

### Worker Secrets (via wrangler secret)
- `STRIPE_SECRET_KEY` - Your Stripe secret key
- `STRIPE_WEBHOOK_SECRET` - (Optional) For webhook verification

### Worker Config (wrangler.toml)
- `ENABLE_DONATIONS` - Set to true to enable
- `FRONTEND_URL` - Your frontend URL for redirects
- `STRIPE_PUBLISHABLE_KEY` - Your publishable key (for reference)

### Frontend (.env)
- `VITE_STRIPE_PUBLISHABLE_KEY` - Your Stripe publishable key
- `VITE_API_URL` - Your worker API URL