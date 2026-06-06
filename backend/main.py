"""
Grito Labs: Multi-Channel Marketing Analytics & Attribution Framework
FastAPI Backend Server

This module provides REST API endpoints for:
- Attribution model computation
- KPI calculation and reporting
- Campaign performance analysis
- Budget optimization recommendations
- Real database integration (DuckDB for demo, PostgreSQL for production)
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional, Literal
from datetime import datetime, date
from decimal import Decimal
import logging
import json
import os
import duckdb

# ─── PYDANTIC MODELS ──────────────────────────────────────────────────────

class UserData(BaseModel):
    user_id: str
    signup_date: datetime
    region: Optional[str] = None
    device_type: Optional[str] = None


class CampaignMetadata(BaseModel):
    campaign_id: str
    campaign_name: str
    channel: Literal["Email", "Paid Ad", "Social Media"]
    budget: float
    start_date: date
    end_date: date


class TouchpointData(BaseModel):
    touchpoint_id: str
    user_id: str
    campaign_id: str
    channel: str
    event_type: Literal["Impression", "Click", "Session", "Page View"]
    event_timestamp: datetime
    session_duration_seconds: Optional[int] = None


class ConversionData(BaseModel):
    conversion_id: str
    user_id: str
    conversion_timestamp: datetime
    revenue: float
    conversion_type: str


class KPIResponse(BaseModel):
    ctr: float  # Click-Through Rate (%)
    cpc: float  # Cost Per Click
    cac: float  # Customer Acquisition Cost
    roas: float  # Return on Ad Spend
    cr: float  # Conversion Rate (%)
    clv: float  # Customer Lifetime Value (avg revenue per converted user)
    total_revenue: float
    total_spend: float
    total_conversions: int


class CampaignKPI(BaseModel):
    campaign_id: str
    campaign_name: str
    channel: str
    spend: float
    impressions: int
    clicks: int
    attributed_revenue: float
    roas: float
    cpc: float
    ctr: float
    performance_tier: str


class AttributionResult(BaseModel):
    campaign_id: str
    channel: str
    model: Literal["first_touch", "last_touch", "linear"]
    revenue_attributed: float


class JourneyPath(BaseModel):
    path: str
    conversions: int
    total_revenue: float
    avg_revenue: float
    avg_touchpoints: float


class BudgetRecommendation(BaseModel):
    campaign_id: str
    campaign_name: str
    channel: str
    current_budget: float
    roas: float
    performance_tier: str
    recommended_change: float
    rationale: str


# ─── FASTAPI APP INITIALIZATION ───────────────────────────────────────────

app = FastAPI(
    title="Grito Labs Marketing Analytics API",
    description="Multi-Channel Attribution & ROI Analysis Framework",
    version="1.0.0"
)

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)


@app.get("/", tags=["System"])
async def root():
    """Root endpoint with quick links for browser demos."""
    return {
        "message": "Grito Labs Marketing Analytics API is running",
        "health": "/health",
        "docs": "/docs",
        "clv_by_channel": "/api/v1/clv/by-channel",
        "frontend": "http://127.0.0.1:5173"
    }


# ─── DUCKDB DATABASE INITIALIZATION ───────────────────────────────────────

# Initialize in-memory DuckDB instance
db = duckdb.connect(':memory:')

def init_database():
    """Initialize DuckDB with mock data from JSON for real SQL query capability."""
    try:
        backend_dir = os.path.dirname(__file__)
        project_root = os.path.dirname(backend_dir)
        possible_paths = [
            os.path.join(backend_dir, 'mock_data.json'),
            os.path.join(project_root, 'mock_data.json'),
        ]
        mock_data_path = next((path for path in possible_paths if os.path.exists(path)), None)

        if mock_data_path:
            with open(mock_data_path, 'r') as f:
                mock_data = json.load(f)
            
            # Create conversions table
            if 'conversions' in mock_data:
                conversions_df = __import__('pandas').DataFrame(mock_data['conversions'])
                db.register('conversions', conversions_df)
                logger.info(f"Loaded {len(conversions_df)} conversions into DuckDB")
            
            # Create touchpoints table. Seed data exports this as web_traffic_touchpoints.
            touchpoints = mock_data.get('touchpoints') or mock_data.get('web_traffic_touchpoints')
            if touchpoints:
                touchpoints_df = __import__('pandas').DataFrame(touchpoints)
                db.register('touchpoints', touchpoints_df)
                logger.info(f"Loaded {len(touchpoints_df)} touchpoints into DuckDB")
            
            # Create campaigns table
            if 'campaigns' in mock_data:
                campaigns_df = __import__('pandas').DataFrame(mock_data['campaigns'])
                db.register('campaigns', campaigns_df)
                logger.info(f"Loaded {len(campaigns_df)} campaigns into DuckDB")
        else:
            logger.info("mock_data.json not found - database will be empty until data is seeded")
    except Exception as e:
        logger.warning(f"Could not load mock data: {e}")

# Initialize database on startup
init_database()



def safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    """Safely divide two numbers, returning default if denominator is 0."""
    return numerator / denominator if denominator > 0 else default


def calculate_first_touch_attribution(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData]
) -> Dict[str, float]:
    """
    First-Touch Attribution Model:
    Credits 100% of conversion revenue to the first touchpoint.
    
    Best for: Top-of-funnel channel evaluation
    """
    channel_revenue = {"Email": 0.0, "Paid Ad": 0.0, "Social Media": 0.0}
    campaign_revenue = {}
    
    for conv in conversions:
        # Find all touchpoints before this conversion
        journey = [
            tp for tp in touchpoints
            if tp.user_id == conv.user_id 
            and tp.event_timestamp < conv.conversion_timestamp
        ]
        
        if journey:
            # Sort by timestamp and take the first
            journey.sort(key=lambda x: x.event_timestamp)
            first_tp = journey[0]
            
            channel_revenue[first_tp.channel] += conv.revenue
            campaign_revenue[first_tp.campaign_id] = (
                campaign_revenue.get(first_tp.campaign_id, 0) + conv.revenue
            )
    
    return {"channels": channel_revenue, "campaigns": campaign_revenue}


def calculate_last_touch_attribution(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData]
) -> Dict[str, float]:
    """
    Last-Touch Attribution Model:
    Credits 100% of conversion revenue to the immediate preceding touchpoint.
    
    Best for: Bottom-of-funnel (closing) channel evaluation
    """
    channel_revenue = {"Email": 0.0, "Paid Ad": 0.0, "Social Media": 0.0}
    campaign_revenue = {}
    
    for conv in conversions:
        journey = [
            tp for tp in touchpoints
            if tp.user_id == conv.user_id 
            and tp.event_timestamp < conv.conversion_timestamp
        ]
        
        if journey:
            # Sort by timestamp and take the last
            journey.sort(key=lambda x: x.event_timestamp)
            last_tp = journey[-1]
            
            channel_revenue[last_tp.channel] += conv.revenue
            campaign_revenue[last_tp.campaign_id] = (
                campaign_revenue.get(last_tp.campaign_id, 0) + conv.revenue
            )
    
    return {"channels": channel_revenue, "campaigns": campaign_revenue}


def calculate_linear_u_shaped_attribution(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData]
) -> Dict[str, float]:
    """
    Linear / U-Shaped Attribution Model:
    Distributes credit: 40% first, 40% last, 20% across middle touchpoints.
    
    Best for: Balanced multi-touch view showing top-of-funnel discovery
    and bottom-of-funnel closing impact
    """
    channel_revenue = {"Email": 0.0, "Paid Ad": 0.0, "Social Media": 0.0}
    campaign_revenue = {}
    
    for conv in conversions:
        journey = [
            tp for tp in touchpoints
            if tp.user_id == conv.user_id 
            and tp.event_timestamp < conv.conversion_timestamp
        ]
        
        if journey:
            journey.sort(key=lambda x: x.event_timestamp)
            n = len(journey)
            
            for idx, tp in enumerate(journey):
                # Calculate weight
                if n == 1:
                    weight = 1.0
                elif n == 2:
                    weight = 0.5
                else:
                    if idx == 0 or idx == n - 1:
                        weight = 0.4
                    else:
                        weight = 0.2 / (n - 2)
                
                credit = conv.revenue * weight
                channel_revenue[tp.channel] += credit
                campaign_revenue[tp.campaign_id] = (
                    campaign_revenue.get(tp.campaign_id, 0) + credit
                )
    
    return {"channels": channel_revenue, "campaigns": campaign_revenue}


def compute_kpis(
    spend_data: List[Dict],
    conversions: List[ConversionData],
    users_count: int
) -> KPIResponse:
    """
    Compute all marketing KPIs from aggregated data.
    
    KPIs calculated:
    - CTR: (Clicks / Impressions) × 100
    - CPC: Total Spend / Clicks
    - CAC: Total Spend / Total Conversions
    - ROAS: Total Revenue / Total Spend
    - CR: (Total Conversions / Unique Users) × 100
    - CLV: Total Revenue / Total Conversions (average revenue per converted user)
    """
    total_spend = sum(s.get("spend", 0) for s in spend_data)
    total_clicks = sum(s.get("clicks", 0) for s in spend_data)
    total_impressions = sum(s.get("impressions", 0) for s in spend_data)
    total_conversions = len(conversions)
    total_revenue = sum(c.revenue for c in conversions)
    
    ctr = safe_divide(total_clicks, total_impressions, 0) * 100
    cpc = safe_divide(total_spend, total_clicks, 0)
    cac = safe_divide(total_spend, total_conversions, 0)
    roas = safe_divide(total_revenue, total_spend, 0)
    cr = safe_divide(total_conversions, users_count, 0) * 100
    clv = safe_divide(total_revenue, total_conversions, 0)  # Customer Lifetime Value
    
    return KPIResponse(
        ctr=round(ctr, 2),
        cpc=round(cpc, 2),
        cac=round(cac, 2),
        roas=round(roas, 4),
        cr=round(cr, 2),
        clv=round(clv, 2),
        total_revenue=round(total_revenue, 2),
        total_spend=round(total_spend, 2),
        total_conversions=total_conversions
    )


# ─── API ENDPOINTS ────────────────────────────────────────────────────────

@app.get("/health", tags=["System"])
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "Grito Labs Marketing Analytics API",
        "timestamp": datetime.now().isoformat()
    }


@app.post("/api/v1/kpi/calculate", response_model=KPIResponse, tags=["KPIs"])
async def calculate_kpis(
    spend_data: List[Dict],
    conversions: List[ConversionData],
    users_count: int
):
    """
    Calculate overall marketing KPIs.
    
    Returns:
    - CTR (Click-Through Rate %)
    - CPC (Cost Per Click)
    - CAC (Customer Acquisition Cost)
    - ROAS (Return on Ad Spend)
    - CR (Conversion Rate %)
    - Total Revenue, Spend, Conversions
    """
    try:
        kpis = compute_kpis(spend_data, conversions, users_count)
        return kpis
    except Exception as e:
        logger.error(f"Error calculating KPIs: {str(e)}")
        raise HTTPException(status_code=500, detail=f"KPI calculation failed: {str(e)}")


@app.post("/api/v1/attribution/first-touch", response_model=Dict, tags=["Attribution"])
async def first_touch_attribution(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData]
):
    """
    Calculate First-Touch attribution model.
    Credits 100% of conversion revenue to the first touchpoint.
    """
    try:
        result = calculate_first_touch_attribution(conversions, touchpoints)
        return {
            "model": "first_touch",
            "channel_revenue": result["channels"],
            "campaign_revenue": result["campaigns"],
            "description": "100% credit to first interaction"
        }
    except Exception as e:
        logger.error(f"First-touch attribution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/attribution/last-touch", response_model=Dict, tags=["Attribution"])
async def last_touch_attribution(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData]
):
    """
    Calculate Last-Touch attribution model.
    Credits 100% of conversion revenue to the last touchpoint before conversion.
    """
    try:
        result = calculate_last_touch_attribution(conversions, touchpoints)
        return {
            "model": "last_touch",
            "channel_revenue": result["channels"],
            "campaign_revenue": result["campaigns"],
            "description": "100% credit to last interaction"
        }
    except Exception as e:
        logger.error(f"Last-touch attribution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/attribution/linear", response_model=Dict, tags=["Attribution"])
async def linear_u_shaped_attribution(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData]
):
    """
    Calculate Linear / U-Shaped attribution model.
    Distributes 40% to first, 40% to last, 20% across middle touchpoints.
    """
    try:
        result = calculate_linear_u_shaped_attribution(conversions, touchpoints)
        return {
            "model": "linear_u_shaped",
            "channel_revenue": result["channels"],
            "campaign_revenue": result["campaigns"],
            "description": "40% first, 40% last, 20% distributed across middle"
        }
    except Exception as e:
        logger.error(f"Linear attribution error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/attribution/compare", response_model=Dict, tags=["Attribution"])
async def compare_attribution_models(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData]
):
    """
    Compare all three attribution models side-by-side.
    Returns channel revenue breakdown for each model.
    """
    try:
        first = calculate_first_touch_attribution(conversions, touchpoints)
        last = calculate_last_touch_attribution(conversions, touchpoints)
        linear = calculate_linear_u_shaped_attribution(conversions, touchpoints)
        
        return {
            "first_touch": first["channels"],
            "last_touch": last["channels"],
            "linear_u_shaped": linear["channels"],
            "timestamp": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Attribution comparison error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/journey-paths/top", response_model=List[JourneyPath], tags=["Journey Analysis"])
async def get_top_conversion_paths(
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData],
    limit: int = Query(5, ge=1, le=20)
):
    """
    Identify top N conversion paths by frequency and revenue.
    Helps understand multi-touch customer journeys.
    """
    try:
        path_map = {}
        
        for conv in conversions:
            journey = [
                tp for tp in touchpoints
                if tp.user_id == conv.user_id 
                and tp.event_timestamp < conv.conversion_timestamp
            ]
            
            if journey:
                journey.sort(key=lambda x: x.event_timestamp)
                path = " → ".join([tp.channel for tp in journey])
                
                if path not in path_map:
                    path_map[path] = {
                        "conversions": 0,
                        "total_revenue": 0,
                        "touchpoint_counts": []
                    }
                
                path_map[path]["conversions"] += 1
                path_map[path]["total_revenue"] += conv.revenue
                path_map[path]["touchpoint_counts"].append(len(journey))
        
        results = []
        for path, data in sorted(
            path_map.items(),
            key=lambda x: x[1]["conversions"],
            reverse=True
        )[:limit]:
            results.append(JourneyPath(
                path=path,
                conversions=data["conversions"],
                total_revenue=round(data["total_revenue"], 2),
                avg_revenue=round(data["total_revenue"] / data["conversions"], 2),
                avg_touchpoints=round(sum(data["touchpoint_counts"]) / len(data["touchpoint_counts"]), 1)
            ))
        
        return results
    except Exception as e:
        logger.error(f"Journey path analysis error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/budget-optimization/recommendations", 
          response_model=List[BudgetRecommendation], 
          tags=["Optimization"])
async def get_budget_recommendations(
    campaigns: List[CampaignMetadata],
    spend_data: List[Dict],
    conversions: List[ConversionData],
    touchpoints: List[TouchpointData],
    performance_threshold: float = Query(0.3, ge=0.1, le=0.5)
):
    """
    Generate budget optimization recommendations.
    Flags high-performing campaigns for budget increase,
    underperforming campaigns for reallocation.
    """
    try:
        campaign_roas = {}
        
        for camp in campaigns:
            camp_spend = sum(
                s.get("spend", 0) for s in spend_data 
                if s.get("campaign_id") == camp.campaign_id
            )
            
            camp_revenue = 0
            camp_touchpoints = [
                tp for tp in touchpoints 
                if tp.campaign_id == camp.campaign_id
            ]
            
            for conv in conversions:
                journey = [
                    tp for tp in camp_touchpoints
                    if tp.user_id == conv.user_id 
                    and tp.event_timestamp < conv.conversion_timestamp
                ]
                if journey:
                    camp_revenue += conv.revenue
            
            roas = safe_divide(camp_revenue, camp_spend, 0)
            campaign_roas[camp.campaign_id] = {
                "campaign": camp,
                "spend": camp_spend,
                "revenue": camp_revenue,
                "roas": roas
            }
        
        # Calculate average ROAS as baseline
        avg_roas = (
            sum(v["roas"] for v in campaign_roas.values()) / len(campaign_roas)
            if campaign_roas else 1.0
        )
        
        recommendations = []
        for camp_id, data in campaign_roas.items():
            camp = data["campaign"]
            roas = data["roas"]
            
            if roas > avg_roas * (1 + performance_threshold):
                tier = "HIGH_PERFORMER"
                change = data["spend"] * (roas / avg_roas - 1) * 0.4
                rationale = f"ROAS {roas:.2f}× exceeds average {avg_roas:.2f}×. Increase budget to capitalize."
            elif roas < avg_roas * (1 - performance_threshold):
                tier = "UNDERPERFORMING"
                change = -data["spend"] * (1 - roas / avg_roas) * 0.4
                rationale = f"ROAS {roas:.2f}× below average {avg_roas:.2f}×. Reduce spend or optimize."
            else:
                tier = "ON_TARGET"
                change = 0
                rationale = "Balanced performance. Maintain current allocation."
            
            recommendations.append(BudgetRecommendation(
                campaign_id=camp.campaign_id,
                campaign_name=camp.campaign_name,
                channel=camp.channel,
                current_budget=camp.budget,
                roas=round(roas, 2),
                performance_tier=tier,
                recommended_change=round(change, 2),
                rationale=rationale
            ))
        
        return sorted(recommendations, key=lambda x: x.roas, reverse=True)
    except Exception as e:
        logger.error(f"Budget optimization error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))


# ─── DATABASE QUERY ENDPOINT (DUCKDB) ──────────────────────────────────────

@app.get("/api/v1/clv/by-channel", tags=["Analytics"])
async def get_clv_by_channel():
    """
    Get Customer Lifetime Value (CLV) by channel using DuckDB SQL queries.

    This endpoint demonstrates real database integration:
    - Queries actual data from DuckDB via a 3-table JOIN
    - Derives channel from web_traffic_touchpoints (where campaign_id lives),
      NOT from conversions (which has no campaign_id column)
    - Shows CLV (average revenue per converted user) by marketing channel
    - Uses real SQL aggregation instead of in-memory calculations

    Schema note:
      conversions  → has: conversion_id, user_id, revenue, conversion_timestamp
      touchpoints  → has: touchpoint_id, user_id, campaign_id, channel, event_timestamp
      campaigns    → has: campaign_id, channel, campaign_name

    Join strategy:
      conversions  JOIN touchpoints ON user_id + timestamp guard
                   JOIN campaigns   ON campaign_id
    This correctly resolves the channel for every conversion without
    requiring a campaign_id column on the conversions table itself.

    CLV = Total Revenue from Channel / Total Converted Users from Channel
    """
    try:
        # ── Real SQL query: join conversions → touchpoints → campaigns ─────────
        # conversions has no campaign_id; channel is resolved via the last
        # touchpoint before each conversion (i.e. the closing touchpoint).
        query = """
        WITH last_touch AS (
            -- For each conversion, find the single touchpoint immediately
            -- preceding it (last-touch), which carries the campaign / channel.
            SELECT
                conv.conversion_id,
                conv.user_id,
                CAST(conv.revenue AS DOUBLE) AS revenue,
                tp.campaign_id,
                tp.channel,
                ROW_NUMBER() OVER (
                    PARTITION BY conv.conversion_id
                    ORDER BY tp.event_timestamp DESC
                ) AS rn
            FROM conversions conv
            JOIN touchpoints tp
                ON  conv.user_id           = tp.user_id
                AND tp.event_timestamp     < conv.conversion_timestamp
            WHERE CAST(conv.revenue AS DOUBLE) > 0
        )
        SELECT
            lt.channel,
            COUNT(DISTINCT lt.user_id)    AS converted_users,
            ROUND(SUM(lt.revenue) / COUNT(DISTINCT lt.user_id), 2) AS clv,
            ROUND(SUM(lt.revenue), 2)     AS total_revenue,
            COUNT(DISTINCT lt.conversion_id) AS conversion_count
        FROM last_touch lt
        WHERE lt.rn = 1
        GROUP BY lt.channel
        ORDER BY clv DESC
        """

        result = db.execute(query).fetchall()

        if not result:
            return {
                "message": (
                    "No conversion data found in DuckDB. "
                    "Run backend/seed_data.py to seed mock_data.json, "
                    "then restart the server so init_database() reloads it."
                ),
                "clv_by_channel": []
            }

        columns = ['channel', 'converted_users', 'clv', 'total_revenue', 'conversion_count']
        clv_data = [dict(zip(columns, row)) for row in result]

        return {
            "source": "DuckDB (Real SQL Query — 3-table JOIN)",
            "query_type": "SQL Aggregation via last-touch channel resolution",
            "join_path": "conversions → touchpoints → channel (last touch before conversion)",
            "clv_by_channel": clv_data,
            "note": (
                "CLV = average revenue per converted user, attributed to the "
                "channel of the last touchpoint before conversion. "
                "channel is resolved through web_traffic_touchpoints because "
                "the conversions table does not carry a campaign_id column."
            )
        }
    except Exception as e:
        logger.error(f"CLV query error: {str(e)}")
        return {
            "error": "Database query failed",
            "message": str(e),
            "hint": (
                "Ensure mock_data.json exists and the server loaded it on startup. "
                "Check that 'conversions', 'touchpoints', and 'campaigns' keys "
                "are present in mock_data.json. Run: python backend/seed_data.py"
            )
        }


# ─── DOCUMENTATION ENDPOINT ───────────────────────────────────────────────

@app.get("/api/v1/docs/models", tags=["Documentation"])
async def get_attribution_models_documentation():
    """
    Get detailed documentation on attribution models.
    """
    return {
        "models": {
            "first_touch": {
                "description": "100% credit to first touchpoint",
                "use_case": "Evaluating top-of-funnel discovery channels",
                "pros": ["Simple", "Identifies awareness drivers"],
                "cons": ["Ignores multi-touch assistance", "Overvalues first interaction"]
            },
            "last_touch": {
                "description": "100% credit to last touchpoint before conversion",
                "use_case": "Evaluating bottom-of-funnel closing channels",
                "pros": ["Simple", "Identifies closing channels"],
                "cons": ["Ignores journey assistance", "Overvalues immediate driver"]
            },
            "linear_u_shaped": {
                "description": "40% first, 40% last, 20% across middle touchpoints",
                "use_case": "Balanced view of multi-touch impact",
                "pros": ["Fair distribution", "Recognizes first and last impact", "Acknowledges mid-funnel"],
                "cons": ["More complex", "Arbitrary weights"]
            }
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
