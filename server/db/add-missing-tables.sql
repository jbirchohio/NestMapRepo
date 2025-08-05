-- Add missing columns to organizations table
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'low';

-- Create revenue_metrics table
CREATE TABLE IF NOT EXISTS revenue_metrics (
  id SERIAL PRIMARY KEY,
  date DATE NOT NULL,
  mrr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  new_mrr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  churned_mrr DECIMAL(10, 2) NOT NULL DEFAULT 0,
  total_customers INTEGER NOT NULL DEFAULT 0,
  new_customers INTEGER NOT NULL DEFAULT 0,
  churned_customers INTEGER NOT NULL DEFAULT 0,
  churn_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  growth_rate DECIMAL(5, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create unique index on date
CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_metrics_date ON revenue_metrics(date);

-- Create superadmin_background_jobs table
CREATE TABLE IF NOT EXISTS superadmin_background_jobs (
  id SERIAL PRIMARY KEY,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  payload JSONB,
  result JSONB,
  error_message TEXT,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  scheduled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create deployments table
CREATE TABLE IF NOT EXISTS deployments (
  id SERIAL PRIMARY KEY,
  deployment_id TEXT NOT NULL UNIQUE,
  version TEXT NOT NULL,
  environment TEXT NOT NULL,
  deployment_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  deployed_by INTEGER REFERENCES users(id),
  git_commit TEXT,
  git_branch TEXT,
  rollback_to INTEGER REFERENCES deployments(id),
  error_logs TEXT,
  deployment_logs TEXT,
  health_check_status TEXT,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_deployments_environment ON deployments(environment);
CREATE INDEX IF NOT EXISTS idx_deployments_status ON deployments(status);
CREATE INDEX IF NOT EXISTS idx_background_jobs_status ON superadmin_background_jobs(status);