# P0 Blocker Fixes - Implementation Guide

**Priority:** 🔴 **CRITICAL - Implement These First**

This document provides step-by-step implementation guides for the top 3 P0 blockers preventing publishing from working.

---

## Fix #1: Wikidata Authentication Enhancement

### Problem
- `Login failed: Failed` errors
- No credential validation
- No retry logic for transient failures

### Solution
Enhanced authentication with:
1. Credential validation on startup
2. Retry logic with exponential backoff
3. Better error messages
4. Graceful fallback for test mode

### Implementation Steps

1. **Add credential validation** to `lib/wikidata/client.ts`:
   - Validate environment variables exist
   - Validate format (username should include @)
   - Provide helpful error messages

2. **Enhance login method** with retry logic:
   - Retry up to 3 times with exponential backoff
   - Better error messages for different failure types
   - Clear distinction between credential errors vs network errors

3. **Add test mode detection**:
   - Check for mock mode before attempting real authentication
   - Skip authentication in test environments

### Files to Modify
- `lib/wikidata/client.ts` - Enhance `login()` and `authenticate()` methods

---

## Fix #2: Database Cache Constraint

### Problem
- `ON CONFLICT specification` error
- QID cache saves fail silently
- Entity building incomplete

### Solution
1. Verify migration exists
2. Add constraint check on startup
3. Better error handling in `setCachedQID`

### Implementation Steps

1. **Verify migration exists**:
   ```sql
   -- Check if constraint exists
   SELECT constraint_name 
   FROM information_schema.table_constraints 
   WHERE table_name = 'qid_cache' 
     AND constraint_type = 'UNIQUE';
   ```

2. **Create migration if missing**:
   ```sql
   -- migrations/XXXX_fix_qid_cache_constraint.sql
   ALTER TABLE qid_cache 
   ADD CONSTRAINT qid_cache_entity_type_search_key_unique 
   UNIQUE (entity_type, search_key);
   ```

3. **Add constraint validation** in `lib/wikidata/sparql.ts`:
   - Check constraint exists on service initialization
   - Provide helpful error if missing
   - Fallback to insert-only (no update) if constraint missing

4. **Improve error handling**:
   - Catch constraint errors specifically
   - Log helpful message
   - Don't fail entire operation

### Files to Modify
- `lib/wikidata/sparql.ts` - Enhance `setCachedQID()` method
- Create migration if needed

---

## Fix #3: Entity Conflict Handling

### Problem
- `Item already has label` errors
- Publishing fails for businesses with existing Wikidata entities
- No detection of existing entities

### Solution
1. Check for existing entity before creating
2. Use `updateEntity()` instead of `createEntity()` for existing entities
3. Only add new properties, don't try to set existing labels

### Implementation Steps

1. **Add existing entity detection** in `lib/wikidata/client.ts`:
   ```typescript
   async findExistingEntity(label: string, description: string): Promise<string | null> {
     // Search Wikidata for existing entity
     // Return QID if found, null otherwise
   }
   ```

2. **Modify publishEntity** to check first:
   ```typescript
   async publishEntity(entity, options) {
     // Step 1: Check if entity exists
     const existingQid = await this.findExistingEntity(entity.label, entity.description);
     
     if (existingQid) {
       // Update instead of create
       return await this.updateEntity(existingQid, entity, options);
     }
     
     // Step 2: Create new entity
     return await this.createNewEntity(entity, options);
   }
   ```

3. **Enhance updateEntity** to handle conflicts:
   - Only add new properties
   - Skip existing labels/descriptions
   - Merge claims intelligently

### Files to Modify
- `lib/wikidata/client.ts` - Add `findExistingEntity()` and modify `publishEntity()`
- `lib/wikidata/service.ts` - Update to use new conflict handling

---

## Testing Each Fix

### Test Fix #1 (Authentication)
```bash
# Test with missing credentials
unset WIKIDATA_BOT_USERNAME
unset WIKIDATA_BOT_PASSWORD
npx playwright test tests/e2e/publishing-flow-critical.spec.ts

# Should show helpful error message, not crash
```

### Test Fix #2 (Database Constraint)
```bash
# Run migration
pnpm drizzle-kit push

# Test QID cache
# Should not show "ON CONFLICT" errors
```

### Test Fix #3 (Entity Conflicts)
```bash
# Test with business that has existing Wikidata entity
# Should update instead of failing
npx playwright test tests/e2e/publishing-flow-critical.spec.ts
```

---

## Implementation Order

1. **Fix #2** (Database) - Quickest, unblocks other fixes
2. **Fix #1** (Authentication) - Critical for real publishing
3. **Fix #3** (Conflicts) - Improves reliability

---

## Success Criteria

✅ **Fix #1**: Authentication works with valid credentials, fails gracefully with invalid  
✅ **Fix #2**: QID cache saves work without constraint errors  
✅ **Fix #3**: Existing entities are updated instead of causing conflicts

---

## Next Steps After Fixes

1. Run full E2E test suite
2. Verify all P0 blockers resolved
3. Move to P1 fixes (data quality issues)

