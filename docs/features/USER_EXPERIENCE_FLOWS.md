# User Experience Flows

This document describes the complete user experience flows as validated by passing E2E tests. It covers all major user journeys from onboarding through advanced features.

## Table of Contents

1. [New User Onboarding](#new-user-onboarding)
2. [Business Management](#business-management)
3. [Visibility Analysis Workflow](#visibility-analysis-workflow)
4. [Wikidata Publishing Workflow](#wikidata-publishing-workflow)
5. [Subscription & Tier Management](#subscription--tier-management)
6. [Error Handling & Recovery](#error-handling--recovery)
7. [Loading States & Feedback](#loading-states--feedback)
8. [Navigation & Flow Continuity](#navigation--flow-continuity)

---

## New User Onboarding

### Sign Up Flow

**User Journey:**
1. User navigates to sign-up page
2. User creates account (email/password)
3. User is automatically signed in
4. User is redirected to dashboard

**UX Details:**
- Dashboard displays welcome message for new users
- Empty state shown if no businesses exist
- Clear call-to-action to add first business

### Frictionless Onboarding (URL-Only Submission)

**User Journey:**
1. New user navigates to business creation
2. User sees simplified form with only URL field
3. User enters website URL
4. System automatically:
   - Crawls website to extract business data
   - Creates business with extracted information
   - Auto-starts crawl and fingerprint in parallel
   - (Pro tier) Auto-publishes to Wikidata if notability requirements met

**UX Details:**
- Form shows helpful text: "Enter your website URL" and "We'll automatically extract..."
- Minimal friction - only URL required
- Backend handles all data extraction
- User sees progress as system processes automatically
- Business detail page loads with extracted data

**Time to Value:**
- URL submission → Business created: ~30 seconds
- Auto-crawl completion: ~2 minutes
- Auto-fingerprint completion: ~3 minutes
- Auto-publish (Pro tier): ~3-5 minutes

---

## Business Management

### Business Creation (Full Form)

**User Journey:**
1. User navigates to "Add Business" from dashboard
2. User fills form with:
   - Business name
   - Website URL
   - Category
   - Location (city, state, country)
3. User submits form
4. Form shows loading state (button disabled, loading text)
5. Success redirect to business detail page
6. Business name displayed on detail page

**UX Details:**
- Real-time form validation
- Clear error messages for invalid inputs
- Loading state prevents double-submission
- Success feedback via redirect
- Business immediately accessible

### Business List View

**User Journey:**
1. User navigates to businesses list
2. List displays all user's businesses
3. User can click business to view details
4. Empty state shown if no businesses exist

**UX Details:**
- Loading skeleton while data fetches
- Business cards show key information
- Clear navigation to detail view
- Empty state with helpful guidance

### Business Detail Page

**User Journey:**
1. User navigates to business detail page
2. Page loads business data
3. User sees:
   - Business overview card (gem-themed)
   - Business status (pending, crawling, crawled, published)
   - Action buttons (Crawl, Fingerprint, Publish)
   - Results cards (when available)

**UX Details:**
- Business name prominently displayed
- Status clearly indicated
- Action buttons contextually enabled/disabled
- "Back to Businesses" button for navigation
- Gem-themed card design for visual consistency

---

## Visibility Analysis Workflow

### Crawl Workflow

**User Journey:**
1. User views business detail page
2. User clicks "Crawl" button
3. Button shows loading state
4. System crawls website in background
5. Business status updates: pending → crawling → crawled
6. Crawl data stored and displayed

**UX Details:**
- Button disabled during crawl
- Loading indicator visible
- Status updates automatically
- Crawl cache prevents duplicate crawls (24h TTL)
- Results available immediately after completion

**Time to Completion:**
- Typical crawl: 1-2 minutes
- Cached crawl: Instant (if within 24h)

### Fingerprint Workflow

**User Journey:**
1. User views business detail page (after crawl)
2. User clicks "Analyze" or "Fingerprint" button
3. Button shows loading state
4. System runs LLM-based visibility analysis
5. Fingerprint results displayed:
   - Visibility score (0-100%)
   - Mention rate
   - Sentiment score
   - Model breakdown

**UX Details:**
- Button disabled during analysis
- Loading indicator visible
- Results displayed in "Visibility Intel" card
- Fingerprint idempotency (10min cache)
- Visual score display with percentage

**Time to Completion:**
- Typical fingerprint: 2-3 minutes
- Cached fingerprint: Instant (if within 10min)

### Visibility Score Display

**User Journey:**
1. User views business detail page
2. Visibility Intel card displays:
   - Overall visibility score
   - Breakdown by AI model
   - Mention rate and sentiment
   - Recommendations

**UX Details:**
- Score displayed prominently (0-100%)
- Color-coded for quick understanding
- Detailed breakdown available
- Actionable insights provided
- Gem-themed card design

---

## Wikidata Publishing Workflow

### Entity Assembly (Pro Tier)

**User Journey:**
1. Pro user views business detail page (after crawl)
2. System automatically assembles Wikidata entity
3. Entity preview card appears showing:
   - Draft entity structure
   - Property count (claims)
   - Reference count
   - Notability status
   - Rich entity data

**UX Details:**
- Entity card appears automatically after crawl
- Shows comprehensive entity structure
- Notability badge indicates publish readiness
- JSON preview available for technical users
- Stats displayed (properties, references)

### Publishing to Wikidata (Pro Tier)

**User Journey:**
1. Pro user views entity preview card
2. User clicks "Publish to Wikidata" button
3. Button shows loading state
4. System publishes entity to Wikidata
5. Success feedback:
   - QID assigned (e.g., Q12345)
   - "View on Wikidata" button appears
   - Business status updates to "published"
   - QID displayed in UI

**UX Details:**
- Button enabled only if entity is notable
- Loading state during publish
- Success dialog/alert on completion
- QID prominently displayed
- Link to view entity on Wikidata
- Business status persists across reloads

**Time to Completion:**
- Typical publish: 2-3 minutes
- Includes notability check, entity validation, and Wikidata API submission

### Post-Publication Experience

**User Journey:**
1. User views published business
2. User sees:
   - QID displayed (e.g., Q12345)
   - "View on Wikidata" button (replaces publish button)
   - Published timestamp
   - Entity data persists

**UX Details:**
- QID accessible via link or text
- Direct link to Wikidata entity page
- Published status clearly indicated
- Entity data remains accessible
- Can view entity JSON preview

---

## Subscription & Tier Management

### Free Tier Experience

**User Journey:**
1. Free user signs up
2. User sees free tier badge/indicator
3. User can:
   - Create 1 business
   - Run crawl
   - Run fingerprint
   - View visibility scores
4. User sees upgrade CTAs:
   - On dashboard
   - When attempting to publish
   - In business detail pages

**UX Details:**
- Business limit clearly displayed (1/1)
- Upgrade prompts are informative
- Value proposition messaging visible
- Publishing features gated with upgrade prompts
- Free tier benefits clearly communicated

### Subscription Upgrade Flow

**User Journey:**
1. Free user clicks upgrade CTA
2. User navigates to pricing page
3. User sees:
   - Current plan badge (Free)
   - Pro plan pricing
   - Upgrade button
4. User clicks "Upgrade to Pro"
5. User redirected to Stripe checkout
6. After payment:
   - User returns to dashboard
   - Pro tier features immediately available
   - Publishing unlocked

**UX Details:**
- Pricing page shows all tiers
- Current plan clearly indicated
- Upgrade button enabled/disabled based on price availability
- Smooth checkout flow
- Immediate feature unlock after payment

### Pro Tier Experience

**User Journey:**
1. Pro user signs up or upgrades
2. User sees Pro tier badge/indicator
3. User can:
   - Create up to 5 businesses
   - Run crawl and fingerprint
   - Publish to Wikidata
   - Access automation features
4. User sees:
   - Manage subscription option
   - Publishing features unlocked
   - Business limit (X/5)

**UX Details:**
- Pro tier badge visible
- Publishing button available (when entity ready)
- Business limit clearly displayed (X/5)
- Subscription management accessible
- All Pro features immediately available

### Pricing Page

**User Journey:**
1. User navigates to pricing page
2. User sees:
   - Free tier card
   - Pro tier card
   - Agency tier card (if applicable)
3. Current plan highlighted
4. Upgrade buttons for higher tiers
5. Current plan button disabled/shows "Current Plan"

**UX Details:**
- All tiers displayed with features
- Pricing clearly shown
- Current plan badge visible
- Upgrade buttons contextually enabled
- Feature comparison visible

---

## Error Handling & Recovery

### Form Validation Errors

**User Journey:**
1. User submits form with invalid data
2. Browser validation prevents submission
3. Error messages displayed:
   - Field-level errors
   - Form-level errors
4. User corrects errors
5. Form submission succeeds

**UX Details:**
- Real-time validation feedback
- Clear error messages
- Form data preserved on error
- Helpful guidance for corrections
- Validation prevents invalid submissions

### API Errors

**User Journey:**
1. User performs action (create, crawl, publish)
2. API returns error (400, 403, 404, 500)
3. Error message displayed to user
4. User can retry or take alternative action

**UX Details:**
- Error messages are user-friendly
- Specific error context provided
- Recovery options available
- Form data preserved when possible
- Network errors handled gracefully

### Business Limit Reached

**User Journey:**
1. Free user attempts to create second business
2. API returns 403 error
3. Error message: "Business limit reached"
4. Upgrade CTA displayed
5. User can upgrade or manage existing businesses

**UX Details:**
- Clear limit messaging
- Current count vs. max displayed
- Upgrade prompt with benefits
- Link to pricing page
- Helpful guidance

### Network Errors

**User Journey:**
1. User performs action
2. Network request fails
3. Error message displayed
4. User can retry action
5. System recovers gracefully

**UX Details:**
- Offline handling
- Timeout errors handled
- Retry options available
- User feedback clear
- No data loss

### 401/403/404 Errors

**User Journey:**
1. Unauthenticated user accesses protected route
2. System redirects to sign-in (401)
3. User without permission accesses resource
4. System shows error or redirects (403)
5. User accesses non-existent resource
6. System shows "Not Found" message (404)

**UX Details:**
- 401: Redirect to sign-in
- 403: Permission error message
- 404: Not found message
- Helpful error pages
- Navigation options available

---

## Loading States & Feedback

### Form Submission Loading

**User Journey:**
1. User submits form
2. Submit button shows loading state:
   - Button disabled
   - Loading text/spinner
   - Prevents double-submission
3. Success feedback:
   - Redirect to success page
   - Confirmation message
4. Error feedback:
   - Error message displayed
   - Form remains accessible

**UX Details:**
- Button disabled during submission
- Loading indicator visible
- Clear feedback on success/error
- Prevents accidental double-submission
- Smooth transitions

### Data Fetching Loading

**User Journey:**
1. User navigates to page
2. Loading skeleton/spinner displayed
3. Data loads
4. Content replaces loading state
5. Page fully interactive

**UX Details:**
- Loading skeletons for lists
- Spinners for detail pages
- Progressive loading where possible
- Smooth transitions
- No jarring content shifts

### Async Operation Progress

**User Journey:**
1. User triggers async operation (crawl, fingerprint, publish)
2. Button shows loading state
3. Status updates displayed:
   - "Crawling..."
   - "Analyzing..."
   - "Publishing..."
4. Operation completes
5. Results displayed

**UX Details:**
- Clear status indicators
- Progress feedback where possible
- Button states reflect operation status
- Results appear automatically
- Error states handled gracefully

---

## Navigation & Flow Continuity

### Dashboard Navigation

**User Journey:**
1. User signs in
2. User lands on dashboard
3. User can navigate to:
   - Businesses list
   - Add business
   - Settings
   - Pricing
4. Sidebar navigation available
5. Breadcrumbs for deep navigation

**UX Details:**
- Clear navigation structure
- Active page highlighted
- Breadcrumbs for context
- Quick access to key features
- Consistent navigation across pages

### Business List to Detail

**User Journey:**
1. User views businesses list
2. User clicks business card
3. User navigates to business detail
4. User can navigate back to list
5. Deep linking works (direct URL access)

**UX Details:**
- Smooth navigation transitions
- "Back to Businesses" button
- URL reflects current page
- Direct URL access supported
- Browser back button works

### Deep Linking

**User Journey:**
1. User accesses direct URL (e.g., `/dashboard/businesses/123`)
2. System loads business data
3. Page displays correctly
4. Navigation context maintained

**UX Details:**
- Direct URL access works
- Data loads correctly
- Navigation state preserved
- Error handling for invalid IDs
- Smooth page loads

### Flow Continuity

**User Journey:**
1. User completes multi-step flow:
   - Create business → Crawl → Fingerprint → Publish
2. Each step maintains context
3. User can navigate between steps
4. Progress persists across page reloads
5. State maintained in database

**UX Details:**
- Context preserved across steps
- Progress indicators visible
- Can resume from any step
- Data persists across sessions
- Smooth flow transitions

---

## Complete User Journeys

### Free Tier Complete Journey

**User Journey:**
1. Sign up (Free tier)
2. Navigate to dashboard
3. Add business (URL-only or full form)
4. View business detail page
5. Trigger crawl
6. Wait for crawl completion
7. Trigger fingerprint
8. View visibility score
9. See upgrade CTA for publishing
10. Navigate to pricing page
11. Upgrade to Pro (optional)

**Time to Value:**
- Sign up → First visibility score: ~5-7 minutes
- Full journey: ~10-15 minutes

### Pro Tier Complete Journey

**User Journey:**
1. Sign up or upgrade to Pro
2. Navigate to dashboard
3. Add business (URL-only or full form)
4. System auto-starts crawl and fingerprint
5. View business detail page
6. Wait for auto-processing completion
7. View visibility score
8. View entity preview card
9. Publish to Wikidata
10. View published entity (QID)
11. Access automation features

**Time to Value:**
- Sign up → Published entity: ~5-10 minutes (with auto-processing)
- Manual flow: ~10-15 minutes

### Frictionless Onboarding Journey (Pro Tier)

**User Journey:**
1. Sign up (Pro tier)
2. Navigate to business creation
3. Enter only website URL
4. System automatically:
   - Extracts business data
   - Creates business
   - Crawls website
   - Runs fingerprint
   - Publishes to Wikidata (if notable)
5. User views complete results:
   - Business details
   - Visibility score
   - Published QID
   - Automation enabled

**Time to Value:**
- URL submission → Complete results: ~5-10 minutes
- Minimal user interaction required
- Maximum automation

---

## Key UX Principles

### 1. Frictionless Onboarding
- URL-only submission for quick start
- Auto-processing reduces manual steps
- Clear guidance for new users

### 2. Progressive Disclosure
- Simple forms for basic users
- Advanced features for power users
- Contextual help and tooltips

### 3. Clear Feedback
- Loading states for all async operations
- Success/error messages are clear
- Progress indicators where applicable

### 4. Error Recovery
- Graceful error handling
- Clear error messages
- Recovery options available
- Data preservation

### 5. Visual Consistency
- Gem-themed design language
- Consistent card components
- Clear visual hierarchy
- Accessible color schemes

### 6. Performance
- Fast page loads
- Optimistic UI updates
- Caching for repeated operations
- Background processing

### 7. Value Communication
- Clear tier benefits
- Upgrade prompts are informative
- Value proposition visible
- Feature gating is clear

---

## Technical Implementation Notes

### Auto-Processing
- Crawl and fingerprint run in parallel after business creation
- Pro tier auto-publishes if notability requirements met
- Background jobs handle long-running operations
- Status updates via polling/websockets

### Caching Strategy
- Crawl cache: 24 hours
- Fingerprint cache: 10 minutes
- Entity assembly: On-demand
- Business data: Real-time

### State Management
- Server-side state (PostgreSQL)
- Client-side optimistic updates
- Status synchronization
- Data persistence across sessions

### Error Handling
- Client-side validation
- Server-side validation
- API error responses
- User-friendly error messages
- Recovery mechanisms

---

## Testing Coverage

All user flows described in this document are validated by comprehensive E2E tests:

- **Complete workflows**: `complete-workflows.spec.ts`
- **Pro user journey**: `pro-user-core-journey.spec.ts`
- **Frictionless onboarding**: `frictionless-onboarding-complete-flow.spec.ts`
- **Subscription upgrades**: `subscription-upgrade-workflows.spec.ts`
- **Production readiness**: `production-readiness-complete-flow.spec.ts`
- **UX value proposition**: `ux-value-proposition-display.spec.ts`
- **Error handling**: `ux-error-states.spec.ts`
- **Navigation flows**: `ux-navigation-flows.spec.ts`

These tests ensure the UX flows work correctly across all tiers and scenarios.

---

## Future Enhancements

Potential UX improvements based on user feedback and testing:

1. **Real-time Updates**: WebSocket integration for live status updates
2. **Batch Operations**: Multi-business operations
3. **Advanced Analytics**: Historical trends and comparisons
4. **Export Features**: Data export in various formats
5. **Collaboration**: Team features and sharing
6. **Mobile Optimization**: Enhanced mobile experience
7. **Accessibility**: WCAG 2.1 AA compliance
8. **Internationalization**: Multi-language support

---

*Last updated: Based on E2E test suite as of latest test run*

