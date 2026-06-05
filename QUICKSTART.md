# 🚀 Quick Start (2 minutes)

## Prerequisites
- ✅ Python 3.9+
- ✅ Node.js 18+ (Download: https://nodejs.org/)

## Step 1: Open 2 Terminals

### Terminal 1: Backend (API)
```powershell
cd c:\Users\HI\Downloads\Grito_Labs
python -m venv venv
venv\Scripts\activate
pip install -r backend\requirements.txt
python backend\seed_data.py
python backend\main.py
```

**Expected output:**
```
✓ Generated mock data
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8000
```

### Terminal 2: Frontend (Dashboard)
```powershell
cd c:\Users\HI\Downloads\Grito_Labs\frontend
npm install
npm run dev
```

**Expected output:**
```
VITE v5.0.0  ready in XXX ms

➜  Local:   http://localhost:5173/
```

## Step 3: Open Browser

| What | URL | What You'll See |
|------|-----|-----------------|
| **Dashboard** | http://localhost:5173 | Interactive marketing analytics UI |
| **API Docs** | http://localhost:8000/docs | Swagger interactive endpoints |
| **Health** | http://localhost:8000/health | `{"status": "healthy"}` |

## Dashboard Features

✅ **6 KPI Metrics** - CTR, CPC, CAC, ROAS, Conversion Rate, Revenue
✅ **Attribution Models** - Switch between First-Touch, Last-Touch, Linear
✅ **Top Conversion Paths** - See best customer journeys
✅ **Campaign Performance** - Sortable table with all metrics
✅ **Real-time Updates** - Changes apply instantly

## Troubleshooting

| Problem | Solution |
|---------|----------|
| "Node.js not found" | Install Node.js from https://nodejs.org/ |
| Port 8000/5173 in use | Restart or use: `npm run dev -- --port 5174` |
| Frontend blank | Check http://localhost:8000/health - if red, backend not running |
| Module not found errors | Ensure venv is activated: `venv\Scripts\activate` |

## Optional: Test Backend Directly

```powershell
curl http://localhost:8000/health
```

Should return:
```json
{"status": "healthy", "service": "Grito Labs Marketing Analytics API"}
```

## Optional: Load PostgreSQL (Production)

```powershell
psql -U postgres -d grito_labs < backend\seed_data.sql
```

---

**✅ All Done!** You now have a fully functional marketing analytics platform running locally.

For advanced setup, see [README.md](README.md)
