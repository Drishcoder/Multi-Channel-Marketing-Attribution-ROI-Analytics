-- ============================================================================
-- Grito Labs: Core Attribution & Analytics SQL Queries
-- ============================================================================
-- High-performance SQL queries for attribution computation,
-- KPI calculation, and journey analysis
--


-- ─── ATTRIBUTION: FIRST-TOUCH MODEL ───────────────────────────────────────
-- Credits 100% of conversion revenue to the first touchpoint in the journey
--
WITH first_touch_attribution AS (
  SELECT
    c.conversion_id,
    c.user_id,
    c.revenue,
    c.conversion_timestamp,
    wt.touchpoint_id,
    wt.campaign_id,
    wt.channel,
    ROW_NUMBER() OVER (PARTITION BY c.conversion_id ORDER BY wt.event_timestamp ASC) AS position,
    COUNT(*) OVER (PARTITION BY c.conversion_id) AS total_touchpoints
  FROM conversions c
  JOIN web_traffic_touchpoints wt 
    ON c.user_id = wt.user_id 
    AND wt.event_timestamp < c.conversion_timestamp
)
SELECT
  conversion_id,
  touchpoint_id,
  campaign_id,
  channel,
  'first_touch' AS attribution_model,
  CASE WHEN position = 1 THEN 1.0 ELSE 0.0 END AS credit_allocated,
  CASE WHEN position = 1 THEN revenue ELSE 0.0 END AS revenue_attributed,
  position AS position_in_journey,
  total_touchpoints
FROM first_touch_attribution
WHERE position = 1;


-- ─── ATTRIBUTION: LAST-TOUCH MODEL ────────────────────────────────────────
-- Credits 100% of conversion revenue to the touchpoint immediately before conversion
--
WITH last_touch_attribution AS (
  SELECT
    c.conversion_id,
    c.user_id,
    c.revenue,
    c.conversion_timestamp,
    wt.touchpoint_id,
    wt.campaign_id,
    wt.channel,
    ROW_NUMBER() OVER (PARTITION BY c.conversion_id ORDER BY wt.event_timestamp DESC) AS position_desc,
    COUNT(*) OVER (PARTITION BY c.conversion_id) AS total_touchpoints
  FROM conversions c
  JOIN web_traffic_touchpoints wt 
    ON c.user_id = wt.user_id 
    AND wt.event_timestamp < c.conversion_timestamp
)
SELECT
  conversion_id,
  touchpoint_id,
  campaign_id,
  channel,
  'last_touch' AS attribution_model,
  CASE WHEN position_desc = 1 THEN 1.0 ELSE 0.0 END AS credit_allocated,
  CASE WHEN position_desc = 1 THEN revenue ELSE 0.0 END AS revenue_attributed,
  (total_touchpoints - position_desc + 1) AS position_in_journey,
  total_touchpoints
FROM last_touch_attribution
WHERE position_desc = 1;


-- ─── ATTRIBUTION: LINEAR / U-SHAPED MODEL ─────────────────────────────────
-- 40% first, 40% last, 20% distributed across middle touchpoints
--
WITH linear_attribution AS (
  SELECT
    c.conversion_id,
    c.user_id,
    c.revenue,
    c.conversion_timestamp,
    wt.touchpoint_id,
    wt.campaign_id,
    wt.channel,
    wt.event_timestamp,
    ROW_NUMBER() OVER (PARTITION BY c.conversion_id ORDER BY wt.event_timestamp ASC) AS position_asc,
    COUNT(*) OVER (PARTITION BY c.conversion_id) AS total_touchpoints
  FROM conversions c
  JOIN web_traffic_touchpoints wt 
    ON c.user_id = wt.user_id 
    AND wt.event_timestamp < c.conversion_timestamp
)
SELECT
  conversion_id,
  touchpoint_id,
  campaign_id,
  channel,
  'linear_u_shaped' AS attribution_model,
  CASE 
    WHEN total_touchpoints = 1 THEN 1.0
    WHEN total_touchpoints = 2 THEN 0.5
    WHEN position_asc = 1 THEN 0.4
    WHEN position_asc = total_touchpoints THEN 0.4
    ELSE (0.2 / (total_touchpoints - 2))
  END AS credit_allocated,
  revenue * CASE 
    WHEN total_touchpoints = 1 THEN 1.0
    WHEN total_touchpoints = 2 THEN 0.5
    WHEN position_asc = 1 THEN 0.4
    WHEN position_asc = total_touchpoints THEN 0.4
    ELSE (0.2 / (total_touchpoints - 2))
  END AS revenue_attributed,
  position_asc AS position_in_journey,
  total_touchpoints
FROM linear_attribution;


-- ─── KPI CALCULATION: OVERALL METRICS ─────────────────────────────────────
-- Aggregate KPIs across all campaigns and channels
--
SELECT
  COUNT(DISTINCT ms.campaign_id) AS total_campaigns,
  SUM(ms.spend) AS total_spend,
  SUM(ms.impressions) AS total_impressions,
  SUM(ms.clicks) AS total_clicks,
  COUNT(DISTINCT c.conversion_id) AS total_conversions,
  COUNT(DISTINCT u.id) AS unique_visitors,
  
  -- Click-Through Rate (CTR) = (Clicks / Impressions) × 100
  CASE 
    WHEN SUM(ms.impressions) > 0 
    THEN (SUM(ms.clicks)::DECIMAL / SUM(ms.impressions)) * 100
    ELSE 0
  END AS ctr_percent,
  
  -- Cost Per Click (CPC) = Total Spend / Clicks
  CASE 
    WHEN SUM(ms.clicks) > 0 
    THEN SUM(ms.spend) / SUM(ms.clicks)
    ELSE 0
  END AS cpc,
  
  -- Cost Per Acquisition (CAC) = Total Spend / Total Conversions
  CASE 
    WHEN COUNT(DISTINCT c.conversion_id) > 0 
    THEN SUM(ms.spend) / COUNT(DISTINCT c.conversion_id)
    ELSE 0
  END AS cac,
  
  -- Return on Ad Spend (ROAS) = Revenue / Spend
  CASE 
    WHEN SUM(ms.spend) > 0 
    THEN SUM(c.revenue) / SUM(ms.spend)
    ELSE 0
  END AS roas,
  
  -- Conversion Rate (CR) = (Total Conversions / Unique Visitors) × 100
  CASE 
    WHEN COUNT(DISTINCT u.id) > 0 
    THEN (COUNT(DISTINCT c.conversion_id)::DECIMAL / COUNT(DISTINCT u.id)) * 100
    ELSE 0
  END AS conversion_rate_percent,
  
  SUM(c.revenue) AS total_attributed_revenue
FROM 
  marketing_spend ms
  LEFT JOIN web_traffic_touchpoints wt ON ms.campaign_id = wt.campaign_id
  LEFT JOIN conversions c ON wt.user_id = c.user_id 
    AND wt.event_timestamp < c.conversion_timestamp
  LEFT JOIN users u ON wt.user_id = u.user_id;


-- ─── KPI CALCULATION: BY CAMPAIGN ─────────────────────────────────────────
-- Per-campaign KPI aggregation with performance ranking
--
SELECT
  camp.campaign_id,
  camp.campaign_name,
  camp.channel,
  camp.budget,
  SUM(ms.spend) AS total_spend,
  SUM(ms.impressions) AS total_impressions,
  SUM(ms.clicks) AS total_clicks,
  COUNT(DISTINCT c.conversion_id) AS conversions,
  
  -- CTR
  CASE 
    WHEN SUM(ms.impressions) > 0 
    THEN (SUM(ms.clicks)::DECIMAL / SUM(ms.impressions)) * 100
    ELSE 0
  END AS ctr_percent,
  
  -- CPC
  CASE 
    WHEN SUM(ms.clicks) > 0 
    THEN SUM(ms.spend) / SUM(ms.clicks)
    ELSE 0
  END AS cpc,
  
  -- CAC
  CASE 
    WHEN COUNT(DISTINCT c.conversion_id) > 0 
    THEN SUM(ms.spend) / COUNT(DISTINCT c.conversion_id)
    ELSE 0
  END AS cac,
  
  -- ROAS
  CASE 
    WHEN SUM(ms.spend) > 0 
    THEN SUM(c.revenue) / SUM(ms.spend)
    ELSE 0
  END AS roas,
  
  SUM(c.revenue) AS total_revenue,
  
  -- Performance tier
  CASE 
    WHEN (SUM(c.revenue) / NULLIF(SUM(ms.spend), 0)) > 2.5 THEN 'High Performer'
    WHEN (SUM(c.revenue) / NULLIF(SUM(ms.spend), 0)) < 1.0 THEN 'Underperforming'
    ELSE 'On Target'
  END AS performance_tier
  
FROM campaigns camp
LEFT JOIN marketing_spend ms ON camp.campaign_id = ms.campaign_id
LEFT JOIN web_traffic_touchpoints wt ON camp.campaign_id = wt.campaign_id
LEFT JOIN conversions c ON wt.user_id = c.user_id 
  AND wt.event_timestamp < c.conversion_timestamp
GROUP BY camp.campaign_id, camp.campaign_name, camp.channel, camp.budget
ORDER BY roas DESC;


-- ─── CHANNEL-LEVEL PERFORMANCE ────────────────────────────────────────────
-- Aggregate metrics by marketing channel
--
SELECT
  wt.channel,
  COUNT(DISTINCT wt.touchpoint_id) AS total_touchpoints,
  COUNT(DISTINCT wt.campaign_id) AS campaigns_active,
  SUM(ms.spend) AS total_spend,
  SUM(ms.impressions) AS total_impressions,
  SUM(ms.clicks) AS total_clicks,
  COUNT(DISTINCT c.conversion_id) AS conversions,
  SUM(c.revenue) AS total_revenue,
  
  -- Channel efficiency metrics
  CASE 
    WHEN SUM(ms.impressions) > 0 
    THEN (SUM(ms.clicks)::DECIMAL / SUM(ms.impressions)) * 100
    ELSE 0
  END AS ctr_percent,
  
  CASE 
    WHEN SUM(ms.clicks) > 0 
    THEN SUM(ms.spend) / SUM(ms.clicks)
    ELSE 0
  END AS cpc,
  
  CASE 
    WHEN SUM(ms.spend) > 0 
    THEN SUM(c.revenue) / SUM(ms.spend)
    ELSE 0
  END AS roas
  
FROM web_traffic_touchpoints wt
LEFT JOIN marketing_spend ms ON wt.campaign_id = ms.campaign_id
LEFT JOIN conversions c ON wt.user_id = c.user_id 
  AND wt.event_timestamp < c.conversion_timestamp
GROUP BY wt.channel
ORDER BY total_revenue DESC;


-- ─── TOP CONVERSION PATHS ─────────────────────────────────────────────────
-- Identify high-impact multi-touch conversion paths
--
WITH journey_paths AS (
  SELECT
    c.conversion_id,
    c.revenue,
    STRING_AGG(DISTINCT wt.channel, ' → ' ORDER BY wt.event_timestamp) AS path,
    COUNT(DISTINCT wt.touchpoint_id) AS touchpoint_count,
    COUNT(*) OVER (PARTITION BY STRING_AGG(DISTINCT wt.channel, ' → ' ORDER BY wt.event_timestamp)) AS path_frequency
  FROM conversions c
  JOIN web_traffic_touchpoints wt 
    ON c.user_id = wt.user_id 
    AND wt.event_timestamp < c.conversion_timestamp
  GROUP BY c.conversion_id, c.revenue
)
SELECT
  path,
  COUNT(DISTINCT conversion_id) AS conversions,
  SUM(revenue) AS total_revenue,
  ROUND(AVG(revenue)::NUMERIC, 2) AS avg_revenue,
  ROUND(AVG(touchpoint_count)::NUMERIC, 1) AS avg_touchpoints,
  ROUND((COUNT(DISTINCT conversion_id)::DECIMAL / 
    (SELECT COUNT(DISTINCT conversion_id) FROM conversions)) * 100, 2) AS percent_of_conversions
FROM journey_paths
GROUP BY path
ORDER BY conversions DESC
LIMIT 10;


-- ─── CORRECTED: TOP CONVERSION PATHS (WITH MULTI-TOUCH ACCURACY) ──────────
-- ISSUE: The above query uses STRING_AGG(DISTINCT ...) which removes duplicate channels
-- EXAMPLE: "Email → Email → Paid Ad → Email" becomes "Email → Paid Ad"
-- This compresses multi-touch journeys and misrepresents channel sequences
-- 
-- CORRECTED VERSION: Uses STRING_AGG WITHOUT DISTINCT to preserve all touches
-- Use this version for accurate multi-touch journey analysis
--
WITH journey_paths_accurate AS (
  SELECT
    c.conversion_id,
    c.revenue,
    STRING_AGG(wt.channel, ' → ' ORDER BY wt.event_timestamp) AS path,
    COUNT(DISTINCT wt.touchpoint_id) AS touchpoint_count,
    COUNT(*) OVER (PARTITION BY STRING_AGG(wt.channel, ' → ' ORDER BY wt.event_timestamp)) AS path_frequency
  FROM conversions c
  JOIN web_traffic_touchpoints wt 
    ON c.user_id = wt.user_id 
    AND wt.event_timestamp < c.conversion_timestamp
  GROUP BY c.conversion_id, c.revenue
)
SELECT
  path,
  COUNT(DISTINCT conversion_id) AS conversions,
  SUM(revenue) AS total_revenue,
  ROUND(AVG(revenue)::NUMERIC, 2) AS avg_revenue,
  ROUND(AVG(touchpoint_count)::NUMERIC, 1) AS avg_touchpoints,
  ROUND((COUNT(DISTINCT conversion_id)::DECIMAL / 
    (SELECT COUNT(DISTINCT conversion_id) FROM conversions)) * 100, 2) AS percent_of_conversions
FROM journey_paths_accurate
GROUP BY path
ORDER BY conversions DESC
LIMIT 10;

-- ─── DOCUMENTATION: STRING_AGG DISTINCT ISSUE ─────────────────────────────
-- PROBLEM STATEMENT:
-- Using STRING_AGG(DISTINCT channel, ...) aggregates unique channels only,
-- which loses information about repeated channel interactions in a journey.
--
-- EXAMPLE IMPACT:
-- User journey: Email (Day 1) → Email (Day 3) → Paid Ad (Day 5) → Email (Day 7)
-- With DISTINCT: Recorded as "Email → Paid Ad" (2 unique channels)
-- Without DISTINCT: Recorded as "Email → Email → Paid Ad → Email" (4 touches)
--
-- WHY IT MATTERS:
-- - Some users benefit from multiple touches in the same channel
-- - Omitting repeats underestimates channel effectiveness
-- - Attribution models need full journey sequence for fair credit allocation
--
-- RECOMMENDATION:
-- - For production: Use the CORRECTED query above (STRING_AGG without DISTINCT)
-- - For legacy compatibility: Keep original query but document as "unique channels only"
-- - Document this assumption: "Paths show unique channels, not total touches"
--
-- AFFECTED USE CASES:
-- - Re-engagement campaigns (multiple email touches)
-- - Sequential paid campaigns (remarketing sequences)
-- - Multi-channel campaigns with repetition


-- ─── BUDGET OPTIMIZATION RECOMMENDATIONS ──────────────────────────────────
-- Flag high/underperforming campaigns for budget reallocation
--
WITH campaign_performance AS (
  SELECT
    camp.campaign_id,
    camp.campaign_name,
    camp.channel,
    camp.budget,
    SUM(ms.spend) AS total_spend,
    SUM(c.revenue) AS total_revenue,
    CASE 
      WHEN SUM(ms.spend) > 0 
      THEN SUM(c.revenue) / SUM(ms.spend)
      ELSE 0
    END AS roas,
    AVG(CASE 
      WHEN SUM(ms.spend) > 0 
      THEN SUM(c.revenue) / SUM(ms.spend)
      ELSE 0
    END) OVER () AS avg_roas
  FROM campaigns camp
  LEFT JOIN marketing_spend ms ON camp.campaign_id = ms.campaign_id
  LEFT JOIN web_traffic_touchpoints wt ON camp.campaign_id = wt.campaign_id
  LEFT JOIN conversions c ON wt.user_id = c.user_id 
    AND wt.event_timestamp < c.conversion_timestamp
  GROUP BY camp.campaign_id, camp.campaign_name, camp.channel, camp.budget
)
SELECT
  campaign_id,
  campaign_name,
  channel,
  budget AS current_budget,
  total_spend,
  total_revenue,
  roas,
  avg_roas,
  CASE 
    WHEN roas > avg_roas * 1.3 THEN 'HIGH_PERFORMER'
    WHEN roas < avg_roas * 0.7 THEN 'UNDERPERFORMING'
    ELSE 'ON_TARGET'
  END AS performance_tier,
  CASE 
    WHEN roas > avg_roas * 1.3 
    THEN ROUND(budget * (roas / avg_roas - 1) * 0.4, 2)
    WHEN roas < avg_roas * 0.7 
    THEN ROUND(budget * (1 - roas / avg_roas) * 0.4 * -1, 2)
    ELSE 0
  END AS recommended_budget_change
FROM campaign_performance
ORDER BY roas DESC;
