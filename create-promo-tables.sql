-- Create promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
  id SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  stripe_coupon_id TEXT,
  description TEXT,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_amount DECIMAL(10, 2) NOT NULL,
  minimum_purchase DECIMAL(10, 2),
  max_uses INTEGER,
  max_uses_per_user INTEGER DEFAULT 1,
  used_count INTEGER DEFAULT 0,
  valid_from TIMESTAMP DEFAULT NOW(),
  valid_until TIMESTAMP,
  template_id INTEGER,
  creator_id INTEGER,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT NOW(),
  created_by INTEGER
);

-- Create promo_code_uses table
CREATE TABLE IF NOT EXISTS promo_code_uses (
  id SERIAL PRIMARY KEY,
  promo_code_id INTEGER NOT NULL REFERENCES promo_codes(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  template_purchase_id INTEGER REFERENCES template_purchases(id),
  discount_applied DECIMAL(10, 2) NOT NULL,
  used_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_promo_codes_code ON promo_codes(code);
CREATE INDEX IF NOT EXISTS idx_promo_codes_active ON promo_codes(is_active);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_user ON promo_code_uses(user_id);
CREATE INDEX IF NOT EXISTS idx_promo_code_uses_promo ON promo_code_uses(promo_code_id);