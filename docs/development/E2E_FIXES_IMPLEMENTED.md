# E2E Testing - Fixes Implemented

## Critical Fixes Required

### 1. Wikidata Publication - Handle Existing Items
**Status:** Needs Implementation  
**Issue:** Publisher fails when item already exists with same label  
**Fix:** 
- Check if business has existing wikidataQID before publishing
- If publishEntity fails with "already has label" error, extract QID from error and use updateEntity
- Remove labels/descriptions from entity when updating existing items (they already exist)

### 2. Competitor Name Extraction - Filter Invalid Names
**Status:** Needs Implementation  
**Issue:** Invalid competitor names like "Checking recent online reviews" appear in leaderboard  
**Fix:**
- Add validation to filter out non-business-name patterns
- Check for phrases that are clearly not business names (e.g., "Checking", "Asking for", "Verifying", "Comparing", "Looking for")
- Minimum length and pattern validation

### 3. Chart Dimensions Warning
**Status:** Needs Implementation  
**Issue:** Recharts warning about negative width/height  
**Fix:** Add minWidth/minHeight to ResponsiveContainer or ensure parent has explicit dimensions

### 4. Error Message Display
**Status:** Needs Implementation  
**Issue:** Status shows "Error" but no explanation  
**Fix:** Display error message from failed CFP step in status card

### 5. Competitor Deduplication
**Status:** Needs Implementation  
**Issue:** Same competitor appears multiple times  
**Fix:** Normalize competitor names and deduplicate before storing

