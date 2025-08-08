-- Indexes to support marketplace filtering
CREATE INDEX IF NOT EXISTS idx_templates_price ON templates(price);
CREATE INDEX IF NOT EXISTS idx_templates_duration ON templates(duration);
CREATE INDEX IF NOT EXISTS idx_templates_tags_gin ON templates USING GIN (tags);
CREATE INDEX IF NOT EXISTS idx_templates_destinations_gin ON templates USING GIN (destinations);
