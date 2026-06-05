#!/bin/bash
# ============================================================================
# Grito Labs: Quick Start Script
# One-command setup for complete development environment
# ============================================================================

set -e

echo "🚀 Grito Labs Marketing Analytics - Quick Start"
echo "============================================================================"

# ─── Check Prerequisites ─────────────────────────────────────────────────────
echo ""
echo "✓ Checking prerequisites..."

if ! command -v python &> /dev/null; then
    echo "❌ Python not found. Please install Python 3.9+"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Please install Node.js 18+"
    exit 1
fi

echo "  ✓ Python: $(python --version)"
echo "  ✓ Node.js: $(node --version)"
echo "  ✓ npm: $(npm --version)"

# ─── Setup Backend ──────────────────────────────────────────────────────────
echo ""
echo "✓ Setting up backend..."

if [ ! -d "venv" ]; then
    python -m venv venv
    echo "  ✓ Virtual environment created"
fi

source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
echo "  ✓ Virtual environment activated"

pip install -q -r backend/requirements.txt
echo "  ✓ Dependencies installed"

python backend/seed_data.py
echo "  ✓ Mock data generated (mock_data.json, seed_data.sql)"

# ─── Setup Frontend ─────────────────────────────────────────────────────────
echo ""
echo "✓ Setting up frontend..."

cd frontend
npm install --quiet
echo "  ✓ npm dependencies installed"
cd ..

# ─── Display Next Steps ─────────────────────────────────────────────────────
echo ""
echo "============================================================================"
echo "✅ Setup complete! Run the following in separate terminals:"
echo ""
echo "   Terminal 1 (Backend API):"
echo "   $ python backend/main.py"
echo "   📡 Available at: http://localhost:8000"
echo "   📖 Docs at: http://localhost:8000/docs"
echo ""
echo "   Terminal 2 (Frontend):"
echo "   $ cd frontend && npm run dev"
echo "   🎨 Available at: http://localhost:5173"
echo ""
echo "   Terminal 3 (Optional: Load mock data to PostgreSQL):"
echo "   $ psql -U postgres -d grito_labs < backend/seed_data.sql"
echo ""
echo "============================================================================"
echo ""
echo "📚 Documentation: See README.md for complete setup guide"
echo "🆘 Troubleshooting: See README.md#troubleshooting section"
echo ""
