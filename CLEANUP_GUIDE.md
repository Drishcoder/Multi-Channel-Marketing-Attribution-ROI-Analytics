# Files to Clean Up (Optional)

These files are duplicates or generated outputs that can be safely deleted to reduce project size:

## Safe to Delete (No longer used)
- `GritoLabs_MarketingAnalytics.jsx` - Duplicate dashboard component
- `quickstart.sh` - Bash version (project is Windows-focused)
- `mock_data.json` - Auto-generated (regenerate with: `python backend/seed_data.py`)
- `seed_data.sql` - Auto-generated (regenerate with: `python backend/seed_data.py`)
- `DELIVERABLES.md` - Info consolidated into README.md

## Consolidation Done
- **Frontend**: 3 duplicate dashboard components → 1 consolidated in `frontend/src/components/`
- **Setup**: Proper Vite configuration added for modern React development

## New Frontend Structure
```
frontend/
├── index.html              (NEW - Entry point)
├── vite.config.js          (NEW - Build config)
├── package.json            (Existing)
├── src/
│   ├── main.jsx            (NEW - React entry)
│   ├── App.jsx             (NEW - Root component)
│   └── components/
│       └── MarketingAnalyticsDashboard.jsx  (Dashboard with all features)
├── node_modules/           (Created by npm install)
└── dist/                   (Created by npm run build)
```

## Size Reduction
- Removed: ~500 lines of duplicate code
- Removed: ~5 redundant files
- Added: ~100 lines of proper Vite setup
- **Net result**: Cleaner structure, same functionality, better build infrastructure

## Keep or Remove Virtual Environments
- Only one needed: Either `venv/` OR `.venv/`
- Delete the other to save space
- Delete `node_modules/` when done (recreate with `npm install`)

## To Apply Cleanup
```powershell
# Option 1: Selective cleanup
del GritoLabs_MarketingAnalytics.jsx
del quickstart.sh
del DELIVERABLES.md

# Option 2: Clean all generated files (will regenerate on next run)
del mock_data.json
del seed_data.sql
python backend/seed_data.py

# Option 3: Remove duplicate virtual env (keep only one)
del venv -r -force   # OR: del .venv -r -force
```

**Recommendation**: Clean up before committing to version control (Git).
