-- Migration: Add donations table for Stripe integration
-- Created: 2025-08-12

-- Create donations table
CREATE TABLE IF NOT EXISTS donations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    stripe_session_id TEXT UNIQUE NOT NULL,
    session_id TEXT,
    amount REAL NOT NULL,
    currency TEXT DEFAULT 'usd',
    status TEXT DEFAULT 'pending', -- pending, completed, failed, expired
    customer_email TEXT,
    payment_intent TEXT,
    timestamp INTEGER NOT NULL,
    metadata TEXT, -- JSON string with additional data
    created_at INTEGER DEFAULT (strftime('%s', 'now') * 1000),
    updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

-- Create indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_donations_session_id ON donations(session_id);
CREATE INDEX IF NOT EXISTS idx_donations_status ON donations(status);
CREATE INDEX IF NOT EXISTS idx_donations_timestamp ON donations(timestamp);
CREATE INDEX IF NOT EXISTS idx_donations_stripe_session_id ON donations(stripe_session_id);

-- Create donation_stats view for analytics
CREATE VIEW IF NOT EXISTS donation_stats AS
SELECT 
    DATE(timestamp/1000, 'unixepoch') as date,
    COUNT(*) as donation_count,
    SUM(amount) as total_amount,
    AVG(amount) as average_amount,
    COUNT(DISTINCT session_id) as unique_donors
FROM donations
WHERE status = 'completed'
GROUP BY DATE(timestamp/1000, 'unixepoch');