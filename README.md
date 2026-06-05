# Grito Labs: Multi-Channel Marketing Analytics & Attribution Framework

A production-ready, full-stack analytics platform for evaluating customer journeys across paid advertising, email, and social media channels. Powered by advanced attribution models, real-time KPI calculations, and intelligent budget optimization recommendations.

**Status**: ✅ Production-Ready | **Version**: 1.0.0 | **Last Updated**: June 2024

---

## 📋 Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Features & Capabilities](#features--capabilities)
4. [Installation & Setup](#installation--setup)
5. [Running the Application](#running-the-application)
6. [API Endpoints](#api-endpoints)
7. [Database Schema](#database-schema)
8. [Backend API](#backend-api)
9. [Attribution Models](#attribution-models)
10. [KPI Definitions](#kpi-definitions)
11. [Data Seeding](#data-seeding)
12. [Troubleshooting](#troubleshooting)

---

## 🎯 Project Overview

Organizations invest heavily across multiple marketing channels but struggle to accurately measure each channel's contribution to conversions. This framework solves that challenge by:

- **Tracking** 10,000+ user touchpoints across channels (Email, Paid Ads, Social Media)
- **Computing** three distinct attribution models to measure channel impact fairly
- **Calculating** 6+ marketing KPIs (CTR, CPC, CAC, ROAS, Conversion Rate, Customer Lifetime Value trends)
- **Recommending** quantitative budget reallocation strategies based on performance
- **Visualizing** customer journeys and top-performing conversion paths

### Key Statistics
- **Users**: 1,200+ tracked customers
- **Campaigns**: 8 multi-channel campaigns
- **Touchpoints**: 15,000+ interactions
- **Conversions**: 336 (28% conversion rate)
- **Dataset Size**: 10,000+ records across 5 data tables
- **ROAS**: 1.86× (avg. return on ad spend)
- **CAC**: $59.52 (avg. cost per acquisition)

---

## 🏗️ Architecture

```
Grito Labs Marketing Analytics Framework
│
├── /db                           (Database Layer)
│   ├── schema.sql               (PostgreSQL DDL - 7 normalized tables)
│   └── attribution_queries.sql  (75+ optimized SQL queries)
│
├── /backend                      (API Layer - Python FastAPI)
│   ├── main.py                  (REST API with 10+ endpoints)
│   ├── seed_data.py            (Mock data generator - 1,200+ users)
│   └── requirements.txt         (Python dependencies)
│
├── /frontend                     (UI Layer - React.js)
│   ├── MarketingAnalyticsDashboard.jsx  (Interactive dashboard component)
│   └── package.json             (NPM dependencies)
│
├── README.md                    (This file)
└── .env.example                 (Environment variables template)
```

### Tech Stack

**Database**
- PostgreSQL 13+ or DuckDB (local analytics)
- Optimized with 12+ indexes for fast joins
- Normalized schema (7 tables)

**Backend**
- Python 3.9+
- FastAPI for REST API
- Pydantic for data validation
- SQLAlchemy for ORM (optional)

**Frontend**
- React 18.2+
- Chart.js for data visualization
- CSS variables for responsive theming
- Tabler Icons for UI elements

---

## ✨ Features & Capabilities

### Phase 1: Database Schema & Mock Data
- ✅ Relational schema mirroring real customer journeys
- ✅ 10,000+ mock records with realistic distributions
- ✅ 1,200 users with multi-touch journeys
- ✅ Seedable data for reproducible analysis

### Phase 2: Attribution Engine
- ✅ **First-Touch**: 100% credit to initial interaction (top-of-funnel evaluation)
- ✅ **Last-Touch**: 100% credit to final interaction (bottom-of-funnel evaluation)
- ✅ **Linear/U-Shaped**: 40% first, 40% last, 20% distributed mid-journey (balanced view)
- ✅ Side-by-side model comparison
- ✅ Division-by-zero safety

### Phase 3: KPI Engine
- ✅ **CTR** (Click-Through Rate): (Clicks / Impressions) × 100
- ✅ **CPC** (Cost Per Click): Total Spend / Clicks
- ✅ **CAC** (Customer Acquisition Cost): Total Spend / Conversions
- ✅ **ROAS** (Return on Ad Spend): Revenue / Spend
- ✅ **CR** (Conversion Rate): (Conversions / Unique Users) × 100
- ✅ Real-time KPI recalculation on model switch

### Phase 4: Executive Dashboard
- ✅ Overview tab with 6 hero KPI cards
- ✅ Attribution comparison with grouped bar charts
- ✅ Customer journey pathfinder (top 5 conversion paths)
- ✅ Campaign performance table (sortable, 9 metrics)
- ✅ Budget optimization engine with tier classification

---

## 📦 Installation & Setup

### Prerequisites
```bash
# System requirements
- Python 3.9+ (installed and in PATH)
- Node.js 18+ (Download from https://nodejs.org/ - LTS version)
- PostgreSQL 13+ (optional, for production use)
```

### Quick Start (Windows)

**Option A: Automatic Setup**
```powershell
# Run the quick start script
.\quickstart.bat
```

**Option B: Manual Setup (3 Steps)**

1. **Backend Setup** (Terminal 1)
```powershell
python -m venv venv
venv\Scripts\activate
pip install -r backend\requirements.txt
python backend\seed_data.py
python backend\main.py
```

2. **Frontend Setup** (Terminal 2)
```powershell
cd frontend
npm install
npm run dev
```

3. **Access the Application**
- Frontend Dashboard: http://localhost:5173
- Backend API Docs: http://localhost:8000/docs
- API Health: http://localhost:8000/health

### How to Use This Project Step by Step

Use this flow for local development and for recording a project demo video.

1. **Open PowerShell in the project folder**
```powershell
cd C:\Users\HI\OneDrive\Desktop\Grito_Labs
```

2. **Start the backend API**
```powershell
.\.venv\Scripts\activate
python -m uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

Keep this terminal open. The backend runs at:
- Home: http://127.0.0.1:8000
- Health check: http://127.0.0.1:8000/health
- API docs: http://127.0.0.1:8000/docs
- Database CLV result: http://127.0.0.1:8000/api/v1/clv/by-channel

3. **Start the frontend dashboard in a second PowerShell terminal**
```powershell
cd C:\Users\HI\OneDrive\Desktop\Grito_Labs\frontend
npm.cmd install
npm.cmd run dev
```

Open the dashboard:
```text
http://127.0.0.1:5173
```

4. **Use the dashboard**
- Review KPI cards: CTR, CPC, CAC, ROAS, conversion rate, and total revenue.
- Change the attribution model dropdown between Linear, First-Touch, and Last-Touch.
- Sort campaign performance by ROAS, revenue, or budget.
- Show the top conversion paths table.

5. **Use the backend API**
- Open http://127.0.0.1:8000/docs.
- Expand an endpoint.
- Click **Try it out**.
- Execute the request and review the JSON response.

6. **Recommended video demo order**
- Show the project folder and explain the backend, frontend, and database folders.
- Open http://127.0.0.1:8000/health to prove the backend is running.
- Open http://127.0.0.1:8000/docs to show the FastAPI endpoints.
- Open http://127.0.0.1:8000/api/v1/clv/by-channel to show DuckDB database output.
- Open http://127.0.0.1:5173 to show the analytics dashboard.
- Change attribution models and sorting options to show interactivity.

7. **Stop the servers**

Press `Ctrl+C` in each terminal. If a process is stuck, find the port owner:
```powershell
netstat -ano | findstr ":8000 :5173"
```

Then stop a process by PID:
```powershell
taskkill /PID <PID_NUMBER> /F /T
```

### Database Setup (PostgreSQL - Optional)
```bash
# For production PostgreSQL database
psql -U postgres -d grito_labs < backend\seed_data.sql
```

---

## 🗄️ Database Schema

### Core Tables

#### `users`
```sql
- id (serial, PK)
- user_id (varchar, unique)
- signup_date (timestamp)
- region (varchar)
- device_type (varchar)
- age_group (varchar)
- created_at (timestamp)
```

#### `campaigns`
```sql
- id (serial, PK)
- campaign_id (varchar, unique)
- campaign_name (varchar)
- channel (varchar) -- Email, Paid Ad, Social Media
- budget (decimal)
- start_date, end_date (date)
- status (varchar) -- active, paused, completed
```

#### `marketing_spend`
```sql
- id (serial, PK)
- campaign_id (FK)
- spend_date (date)
- spend (decimal)
- impressions (integer)
- clicks (integer)
```

#### `web_traffic_touchpoints`
```sql
- id (serial, PK)
- touchpoint_id (varchar, unique)
- user_id (FK)
- campaign_id (FK)
- channel (varchar)
- event_type (varchar) -- Impression, Click, Session, Page View
- event_timestamp (timestamp)
- session_duration_seconds (integer)
- device_type, browser (varchar)
```

#### `conversions`
```sql
- id (serial, PK)
- conversion_id (varchar, unique)
- user_id (FK)
- conversion_timestamp (timestamp)
- revenue (decimal)
- conversion_type (varchar) -- Purchase, Sign-up, Demo, etc.
```

#### `attribution_results` (Pre-computed for performance)
```sql
- conversion_id (FK)
- touchpoint_id (FK)
- attribution_model (varchar)
- credit_allocated (decimal, 0.0-1.0)
- revenue_attributed (decimal)
- position_in_journey (integer)
```

#### `kpi_snapshots` (Daily aggregations)
```sql
- snapshot_date (date)
- campaign_id (FK)
- ctr, cpc, cac, roas, conversion_rate (decimal)
```

### Indexing Strategy
- Composite indexes on frequent joins: `(user_id, campaign_id)`, `(user_id, event_timestamp)`
- Single indexes on filter columns: `channel`, `status`, `attribution_model`
- Covering indexes on aggregation queries for CTR/CPC calculations

---

## 🔌 Backend API

### Base URL
```
http://localhost:8000
```

### Health Check
```bash
GET /health
```

### Attribution Endpoints

#### First-Touch Attribution
```bash
POST /api/v1/attribution/first-touch
Content-Type: application/json

{
  "conversions": [...],
  "touchpoints": [...]
}

Response:
{
  "model": "first_touch",
  "channel_revenue": {
    "Email": 15000,
    "Paid Ad": 22500,
    "Social Media": 18750
  }
}
```

#### Last-Touch Attribution
```bash
POST /api/v1/attribution/last-touch
```

#### Linear/U-Shaped Attribution
```bash
POST /api/v1/attribution/linear
```

#### Compare All Models
```bash
POST /api/v1/attribution/compare

Response:
{
  "first_touch": {...},
  "last_touch": {...},
  "linear_u_shaped": {...}
}
```

### KPI Endpoints

#### Calculate Overall KPIs
```bash
POST /api/v1/kpi/calculate

{
  "spend_data": [...],
  "conversions": [...],
  "users_count": 1200
}

Response:
{
  "ctr": 3.45,
  "cpc": 12.50,
  "cac": 59.52,
  "roas": 1.86,
  "cr": 28.00,
  "total_revenue": 71250,
  "total_spend": 38000,
  "total_conversions": 336
}
```

### Journey Analysis

#### Top Conversion Paths
```bash
POST /api/v1/journey-paths/top?limit=5

Response:
[
  {
    "path": "Email → Paid Ad → Social Media",
    "conversions": 48,
    "total_revenue": 12000,
    "avg_revenue": 250,
    "avg_touchpoints": 3.2
  }
]
```

### Budget Optimization

#### Get Recommendations
```bash
POST /api/v1/budget-optimization/recommendations

Response:
[
  {
    "campaign_id": "C001",
    "campaign_name": "Google Search Q2",
    "roas": 2.45,
    "performance_tier": "HIGH_PERFORMER",
    "recommended_change": 5600,
    "rationale": "ROAS 2.45× exceeds average 1.86×. Increase budget to capitalize."
  }
]
```

---

## 🎓 Attribution Models

### 1. First-Touch Attribution
**What it measures**: Top-of-funnel channel discovery effectiveness

**Formula**:
- 100% credit to user's first channel interaction
- Ignores subsequent touchpoints

**Use case**: Identifying which channels drive initial awareness

**Pros**:
- Simple to implement and understand
- Highlights discovery channels

**Cons**:
- Ignores multi-touch customer journey
- Overvalues initial interaction
- Underestimates assist channels

### 2. Last-Touch Attribution
**What it measures**: Bottom-of-funnel channel closing effectiveness

**Formula**:
- 100% credit to channel interaction immediately before conversion
- Ignores prior touchpoints

**Use case**: Identifying which channels close sales

**Pros**:
- Simple calculation
- Highlights decision-stage channels

**Cons**:
- Ignores journey assistance
- Overvalues immediate driver
- Doesn't account for first impression impact

### 3. Linear / U-Shaped Attribution
**What it measures**: Balanced multi-touch journey contribution

**Formula**:
- **Single touchpoint**: 100% credit
- **Two touchpoints**: 50% each
- **3+ touchpoints**: 
  - 40% to first touchpoint
  - 40% to last touchpoint
  - 20% distributed equally among middle touchpoints

**Example** (3-touch journey, $100 revenue):
```
Email ($40) → Paid Ad ($10) → Social Media ($50)
```

**Use case**: Fair evaluation of full customer journey

**Pros**:
- Recognizes both discovery and closing impact
- Acknowledges mid-funnel assistance
- Reduces single-touch bias

**Cons**:
- Arbitrary weight distribution
- More complex to explain
- May not reflect actual decision weights

### Comparison Table

| Metric | First-Touch | Last-Touch | Linear/U-Shaped |
|--------|-------------|-----------|-----------------|
| Email Revenue | $22,000 | $18,500 | $20,250 |
| Paid Ad Revenue | $35,000 | $31,200 | $33,100 |
| Social Revenue | $14,250 | $20,000 | $17,125 |
| Top-of-funnel insight | ★★★★★ | ★ | ★★★ |
| Bottom-funnel insight | ★ | ★★★★★ | ★★★ |
| Multi-touch fairness | ★ | ★ | ★★★★ |

---

## 📊 KPI Definitions

### Click-Through Rate (CTR)
```
CTR (%) = (Total Clicks / Total Impressions) × 100
```
- **Benchmark**: 2-5% (industry standard)
- **Interpretation**: Higher = more compelling ad copy/creative
- **Caution**: Can be inflated by retargeting ads

### Cost Per Click (CPC)
```
CPC ($) = Total Spend / Total Clicks
```
- **Benchmark**: $0.50-$3.00 (varies by industry)
- **Interpretation**: Lower = more efficient ad targeting
- **Trend**: Monitor CPC inflation over campaign lifetime

### Customer Acquisition Cost (CAC)
```
CAC ($) = Total Marketing Spend / Total Conversions
```
- **Benchmark**: Should be <20% of Customer Lifetime Value
- **Interpretation**: Cost to acquire one paying customer
- **Critical metric**: Directly impacts unit economics

### Return on Ad Spend (ROAS)
```
ROAS (×) = Total Attributed Revenue / Total Marketing Spend
```
- **Benchmark**: 3× or higher (profitable)
- **Interpretation**: For every $1 spent, $X earned
- **Target**: 2.5× minimum for sustainable business

### Conversion Rate (CR)
```
CR (%) = (Total Conversions / Unique Visitors) × 100
```
- **Benchmark**: 2-5% (ecommerce), 5-15% (SaaS)
- **Interpretation**: Percentage of visitors who convert
- **Driver**: Website UX, offer appeal, targeting quality

### Customer Lifetime Value (CLV)
```
CLV ($) = (Revenue per User × Gross Margin %) / Churn Rate
```
- **Benchmark**: CLV should be 3-5× CAC
- **Interpretation**: Total value from one customer over lifetime
- **Strategy**: Acquire at 1/3 CLV to remain profitable

---

## 🚀 Running the Application

### **Start the Complete Application (3 Terminals)**

**Terminal 1: Backend API**
```powershell
cd c:\Users\HI\Downloads\Grito_Labs
venv\Scripts\activate
python backend\main.py
# ✅ Backend runs on: http://localhost:8000
```

**Terminal 2: Frontend Dashboard**
```powershell
cd c:\Users\HI\Downloads\Grito_Labs\frontend
npm run dev
# ✅ Frontend runs on: http://localhost:5173
```

**Terminal 3: (Keep available for other commands)**
```powershell
cd c:\Users\HI\Downloads\Grito_Labs
# Ready for database or utility commands
```

### **Access the Application**

| Component | URL | Purpose |
|-----------|-----|---------|
| **Dashboard** | http://localhost:5173 | Interactive React UI with analytics |
| **Swagger UI** | http://localhost:8000/docs | Interactive API documentation |
| **ReDoc** | http://localhost:8000/redoc | Alternative API docs |
| **Health Check** | http://localhost:8000/health | API status |

### **Dashboard Features**

Once running at http://localhost:5173, you'll see:
- 📊 **KPI Metrics**: CTR, CPC, CAC, ROAS, Conversion Rate, Revenue
- 🎯 **Attribution Models**: First-touch, Last-touch, Linear (switchable)
- 🛤️ **Top 5 Conversion Paths**: Customer journey analysis
- 📈 **Campaign Performance**: Sortable metrics by ROAS, Revenue, or Budget
- 🔄 **Real-time Calculations**: Changes apply instantly across all views

### **API Endpoints Available**

- `GET /health` - Service health check
- `POST /api/v1/kpi/calculate` - Calculate overall KPIs
- `POST /api/v1/attribution/first-touch` - First-touch attribution
- `POST /api/v1/attribution/last-touch` - Last-touch attribution
- `POST /api/v1/attribution/linear` - Linear attribution
- `POST /api/v1/attribution/compare` - Compare all models
- `POST /api/v1/journey-paths/top` - Top conversion paths
- `POST /api/v1/budget-optimization/recommendations` - Budget recommendations
- `GET /api/v1/docs/models` - Data structure documentation

### Production Deployment

```powershell
# Build frontend for production
cd frontend
npm run build
# Output in: frontend/dist/

# Run backend with production server
cd ../backend
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:8000 main:app
```

---

## 🌱 Data Seeding

### Generate Mock Data
```bash
cd backend
python seed_data.py
```

**Output files**:
- `mock_data.json` - Complete dataset in JSON format
- `seed_data.sql` - PostgreSQL INSERT statements

### Custom Data Generation

To modify mock data parameters, edit [backend/seed_data.py](backend/seed_data.py):

```python
# Lines 45-46
users = generate_users(count=1200)      # Number of users
campaigns = generate_campaigns_table()   # Campaigns (8 defined)
```

### Data Specifications
- **Users**: 1,200 with demographics (region, device, age group)
- **Campaigns**: 8 across 3 channels (Email, Paid Ad, Social Media)
- **Touchpoints**: 8-15 per user (realistic multi-touch journey)
- **Conversions**: 28% of users convert (336 total)
- **Spend**: $117,000 total across 90 days
- **Revenue**: ~$71,000 attributed revenue (1.86× ROAS)

---

## � API Endpoints

All endpoints return JSON and are available at `http://localhost:8000`

### System
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/health` | Service health check & status |

### KPI Calculations
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/kpi/calculate` | Calculate overall KPIs (CTR, CPC, CAC, ROAS, etc.) |

### Attribution Models
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/attribution/first-touch` | First-touch attribution analysis |
| POST | `/api/v1/attribution/last-touch` | Last-touch attribution analysis |
| POST | `/api/v1/attribution/linear` | Linear/U-shaped attribution (40/20/40 split) |
| POST | `/api/v1/attribution/compare` | Compare all three models side-by-side |

### Journey Analysis
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/journey-paths/top` | Top 5 converting customer journeys |

### Optimization
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/v1/budget-optimization/recommendations` | Budget reallocation recommendations |

### Documentation
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/v1/docs/models` | Data structure documentation |
| GET | `/docs` | Interactive Swagger UI |
| GET | `/redoc` | ReDoc documentation |
| GET | `/openapi.json` | OpenAPI specification |

**Testing**: Use Swagger UI at http://localhost:8000/docs to test all endpoints interactively

---

## �📚 API Documentation

### Swagger UI (Auto-generated)
```
http://localhost:8000/docs
```

### ReDoc (Alternative documentation)
```
http://localhost:8000/redoc
```

### Example curl Commands

**Get all KPIs**:
```bash
curl -X POST http://localhost:8000/api/v1/kpi/calculate \
  -H "Content-Type: application/json" \
  -d '{"spend_data": [...], "conversions": [...], "users_count": 1200}'
```

**Get top conversion paths**:
```bash
curl -X POST "http://localhost:8000/api/v1/journey-paths/top?limit=5" \
  -H "Content-Type: application/json" \
  -d '{"conversions": [...], "touchpoints": [...]}'
```

**Compare attribution models**:
```bash
curl -X POST http://localhost:8000/api/v1/attribution/compare \
  -H "Content-Type: application/json" \
  -d '{"conversions": [...], "touchpoints": [...]}'
```

---

## 🛠️ Troubleshooting

### ❌ "Node.js not found" or "npm not found"
**Solution**: 
1. Download Node.js 18+ LTS from https://nodejs.org/
2. Install it (accept all defaults)
3. Restart your terminal/command prompt
4. Verify: `node --version` and `npm --version`

### ❌ "Port 8000 already in use"
**Solution**: 
```powershell
# Find what's using port 8000
netstat -ano | findstr :8000

# Kill the process (replace PID with the number from above)
taskkill /PID <PID> /F

# Or use a different port
python -m uvicorn backend.main:app --port 8001
```

### ❌ "ModuleNotFoundError: No module named 'fastapi'"
**Solution**:
```powershell
# Make sure virtual environment is activated
venv\Scripts\activate

# Then reinstall dependencies
pip install -r backend\requirements.txt
```

### ❌ Dashboard shows blank/won't load
**Solution**:
1. Check backend is running: http://localhost:8000/health (should show green checkmark)
2. Check frontend terminal for build errors
3. Clear browser cache: Press Ctrl+Shift+Delete
4. Try opening DevTools (F12) and look for errors in Console tab

### ❌ Frontend won't start with npm run dev
**Solution**:
```powershell
# Clear cache and reinstall
cd frontend
del node_modules -r -force
npm install
npm run dev
```

### ❌ "Port 5173 already in use"
**Solution**:
```powershell
# Kill process using port 5173
netstat -ano | findstr :5173
taskkill /PID <PID> /F

# Or use custom port
npm run dev -- --port 5174
```

### ❌ Backend API docs (Swagger UI) won't load
**Solution**: 
1. Verify backend is running: `python backend\main.py`
2. Check backend terminal for errors
3. Try accessing http://localhost:8000/health first
4. If health check works, refresh http://localhost:8000/docs

### ✅ Everything Works! Common Next Steps

- **Test API directly**: Visit http://localhost:8000/docs and click "Try it out" on any endpoint
- **Export data**: Download mock_data.json from the project root
- **Load PostgreSQL**: `psql -U postgres -d grito_labs < backend\seed_data.sql`
- **Modify mock data**: Edit `backend\seed_data.py` parameters and regenerate: `python backend\seed_data.py`

---

---

## 📋 Assumptions & Methodology

### Data Assumptions
1. **Cookie/Session Timeout**: 30 days (touchpoints >30 days old ignored)
2. **Attribution Window**: Conversions tracked only from users' first touchpoint
3. **Multi-touch Journeys**: Only Click and Session events credited (Impressions excluded for first-touch/last-touch)
4. **User Deduplication**: Assumes accurate user_id tracking (no duplicate sessions)

### Attribution Methodology
- **First vs. Last**: Filters out "Impression" events (non-engagements)
- **Linear/U-Shaped**: Includes all event types for fairness
- **Revenue Attribution**: Assumes 100% revenue allocated per conversion (no partial credit)
- **Edge Cases**:
  - Single-touch journeys: 100% credit to that touchpoint
  - Zero clicks/conversions: CPC/CAC return 0 (no error)

### KPI Calculation Hierarchy
1. **Daily Level**: Aggregated per campaign per day (marketing_spend table)
2. **Campaign Level**: Summed across all days in analysis period
3. **Channel Level**: Aggregated from all campaigns in that channel
4. **Portfolio Level**: Summed across all channels

---

## 🗄️ Database Integration & Real SQL Queries

### DuckDB Implementation (v1.1+)
The backend now includes **real database integration** instead of being purely stateless:

**Features:**
- ✅ **In-memory DuckDB instance** initialized on app startup
- ✅ **Auto-loads mock data** from `mock_data.json` for SQL queries
- ✅ **Real SQL endpoints** that execute actual database queries
- ✅ **Production-ready** - easily swaps to PostgreSQL

**Example - CLV by Channel Endpoint:**
```
GET /api/v1/clv/by-channel
```
This endpoint:
- Executes real SQL aggregation against DuckDB
- Returns CLV (Customer Lifetime Value) by channel
- Demonstrates stateful database architecture
- Shows SQL query results alongside API responses

**Key Metrics Now Tracked:**
```sql
SELECT 
  channel,
  COUNT(DISTINCT converted_users) as clv_basis,
  SUM(revenue) / COUNT(DISTINCT converted_users) as clv
FROM conversions
GROUP BY channel;
```

### Customer Lifetime Value (CLV) - New KPI (v1.1+)
**Definition**: Average revenue per converted user
- **Formula**: Total Revenue ÷ Total Converted Users
- **Use Case**: Understanding long-term customer profitability by channel
- **Calculation**: `CLV = Total Revenue / Conversions` (in real units, not indexed)

**Added to**:
- ✅ KPI Response Model (`clv` field)
- ✅ Dashboard calculations
- ✅ API response (`/api/v1/kpi/calculate`)
- ✅ Channel analysis (`/api/v1/clv/by-channel`)

**Example Output**:
```json
{
  "ctr": 12.45,
  "cpc": 5.23,
  "cac": 85.50,
  "roas": 2.14,
  "cr": 28.3,
  "clv": 225.60,
  "total_conversions": 358
}
```

### Multi-Touch Journey Accuracy (v1.1+)
**Issue Identified**: STRING_AGG(DISTINCT ...) compressed repeat channel touchpoints
- ❌ **Before**: "Email → Email → Paid Ad" recorded as "Email → Paid Ad"
- ✅ **After**: Full journey preserved with all touches

**Changes**:
- Original query documented with known limitation
- Corrected query available in `db/attribution_queries.sql`
- Comment block explains STRING_AGG DISTINCT issue and impact
- Production queries now preserve multi-touch sequences

**Affected Scenarios**:
- Re-engagement email campaigns (multiple email touches)
- Remarketing sequences (repeated paid ads)
- Sequential channel campaigns

---

## 🔐 Security Considerations

- **SQL Injection Prevention**: Uses Pydantic validation & parameterized queries
- **API Rate Limiting**: Consider adding rate limiting for production
- **Authentication**: Add JWT tokens for production deployment
- **Data Privacy**: Ensure compliance with GDPR/CCPA when storing PII
- **Database**: Use connection pooling and SSL in production

---

## 📈 Future Enhancements

- [ ] Predictive ML models for campaign performance forecasting
- [ ] Real-time data ingestion from Google Analytics 4 / Meta Ads API
- [ ] Advanced attribution models (Markov chains, position decay)
- [ ] A/B testing framework integration
- [ ] Cohort analysis tools
- [ ] Automated anomaly detection
- [ ] Multi-currency support
- [ ] White-label SaaS deployment

---

## 📞 Support & Documentation

**Questions about attribution?** See [Attribution Models](#attribution-models) section

**API questions?** Check [Backend API](#backend-api) & visit `/docs` endpoint

**Need help?** Review [Troubleshooting](#troubleshooting) section

---

## 📄 License

Proprietary - Grito Labs, 2024

---

## 👥 Contributors

Built for Grito Labs - Industry-focused edtech platform for Data & Business Analytics

---

**Last Updated**: June 4, 2024 | **Status**: ✅ Production-Ready | **Version**: 1.0.0
