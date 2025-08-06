-- Add creator economy tables to Railway database

-- Creator profiles table
CREATE TABLE IF NOT EXISTS creator_profiles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  bio TEXT,
  specialty TEXT,
  instagram_handle TEXT,
  twitter_handle TEXT,
  youtube_channel TEXT,
  website_url TEXT,
  verified BOOLEAN DEFAULT false,
  follower_count INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  total_earnings DECIMAL(10, 2) DEFAULT 0,
  commission_rate DECIMAL(5, 2) DEFAULT 30,
  stripe_account_id TEXT,
  paypal_email TEXT,
  preferred_payout_method TEXT DEFAULT 'paypal',
  payout_threshold DECIMAL(10, 2) DEFAULT 100,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trip templates marketplace
CREATE TABLE IF NOT EXISTS templates (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  cover_image TEXT,
  destinations JSONB DEFAULT '[]',
  duration INTEGER,
  trip_data JSONB,
  tags JSONB DEFAULT '[]',
  sales_count INTEGER DEFAULT 0,
  rating DECIMAL(3, 2),
  review_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'draft',
  featured BOOLEAN DEFAULT false,
  view_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template purchases tracking
CREATE TABLE IF NOT EXISTS template_purchases (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) NOT NULL,
  buyer_id INTEGER REFERENCES users(id) NOT NULL,
  seller_id INTEGER REFERENCES users(id) NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  seller_earnings DECIMAL(10, 2) NOT NULL,
  stripe_payment_id TEXT,
  stripe_payment_intent_id TEXT,
  status TEXT DEFAULT 'pending',
  refunded_at TIMESTAMP,
  purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Template reviews
CREATE TABLE IF NOT EXISTS template_reviews (
  id SERIAL PRIMARY KEY,
  template_id INTEGER REFERENCES templates(id) NOT NULL,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review TEXT,
  helpful_count INTEGER DEFAULT 0,
  verified_purchase BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(template_id, user_id)
);

-- Creator payouts management
CREATE TABLE IF NOT EXISTS creator_payouts (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  method TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  processed_at TIMESTAMP,
  paypal_batch_id TEXT,
  paypal_payout_id TEXT,
  amazon_request_id TEXT,
  amazon_transaction_id TEXT,
  stripe_transfer_id TEXT,
  stripe_payout_id TEXT,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Analytics events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id SERIAL PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  user_id INTEGER REFERENCES users(id),
  organization_id INTEGER REFERENCES organizations(id),
  session_id TEXT,
  properties JSONB,
  metadata JSONB,
  ip_address TEXT,
  user_agent TEXT,
  referrer TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Approval workflows
CREATE TABLE IF NOT EXISTS approval_workflows (
  id SERIAL PRIMARY KEY,
  organization_id INTEGER REFERENCES organizations(id) NOT NULL,
  trip_id INTEGER REFERENCES trips(id) NOT NULL,
  requester_id INTEGER REFERENCES users(id) NOT NULL,
  approver_id INTEGER REFERENCES users(id),
  status TEXT DEFAULT 'pending',
  request_type TEXT NOT NULL,
  estimated_cost DECIMAL(10, 2),
  justification TEXT,
  approval_notes TEXT,
  approved_at TIMESTAMP,
  rejected_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_templates_user_id ON templates(user_id);
CREATE INDEX IF NOT EXISTS idx_templates_status ON templates(status);
CREATE INDEX IF NOT EXISTS idx_templates_slug ON templates(slug);
CREATE INDEX IF NOT EXISTS idx_template_purchases_buyer_id ON template_purchases(buyer_id);
CREATE INDEX IF NOT EXISTS idx_template_purchases_seller_id ON template_purchases(seller_id);
CREATE INDEX IF NOT EXISTS idx_creator_profiles_user_id ON creator_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_user_id ON analytics_events(user_id);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_type ON analytics_events(event_type);