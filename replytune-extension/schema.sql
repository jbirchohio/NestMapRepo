
-- users Table
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email TEXT,
    tier TEXT CHECK (tier IN ('free', 'pro')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- tone_samples Table
CREATE TABLE tone_samples (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    sample_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- usage_logs Table
CREATE TABLE usage_logs (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    tokens_used INTEGER,
    model_used TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);
