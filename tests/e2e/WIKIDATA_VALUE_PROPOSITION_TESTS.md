# Wikidata Value Proposition E2E Tests

## 🎯 Purpose

Test the **complete UX flow** for rich Wikidata entity publication and engaging display, ensuring users receive significant value from:

1. **Rich Entity Publication**: Structured entities with multiple claims, references, and qualifiers
2. **LLM Visibility**: Properties suggested by LLM, quality metrics, and completeness scores
3. **Engaging Display**: Clear visualization of entity richness and structure
4. **Value Demonstration**: Users can see their entities are well-structured and ready for LLM consumption

---

## 📊 Test Philosophy

Based on terminal logging analysis:

**Rich Entity Structure:**
- Multiple claims (P31, P856, P1448, P452, P1454, P159, etc.)
- Each claim has references (P854: URL, P813: retrieved date)
- LLM-suggested additional properties
- Quality scores and completeness metrics
- QID resolution for cities, legal forms, industries

**Value Proposition:**
- Users publish structured, reference-rich entities
- Entities are immediately discoverable by LLMs via Wikidata
- Rich JSON structure demonstrates data quality
- Clear metrics show entity completeness

---

## 🧪 Test Suite

### Test 1: Rich Entity Publication to Test Wikidata

**Objective:** Verify complete publication flow with rich entity structure

**Steps:**
1. Authenticate as Pro user
2. Create business with complete data:
   - Business name, URL, location (city, coordinates)
   - Phone, email, address
   - Social media links
   - Business details (employee count, stock symbol if applicable)
3. Run crawl (collects additional data)
4. Run fingerprint (generates LLM suggestions)
5. Verify entity preview shows:
   - Multiple properties (10+ claims expected)
   - Reference quality badge
   - Notability score
   - LLM suggestions count
6. Publish to test.wikidata.org (`publishToProduction: false`)
7. Verify publication success:
   - QID returned
   - Entity URL: `https://test.wikidata.org/wiki/{QID}`
   - Status updated to 'published'

**Assertions:**
- ✅ Entity has 10+ claims
- ✅ Claims include references (P854, P813)
- ✅ QID is valid format (Q followed by digits)
- ✅ Entity URL is correct
- ✅ Publication completed in reasonable time (< 90s)

**Value Demonstrated:**
- Rich, structured entity published
- Multiple properties ensure entity is discoverable
- References provide credibility

---

### Test 2: Entity Display - Richness Visualization

**Objective:** Verify engaging display of published entity data

**Steps:**
1. Navigate to published business detail page
2. Verify EntityPreviewCard displays:
   - QID prominently displayed
   - Entity label and description
   - Stats section:
     - Total claims count
     - Claims with references count
     - Reference quality badge (high/medium/low)
   - Notability badge
3. Verify action buttons:
   - "View on Wikidata" button (links to test.wikidata.org)
   - "Preview JSON" button

**Assertions:**
- ✅ Stats are visible and accurate
- ✅ Reference quality is calculated correctly
- ✅ QID is clickable/linked
- ✅ All claims are accounted for in stats

**Value Demonstrated:**
- Users can immediately see entity richness
- Metrics communicate data quality
- Clear visual feedback on entity completeness

---

### Test 3: Preview JSON - Rich Structure Display

**Objective:** Verify users can view the complete rich JSON structure

**Steps:**
1. Navigate to published business detail page
2. Click "Preview JSON" button
3. Verify JSON modal/dialog displays:
   - Complete entity structure
   - All claims with PIDs
   - References for each claim
   - LLM suggestions section
   - Quality metrics (qualityScore, completeness)
4. Verify JSON is formatted and readable
5. Verify key elements visible:
   - Labels (multiple languages if available)
   - Descriptions
   - Claims object with all properties
   - References with P854 (URL) and P813 (retrieved date)
   - LLM suggestions array

**Assertions:**
- ✅ JSON modal opens
- ✅ Complete entity structure is visible
- ✅ All claims are present
- ✅ References are included for claims
- ✅ LLM suggestions are shown
- ✅ JSON is properly formatted

**Value Demonstrated:**
- Users can inspect complete entity structure
- Transparency about what's being published
- Richness of data is visible
- LLM suggestions show platform intelligence

---

### Test 4: Published Entity Verification on Test Wikidata

**Objective:** Verify published entity exists and is structured correctly on test.wikidata.org

**Steps:**
1. Publish entity to test.wikidata.org (from Test 1)
2. Extract QID from publication response
3. Navigate to `https://test.wikidata.org/wiki/{QID}` (or click "View on Wikidata")
4. Verify entity page displays:
   - Label matches business name
   - Description is present
   - Multiple statements visible
   - References are present
5. Verify key properties:
   - P31: instance of (business)
   - P856: official website
   - P625: coordinate location (if available)
   - P159: headquarters location (if city resolved)
   - Additional properties from LLM suggestions

**Assertions:**
- ✅ Entity exists on test.wikidata.org
- ✅ Label matches expected value
- ✅ At least 5+ statements are present
- ✅ References are attached to statements
- ✅ Key properties are correct

**Value Demonstrated:**
- Entity is live and discoverable
- Structure is correct and complete
- Ready for LLM consumption

---

### Test 5: Entity Richness Metrics Display

**Objective:** Verify metrics accurately reflect entity richness

**Steps:**
1. Create business with varying data completeness:
   - Test A: Minimal data (name, URL only)
   - Test B: Complete data (all fields filled)
2. Run crawl and fingerprint for both
3. Verify metrics display correctly:
   - Total claims count matches actual claims
   - Claims with references count is accurate
   - Reference quality badge reflects actual quality
   - Completeness score visible in JSON preview
4. Compare metrics between Test A and Test B:
   - Test B should show higher claims count
   - Test B should show higher reference quality

**Assertions:**
- ✅ Metrics are accurate
- ✅ Claims count matches entity structure
- ✅ Reference quality calculation is correct
- ✅ Completeness reflects data richness

**Value Demonstrated:**
- Metrics communicate value clearly
- Users understand entity quality
- Encourages complete data entry

---

### Test 6: LLM Visibility - Property Suggestions Display

**Objective:** Verify LLM suggestions are visible and demonstrate platform intelligence

**Steps:**
1. Create business with descriptive website content
2. Run fingerprint (triggers LLM property suggestions)
3. Verify entity preview shows:
   - LLM suggestions count
   - Suggested properties visible (in JSON preview)
4. Verify LLM suggestions in JSON:
   - Property PIDs listed
   - Suggested values
   - Confidence scores
   - Reasoning for suggestions
5. Publish entity
6. Verify suggested properties are included in published entity

**Assertions:**
- ✅ LLM suggestions are generated
- ✅ Suggestions are visible in UI
- ✅ Confidence scores are displayed
- ✅ Reasoning is provided
- ✅ Suggested properties are published

**Value Demonstrated:**
- Platform intelligence adds value
- LLM discovers relevant properties
- Users see AI-powered enhancements

---

### Test 7: Post-Publication Engagement Flow

**Objective:** Verify users can engage with published entity after publication

**Steps:**
1. Publish entity to test.wikidata.org
2. Verify post-publication state:
   - "Publish to Wikidata" button → "View on Wikidata" button
   - QID prominently displayed
   - Entity stats updated
   - Publication timestamp visible
3. Click "View on Wikidata" button
4. Verify new tab opens to test.wikidata.org entity page
5. Return to platform and verify:
   - QID persists in UI
   - Stats remain visible
   - JSON preview still accessible

**Assertions:**
- ✅ Button state changes correctly
- ✅ "View on Wikidata" opens correct URL
- ✅ Entity data persists after publication
- ✅ User can continue engaging with entity

**Value Demonstrated:**
- Clear post-publication flow
- Easy access to published entity
- Platform maintains entity context

---

### Test 8: Value Perception - Complete Rich Entity Journey

**Objective:** End-to-end test demonstrating complete value proposition

**Steps:**
1. Start as Free user
2. Upgrade to Pro tier
3. Create business with complete data
4. Run crawl → verify data collected
5. Run fingerprint → verify LLM suggestions
6. View entity preview:
   - Verify richness metrics
   - Verify property count (10+)
   - Verify reference quality
7. Preview JSON → verify complete structure
8. Publish to test.wikidata.org
9. Verify publication success with QID
10. Click "View on Wikidata" → verify entity on test.wikidata.org
11. Return to platform → verify entity displayed with QID
12. Verify all claims are visible in JSON preview
13. Verify metrics show high completeness

**Assertions:**
- ✅ Complete journey works end-to-end
- ✅ Rich entity structure throughout
- ✅ Value is clear at each step
- ✅ Publication successful
- ✅ Entity verifiable on test.wikidata.org

**Value Demonstrated:**
- Complete value chain from data → publication
- Rich entity structure at every step
- Clear value proposition throughout
- Users understand what they're getting

---

## 📋 Implementation Strategy

### File Structure
```
tests/e2e/
├── wikidata-value-proposition.spec.ts  # Main test suite
├── pages/
│   └── entity-display-page.ts          # Page object for entity display
└── helpers/
    └── wikidata-entity-helpers.ts      # Helper functions for entity verification
```

### Key Helpers Needed

**Entity Verification:**
- `verifyEntityRichness(entity, minClaims)` - Verify entity has minimum claims
- `verifyReferencesPresent(claims)` - Verify references on claims
- `verifyLLMSuggestions(entity)` - Verify LLM suggestions present
- `verifyEntityOnWikidata(qid, expectedProperties)` - Verify entity on test.wikidata.org

**Display Verification:**
- `verifyEntityStatsDisplay(page, expectedStats)` - Verify stats shown correctly
- `verifyJSONPreview(page, expectedStructure)` - Verify JSON preview content
- `verifyQIDDisplay(page, expectedQID)` - Verify QID shown correctly

---

## 🎯 Success Criteria

**For Each Test:**
1. ✅ Publication succeeds to test.wikidata.org
2. ✅ Entity structure is rich (10+ claims)
3. ✅ References are present
4. ✅ Metrics are accurate
5. ✅ UI displays data engagingly
6. ✅ Value is clear to user

**Overall:**
- Users can see entity richness
- Users understand value proposition
- Publication process is smooth
- Post-publication engagement works
- Entity is verifiable on test.wikidata.org

---

## 🚀 Running Tests

```bash
# Run all value proposition tests
pnpm test:e2e wikidata-value-proposition

# Run specific test
pnpm test:e2e wikidata-value-proposition --grep "Rich Entity Publication"

# Run with UI mode for visual verification
pnpm test:e2e wikidata-value-proposition --ui
```

---

## 📊 Expected Results

**Rich Entity Example (from terminal logs):**
- Claims: P31, P856, P1448, P452, P1454, P159 (6+ visible)
- References: P854 (URL) + P813 (retrieved date) per claim
- LLM Suggestions: 3 properties suggested
- Quality Score: 57
- Completeness: 23%

**Test Should Verify:**
- ✅ All 6+ claims are present and correct
- ✅ References are attached to claims
- ✅ LLM suggestions are included
- ✅ Metrics reflect actual entity structure
- ✅ Entity is publishable and verifiable

---

## 🔄 Continuous Improvement

**Monitor:**
- Entity richness trends (average claims per entity)
- Publication success rate
- User engagement with JSON preview
- Time to publication

**Enhance:**
- Add more engaging visualizations
- Show entity comparison (before/after)
- Highlight LLM-suggested properties
- Show entity discoverability metrics

