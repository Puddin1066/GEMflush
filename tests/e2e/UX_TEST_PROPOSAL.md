# UX Test Coverage Proposal

## Current Coverage Analysis

### ✅ What's Covered
- Subscription upgrades and checkout flows
- Wikidata publishing workflows
- Basic form validation
- Authentication flows
- Complete user journeys (create → crawl → fingerprint → publish)

### ❌ Critical UX Gaps

**Missing End-to-End Journey Test:**
- No single test covering complete flow: Free tier → Upgrade to Pro → Access Publishing → Execute Publishing
- Existing tests are fragmented:
  - Upgrade tests stop at "can initiate upgrade"
  - Publishing tests assume Pro tier already exists
  - Complete workflow test assumes Pro tier from start
- **Gap**: Users should be able to upgrade from free tier to pro tier and then publish an entity to Wikidata in one seamless journey

## Proposed Additional E2E Tests

### 0. Complete Subscription to Publishing Journey (`subscription-to-publishing-journey.spec.ts`) ✅ Created
**Purpose**: Test the complete user journey from upgrade to publishing execution

**Tests**:
- Free user upgrades to Pro tier and then publishes entity to Wikidata
- Verifies upgrade unlocks publishing feature immediately
- Verifies published entity is displayed after successful publish
- Confirms free users see upgrade prompt (cannot publish before upgrade)

**Why**: This is the **core value proposition** - users upgrade to unlock publishing. This complete journey must work seamlessly.

### 1. Error States & Recovery (`ux-error-states.spec.ts`) ✅ Created
**Purpose**: Catch UX problems when things go wrong

**Tests**:
- Empty states (new users, no data)
- Network error handling
- API error responses (403, 404, 500)
- Loading state transitions
- Form submission error recovery

**Why**: Users encounter errors frequently. Poor error handling = poor UX.

### 2. Navigation & Flow Continuity (`ux-navigation-flows.spec.ts`) ✅ Created
**Purpose**: Ensure users can navigate smoothly

**Tests**:
- Breadcrumb navigation
- Deep linking (direct URL access)
- Sidebar navigation
- Back button behavior
- Context preservation between pages

**Why**: Broken navigation = lost users. Users rely on predictable navigation.

### 3. Accessibility (`ux-accessibility.spec.ts`) ✅ Created
**Purpose**: Ensure app is usable by all users

**Tests**:
- Keyboard navigation
- ARIA attributes
- Focus management
- Screen reader support

**Why**: Accessibility issues = exclusion. Also helps catch UX problems for all users.

### 4. Loading States & Transitions (Partially Covered)
**Purpose**: Ensure smooth loading experiences

**Tests**:
- Skeleton loaders appear correctly
- Loading states don't cause layout shift
- Transitions between states are smooth
- Progress indicators work

**Why**: Poor loading states = perceived slowness = user frustration.

### 5. Mobile/Responsive Behavior (Consider Adding)
**Purpose**: Ensure mobile users have good experience

**Tests**:
- Mobile navigation works
- Forms are usable on mobile
- Touch targets are appropriate size
- Layout doesn't break on small screens

**Why**: Many users access on mobile. Broken mobile = lost users.

## Test Strategy: DRY & SOLID

### DRY Principles
- ✅ Reuse fixtures (`authenticated-user.ts`, `team-fixtures.ts`)
- ✅ Reuse page objects (`BusinessPage`, `PricingPage`)
- ✅ Reuse helpers (`selectors.ts`, `stripe-helpers.ts`)
- ✅ Centralize common assertions

### SOLID Principles
- ✅ Single Responsibility: Each test file focuses on one UX area
- ✅ Open/Closed: Tests extensible via fixtures
- ✅ Dependency Inversion: Tests depend on abstractions (page objects)

### Don't Overfit
- ✅ Test user journeys, not implementation details
- ✅ Flexible assertions (`.or()` for multiple valid states)
- ✅ Focus on behavior, not exact text/classes
- ✅ Test critical paths, not every edge case

## Priority Recommendations

### High Priority (Add Now)
1. **Complete Subscription to Publishing Journey** - Core value proposition (free → upgrade → publish) ✅ Created
2. **Error States** - Users encounter errors frequently ✅ Created
3. **Navigation Flows** - Core user experience ✅ Created
4. **Loading States** - Affects perceived performance

### Medium Priority (Add Soon)
4. **Accessibility** - Important for compliance and usability
5. **Empty States** - First impression matters

### Low Priority (Consider Later)
6. **Mobile/Responsive** - If mobile traffic is significant
7. **Visual Regression** - If design consistency is critical

## Implementation Status

- ✅ `subscription-to-publishing-journey.spec.ts` - Created (Complete journey: Free → Upgrade → Publish)
- ✅ `ux-error-states.spec.ts` - Created
- ✅ `ux-navigation-flows.spec.ts` - Created  
- ✅ `ux-accessibility.spec.ts` - Created
- ⏳ Loading states - Partially covered in existing tests
- ⏳ Mobile/responsive - Not yet implemented

## Running New Tests

```bash
# Run all UX tests
pnpm test:e2e subscription-to-publishing-journey ux-error-states ux-navigation-flows ux-accessibility

# Run complete journey test (high priority)
pnpm test:e2e subscription-to-publishing-journey

# Run specific test suite
pnpm test:e2e ux-error-states

# Run with UI (see browser)
pnpm test:e2e subscription-to-publishing-journey --headed
```

## Expected Benefits

1. **Catch UX Problems Early**: Tests will fail when UX breaks
2. **Prevent Regressions**: Ensure UX improvements don't break
3. **Document Expected Behavior**: Tests serve as UX documentation
4. **Improve Confidence**: Know that critical UX flows work

## Maintenance

- Keep tests focused on user journeys
- Update tests when UX changes (not implementation)
- Remove tests that no longer reflect user needs
- Add tests for new UX patterns as they emerge


