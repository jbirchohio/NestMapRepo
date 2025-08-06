-- Drop and recreate creator tables with correct schema

DROP TABLE IF EXISTS template_reviews CASCADE;
DROP TABLE IF EXISTS template_purchases CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS creator_profiles CASCADE;
DROP TABLE IF EXISTS creator_payouts CASCADE;

-- Creator profiles with correct column names
CREATE TABLE creator_profiles (
  user_id INTEGER REFERENCES users(id) PRIMARY KEY,
  bio TEXT,
  specialties JSONB DEFAULT '[]',
  social_twitter TEXT,
  social_instagram TEXT,
  social_youtube TEXT,
  website_url TEXT,
  verified BOOLEAN DEFAULT false,
  featured BOOLEAN DEFAULT false,
  follower_count INTEGER DEFAULT 0,
  total_templates INTEGER DEFAULT 0,
  total_sales INTEGER DEFAULT 0,
  average_rating DECIMAL(3, 2),
  stripe_connect_account_id TEXT,
  stripe_connect_onboarded BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates table
CREATE TABLE templates (
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

-- Template purchases
CREATE TABLE template_purchases (
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
CREATE TABLE template_reviews (
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

-- Creator payouts
CREATE TABLE creator_payouts (
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

-- Create indexes
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_status ON templates(status);
CREATE INDEX idx_templates_slug ON templates(slug);
CREATE INDEX idx_template_purchases_buyer_id ON template_purchases(buyer_id);
CREATE INDEX idx_template_purchases_seller_id ON template_purchases(seller_id);