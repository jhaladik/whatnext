// src/services/donationService.js
// Stripe donation handling service

export class DonationService {
  constructor(env) {
    this.env = env;
    this.stripeSecretKey = env.STRIPE_SECRET_KEY;
    this.stripePublishableKey = env.STRIPE_PUBLISHABLE_KEY;
    this.frontendUrl = env.FRONTEND_URL || 'https://whatnext.pages.dev';
    this.db = env.DB;
    // Make KV optional - don't fail if it doesn't exist
    this.donationsKV = env.DONATIONS || env.RECOMMENDATION_CACHE || null;
  }

  /**
   * Create a Stripe checkout session for donation
   */
  async createCheckoutSession(data) {
    try {
      const { amount, sessionId, timeSaved, userMessage } = data;
      
      // Validate input
      if (!amount || amount < 1 || amount > 10000) {
        throw new Error('Invalid donation amount');
      }

      // Check if Stripe key is configured
      if (!this.stripeSecretKey) {
        console.error('STRIPE_SECRET_KEY is not configured');
        throw new Error('Payment system not configured');
      }

      // Create metadata for tracking
      const metadata = {
        whatnext_session_id: sessionId || 'anonymous',
        time_saved_minutes: timeSaved || '0',
        user_message: userMessage || '',
        created_at: new Date().toISOString()
      };

      // Create Stripe checkout session
      const stripeResponse = await fetch('https://api.stripe.com/v1/checkout/sessions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.stripeSecretKey}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: this.buildStripeParams({
          'payment_method_types[0]': 'card',
          'mode': 'payment',
          'success_url': `${this.frontendUrl}/donation/success?session_id={CHECKOUT_SESSION_ID}`,
          'cancel_url': `${this.frontendUrl}/donation/cancel`,
          'line_items[0][price_data][currency]': 'usd',
          'line_items[0][price_data][product_data][name]': 'Support What Next',
          'line_items[0][price_data][product_data][description]': `Thank you for supporting What Next`,
          'line_items[0][price_data][unit_amount]': Math.round(amount * 100), // Convert to cents
          'line_items[0][quantity]': 1,
          'metadata[whatnext_session_id]': metadata.whatnext_session_id,
          'metadata[time_saved_minutes]': metadata.time_saved_minutes,
          'metadata[created_at]': metadata.created_at,
          'billing_address_collection': 'auto'
        })
      });

      if (!stripeResponse.ok) {
        const error = await stripeResponse.text();
        console.error('Stripe API error:', error);
        console.error('Stripe response status:', stripeResponse.status);
        
        // Parse Stripe error for better debugging
        try {
          const errorObj = JSON.parse(error);
          console.error('Stripe error details:', errorObj);
          throw new Error(errorObj.error?.message || 'Failed to create checkout session');
        } catch (e) {
          throw new Error(`Stripe API error: ${error}`);
        }
      }

      const session = await stripeResponse.json();
      
      // Store donation intent in KV if available
      await this.storeDonationIntent(session.id, {
        amount,
        sessionId,
        timeSaved,
        stripeSessionId: session.id,
        status: 'pending',
        createdAt: Date.now()
      });

      // Log donation attempt
      await this.logDonationAttempt(sessionId, amount, 'checkout_created');

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
        amount,
        currency: 'usd'
      };
    } catch (error) {
      console.error('Error creating checkout session:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        hasStripeKey: !!this.stripeSecretKey,
        keyPrefix: this.stripeSecretKey ? this.stripeSecretKey.substring(0, 7) : 'none'
      });
      throw new Error(`Donation service error: ${error.message}`);
    }
  }

  /**
   * Verify a donation after redirect from Stripe
   */
  async verifyDonation(stripeSessionId) {
    try {
      if (!stripeSessionId) {
        throw new Error('No session ID provided');
      }

      // Retrieve session from Stripe
      const response = await fetch(
        `https://api.stripe.com/v1/checkout/sessions/${stripeSessionId}`,
        {
          headers: {
            'Authorization': `Bearer ${this.stripeSecretKey}`,
          }
        }
      );

      if (!response.ok) {
        throw new Error('Failed to verify payment');
      }

      const session = await response.json();
      
      // Check payment status
      const isPaid = session.payment_status === 'paid';
      
      if (isPaid) {
        // Update donation record
        await this.updateDonationStatus(stripeSessionId, 'completed', {
          amount: session.amount_total / 100, // Convert from cents
          currency: session.currency,
          customerEmail: session.customer_details?.email,
          paymentIntent: session.payment_intent
        });

        // Log successful donation
        await this.logDonationAttempt(
          session.metadata?.whatnext_session_id, 
          session.amount_total / 100,
          'payment_completed'
        );
      }

      return {
        success: isPaid,
        amount: session.amount_total / 100,
        currency: session.currency,
        customerEmail: session.customer_details?.email,
        metadata: session.metadata
      };
    } catch (error) {
      console.error('Error verifying donation:', error);
      throw error;
    }
  }

  /**
   * Handle Stripe webhook events
   */
  async handleWebhook(request) {
    try {
      const signature = request.headers.get('stripe-signature');
      const body = await request.text();
      
      // Verify webhook signature (simplified - in production use Stripe's webhook verification)
      if (!signature) {
        throw new Error('No signature provided');
      }

      const event = JSON.parse(body);
      
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleSuccessfulDonation(event.data.object);
          break;
        
        case 'checkout.session.expired':
          await this.handleExpiredSession(event.data.object);
          break;
        
        default:
          console.log('Unhandled webhook event type:', event.type);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error:', error);
      throw error;
    }
  }

  /**
   * Get donation statistics
   */
  async getDonationStats(timeframe = '7d') {
    try {
      const stats = await this.db.prepare(`
        SELECT 
          COUNT(*) as total_donations,
          SUM(amount) as total_amount,
          AVG(amount) as average_amount,
          MAX(amount) as highest_donation,
          COUNT(DISTINCT session_id) as unique_donors
        FROM donations
        WHERE status = 'completed'
        AND timestamp > ?
      `).bind(
        Date.now() - this.getTimeframeMillis(timeframe)
      ).first();

      return stats;
    } catch (error) {
      console.error('Error getting donation stats:', error);
      return {
        total_donations: 0,
        total_amount: 0,
        average_amount: 0,
        highest_donation: 0,
        unique_donors: 0
      };
    }
  }

  // Helper methods
  
  buildStripeParams(params) {
    return new URLSearchParams(params).toString();
  }

  async storeDonationIntent(stripeSessionId, data) {
    try {
      if (this.donationsKV) {
        await this.donationsKV.put(
          `donation:${stripeSessionId}`,
          JSON.stringify(data),
          { expirationTtl: 86400 } // 24 hours
        );
      } else {
        console.log('KV storage not available for donations');
      }
    } catch (error) {
      console.error('Error storing donation intent:', error);
    }
  }

  async updateDonationStatus(stripeSessionId, status, additionalData = {}) {
    try {
      const existing = await this.donationsKV.get(`donation:${stripeSessionId}`);
      if (existing) {
        const data = JSON.parse(existing);
        await this.donationsKV.put(
          `donation:${stripeSessionId}`,
          JSON.stringify({ ...data, ...additionalData, status, updatedAt: Date.now() }),
          { expirationTtl: 2592000 } // 30 days for completed donations
        );
      }
    } catch (error) {
      console.error('Error updating donation status:', error);
    }
  }

  async logDonationAttempt(sessionId, amount, action) {
    try {
      await this.db.prepare(`
        INSERT INTO interactions (session_id, action, timestamp, metadata)
        VALUES (?, ?, ?, ?)
      `).bind(
        sessionId || 'anonymous',
        `donation_${action}`,
        Date.now(),
        JSON.stringify({ amount, action })
      ).run();
    } catch (error) {
      console.error('Error logging donation attempt:', error);
    }
  }

  async handleSuccessfulDonation(session) {
    // Update database with successful donation
    try {
      await this.db.prepare(`
        INSERT INTO donations (
          stripe_session_id,
          session_id,
          amount,
          currency,
          status,
          customer_email,
          timestamp,
          metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).bind(
        session.id,
        session.metadata?.whatnext_session_id || 'anonymous',
        session.amount_total / 100,
        session.currency,
        'completed',
        session.customer_details?.email || null,
        Date.now(),
        JSON.stringify(session.metadata)
      ).run();
    } catch (error) {
      console.error('Error recording successful donation:', error);
    }
  }

  async handleExpiredSession(session) {
    await this.updateDonationStatus(session.id, 'expired');
  }

  getTimeframeMillis(timeframe) {
    const map = {
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000,
      '1y': 31536000000
    };
    return map[timeframe] || 604800000; // Default to 7 days
  }
}