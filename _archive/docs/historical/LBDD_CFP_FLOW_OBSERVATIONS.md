# LBDD CFP Flow Observations - January 2025

## 🔍 **Flow Test Summary**

### Test Scenario
- **Account**: Pro tier (test@test.com)
- **Business ID**: 1 (Error status)
- **URL**: https://brownphysicians.org
- **Action**: Manual CFP trigger via "Run CFP" button

---

## 📊 **API Routing Observed**

### Initial State
- Business ID 1: Status = "Error"
- No fingerprint data
- No crawl data visible

### API Calls Observed
```
GET /api/business/1 - Fetching business data
GET /api/fingerprint/business/1 - Fetching fingerprint (none found)
GET /api/team - Team data
```

### After Manual CFP Trigger
```
POST /api/business/1/process - Manual CFP trigger
```

---

## 🐛 **Issues Identified**

### Issue 1: No Auto-Processing Logs for New Businesses ❌
**Observation**: 
- Business ID 6 was created with status "Pending"
- No `autoStartProcessing` logs found in terminal
- Status remains "Pending" with "0% Complete"

**Expected Behavior**:
- New businesses should automatically trigger `autoStartProcessing`
- Status should transition: pending → crawling → crawled

**Root Cause Analysis Needed**:
- Check if `autoStartProcessing` is being called for new businesses
- Verify Pro tier automation settings
- Check if there are any errors preventing processing

---

### Issue 2: Database Cache Error ⚠️
**Observation**:
```
Database cache save error: [Error [PostgresError]: 
there is no unique or exclusion constraint matching the ON CONFLICT specification]
```

**Location**: `/api/wikidata/entity/6` endpoint

**Impact**: 
- Entity caching may not work properly
- Non-fatal but should be fixed

**Fix Needed**:
- Check entity cache table schema
- Add proper unique constraint or fix ON CONFLICT clause

---

### Issue 3: Pending Business Not Processing ❌
**Observation**:
- Business ID 6 created with POST /api/business
- Status: "Pending"
- No processing initiated automatically
- UI shows "0% Complete"

**Expected**:
- Pro tier businesses should auto-process
- Status should update to "crawling" immediately

**Investigation Needed**:
1. Check if `autoStartProcessing` is called after business creation
2. Verify Pro tier automation configuration
3. Check for any silent errors in processing

---

## ✅ **Fixes Already Applied**

1. ✅ **Duplicate URL Retry Logic** - Code in place
2. ✅ **Error Status Recovery** - Code in place  
3. ✅ **UI Polling for Error Status** - Code in place

---

## 🔍 **Next Steps for Investigation**

### 1. Verify Auto-Processing for New Businesses
- Check `app/api/business/route.ts` for `autoStartProcessing` call
- Verify it's called for Pro tier accounts
- Check logs for any errors

### 2. Test Duplicate URL Retry
- Create business with duplicate URL (error state)
- Verify `autoStartProcessing` is triggered
- Check logs for "Duplicate URL found with processable status"

### 3. Fix Database Cache Error
- Locate entity cache table
- Add proper unique constraint
- Fix ON CONFLICT clause

### 4. Monitor Manual CFP Trigger
- Click "Run CFP" on error business
- Monitor logs for processing activity
- Verify status updates

---

## 📝 **Log Analysis**

### Key Observations from Logs:
1. ✅ Business creation works (POST /api/business 200)
2. ✅ Business detail page loads (GET /api/business/[id] 200)
3. ✅ Fingerprint API works (GET /api/fingerprint/business/[id] 200)
4. ❌ No `autoStartProcessing` logs found
5. ❌ No processing status updates observed
6. ⚠️ Database cache error for entity endpoint

---

## 🎯 **Priority Fixes**

1. **HIGH**: Fix auto-processing for new Pro tier businesses
2. **MEDIUM**: Fix database cache error for entity endpoint
3. **LOW**: Verify duplicate URL retry works (code is in place)

---

**Status**: 🔍 **INVESTIGATION IN PROGRESS**


