-- ============================================================================
-- Grito Labs: Multi-Channel Marketing Analytics & Attribution Framework
-- PostgreSQL Schema Definition
-- ============================================================================
-- This schema captures user journeys across multiple marketing channels,
-- enabling comprehensive attribution analysis and ROI evaluation.
--

-- ─── USERS TABLE ──────────────────────────────────────────────────────────
-- Stores core user/customer information
--
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) UNIQUE NOT NULL,
  signup_date TIMESTAMP NOT NULL,
  age_group VARCHAR(20),
  region VARCHAR(50),
  device_type VARCHAR(30),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_user_id ON users(user_id);
CREATE INDEX idx_users_signup_date ON users(signup_date);
CREATE INDEX idx_users_region ON users(region);


-- ─── CAMPAIGNS TABLE ──────────────────────────────────────────────────────
-- Stores campaign metadata
--
CREATE TABLE IF NOT EXISTS campaigns (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(50) UNIQUE NOT NULL,
  campaign_name VARCHAR(255) NOT NULL,
  channel VARCHAR(50) NOT NULL, -- 'Email', 'Paid Ad', 'Social Media'
  budget DECIMAL(12, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status VARCHAR(20) DEFAULT 'active', -- 'active', 'paused', 'completed'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_campaigns_campaign_id ON campaigns(campaign_id);
CREATE INDEX idx_campaigns_channel ON campaigns(channel);
CREATE INDEX idx_campaigns_status ON campaigns(status);


-- ─── MARKETING_SPEND TABLE ────────────────────────────────────────────────
-- Daily marketing spend, impressions, and clicks aggregated per campaign
--
CREATE TABLE IF NOT EXISTS marketing_spend (
  id SERIAL PRIMARY KEY,
  campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  spend_date DATE NOT NULL,
  spend DECIMAL(12, 2) NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_spend_campaign_date ON marketing_spend(campaign_id, spend_date);
CREATE INDEX idx_spend_campaign_id ON marketing_spend(campaign_id);
CREATE INDEX idx_spend_date ON marketing_spend(spend_date);


-- ─── WEB_TRAFFIC_TOUCHPOINTS TABLE ────────────────────────────────────────
-- Captures every user touchpoint across channels
-- (Impression, Click, Session, Page View, etc.)
--
CREATE TABLE IF NOT EXISTS web_traffic_touchpoints (
  id SERIAL PRIMARY KEY,
  touchpoint_id VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL, -- 'Email', 'Paid Ad', 'Social Media'
  event_type VARCHAR(50) NOT NULL, -- 'Impression', 'Click', 'Session', 'Page View'
  event_timestamp TIMESTAMP NOT NULL,
  session_duration_seconds INTEGER,
  device_type VARCHAR(30),
  browser VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_touchpoints_user_campaign ON web_traffic_touchpoints(user_id, campaign_id);
CREATE INDEX idx_touchpoints_user_timestamp ON web_traffic_touchpoints(user_id, event_timestamp);
CREATE INDEX idx_touchpoints_campaign ON web_traffic_touchpoints(campaign_id);
CREATE INDEX idx_touchpoints_channel ON web_traffic_touchpoints(channel);
CREATE INDEX idx_touchpoints_timestamp ON web_traffic_touchpoints(event_timestamp);


-- ─── CONVERSIONS TABLE ────────────────────────────────────────────────────
-- Records conversion events (purchases, sign-ups, etc.)
--
CREATE TABLE IF NOT EXISTS conversions (
  id SERIAL PRIMARY KEY,
  conversion_id VARCHAR(100) UNIQUE NOT NULL,
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  conversion_timestamp TIMESTAMP NOT NULL,
  revenue DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  conversion_type VARCHAR(50) NOT NULL, -- 'Purchase', 'Sign-up', 'Demo', etc.
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_conversions_user ON conversions(user_id);
CREATE INDEX idx_conversions_timestamp ON conversions(conversion_timestamp);
CREATE INDEX idx_conversions_type ON conversions(conversion_type);


-- ─── ATTRIBUTION_RESULTS TABLE ────────────────────────────────────────────
-- Stores pre-computed attribution credit allocations for each conversion
-- Supports multiple models: first_touch, last_touch, linear_u_shaped
--
CREATE TABLE IF NOT EXISTS attribution_results (
  id SERIAL PRIMARY KEY,
  conversion_id VARCHAR(100) NOT NULL REFERENCES conversions(conversion_id) ON DELETE CASCADE,
  touchpoint_id VARCHAR(100) NOT NULL REFERENCES web_traffic_touchpoints(touchpoint_id) ON DELETE CASCADE,
  campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  attribution_model VARCHAR(50) NOT NULL, -- 'first_touch', 'last_touch', 'linear', 'u_shaped'
  credit_allocated DECIMAL(10, 4) NOT NULL, -- Weight/percentage (0.0 - 1.0)
  revenue_attributed DECIMAL(12, 2) NOT NULL, -- Revenue × Credit
  position_in_journey INTEGER NOT NULL, -- Position of touchpoint in journey
  total_touchpoints_in_journey INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_attribution_conversion ON attribution_results(conversion_id);
CREATE INDEX idx_attribution_campaign ON attribution_results(campaign_id);
CREATE INDEX idx_attribution_model ON attribution_results(attribution_model);
CREATE INDEX idx_attribution_channel ON attribution_results(channel);


-- ─── KPI_SNAPSHOTS TABLE ──────────────────────────────────────────────────
-- Daily/aggregated KPI snapshots for trend analysis and reporting
--
CREATE TABLE IF NOT EXISTS kpi_snapshots (
  id SERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  campaign_id VARCHAR(50) NOT NULL REFERENCES campaigns(campaign_id) ON DELETE CASCADE,
  channel VARCHAR(50) NOT NULL,
  attribution_model VARCHAR(50) NOT NULL,
  total_spend DECIMAL(12, 2) NOT NULL,
  total_impressions INTEGER NOT NULL,
  total_clicks INTEGER NOT NULL,
  total_conversions INTEGER NOT NULL,
  total_attributed_revenue DECIMAL(12, 2) NOT NULL,
  ctr DECIMAL(10, 4) NOT NULL, -- Click-Through Rate (%)
  cpc DECIMAL(10, 2) NOT NULL, -- Cost Per Click
  cac DECIMAL(10, 2) NOT NULL, -- Cost Per Acquisition
  roas DECIMAL(10, 4) NOT NULL, -- Return on Ad Spend
  conversion_rate DECIMAL(10, 4) NOT NULL, -- Conversion Rate (%)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_kpi_date_campaign ON kpi_snapshots(snapshot_date, campaign_id);
CREATE INDEX idx_kpi_model ON kpi_snapshots(attribution_model);
CREATE INDEX idx_kpi_channel ON kpi_snapshots(channel);


-- ─── JOURNEY_PATHS TABLE ──────────────────────────────────────────────────
-- Pre-computed top conversion paths for quick reporting
--
CREATE TABLE IF NOT EXISTS journey_paths (
  id SERIAL PRIMARY KEY,
  path_sequence VARCHAR(255) NOT NULL, -- e.g., 'Email → Paid Ad → Social Media'
  channel_sequence VARCHAR(255) NOT NULL,
  conversion_count INTEGER NOT NULL,
  total_revenue DECIMAL(12, 2) NOT NULL,
  avg_revenue DECIMAL(12, 2) NOT NULL,
  avg_touchpoints INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_journey_path ON journey_paths(path_sequence);
CREATE INDEX idx_journey_count ON journey_paths(conversion_count DESC);
