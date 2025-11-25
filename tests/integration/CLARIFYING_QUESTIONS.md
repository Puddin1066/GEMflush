# Clarifying Questions: Services + Components + Dashboard Integration

## Purpose
This document contains clarifying questions about pages and data flow to ensure integration tests accurately specify the behavior necessary for GEMflush value delivery.

**Format**: Multiple Choice Questions (MCQs) for easy answering.

---

## 📄 Page Structure Questions

### 1. Dashboard Main Page (`/dashboard`)
**Current Understanding:**
- Displays aggregated statistics (total businesses, avg visibility score, etc.)
- Shows list of businesses with status
- Uses `getDashboardDTO()` to fetch data

**Q1.1: Dashboard Component Type**
What type of component should the dashboard page be?

- [x] A) Server Component that fetches data directly via `getDashboardDTO()`
- [ ] B) Client Component using hooks (e.g., `useDashboard()`)
- [ ] C) Hybrid: Server Component for initial load, Client Component for updates
- [ ] D) Not applicable / Other: ___________

**Q1.2: Dashboard Metrics**
What specific metrics should be displayed on the main dashboard? (Select all that apply)

- [x] A) Total businesses count
- [ ] B) Published entities count (Wikidata QIDs)
- [ ] C) Average visibility score
- [ ] D) Recent activity feed
- [ ] E) Total crawled businesses
- [ ] F) Total published businesses
- [ ] G) Other: ___________

**Q1.3: Real-Time Updates**
Should the dashboard show real-time updates?

- [x] A) Yes, via polling (e.g., every 5-10 seconds)
- [ ] B) No, only on page load/refresh
- [ ] C) Yes, but only for actively processing businesses
- [ ] D) Not applicable / Other: ___________

**Q1.4: Filters and Sorting**
Are filters or sorting options needed on the dashboard?

- [x] A) Yes, filter by status (pending, crawling, published, etc.)
- [ ] B) Yes, sort by visibility score
- [ ] C) Yes, filter by date range
- [ ] D) No filters/sorting needed
- [ ] E) Other: ___________

### 2. Business Detail Page (`/dashboard/businesses/[id]`)
**Current Understanding:**
- Shows 3-column layout: GemOverviewCard, VisibilityIntelCard, CompetitiveEdgeCard
- Uses `useBusinessDetail` hook to fetch business, fingerprint, and entity data
- Displays Wikidata entity section when available

**Q2.1: Card Visibility**
Should all three cards (GemOverviewCard, VisibilityIntelCard, CompetitiveEdgeCard) always be visible?

- [x] A) Yes, always show all three cards (with empty states if no data)
- [ ] B) No, conditionally render based on data availability
- [ ] C) Show cards but hide sections within cards that lack data
- [ ] D) Other: ___________

**Q2.2: Pending State Display**
What should happen when a business is in "pending" state?

- [x] A) Show empty states with CTAs (e.g., "Start Crawl")
- [ ] B) Show processing indicators (e.g., "Processing will begin shortly")
- [ ] C) Show both: empty state + processing indicator
- [ ] D) Show nothing (blank/loading state)
- [ ] E) Other: ___________

**Q2.3: Manual Actions**
Should the business detail page support manual actions (Crawl, Analyze, Publish) for non-Pro users?

- [x] A) Yes, show manual action buttons for non-Pro users
- [ ] B) No, read-only for all users (automation only)
- [ ] C) Yes, but only for free tier (Pro tier is automation-only)
- [ ] D) Other: ___________

**Q2.4: Active Processing Handling**
How should the page handle businesses that are actively processing?

- [x] A) Auto-refresh/poll every 5 seconds until status changes
- [ ] B) Auto-refresh/poll with maximum duration (e.g., 3 minutes)
- [ ] C) Manual refresh only (user clicks refresh button)
- [ ] D) WebSocket/SSE for real-time updates
- [ ] E) Other: ___________

### 3. Fingerprint Page (`/dashboard/businesses/[id]/fingerprint`)
**Current Understanding:**
- Shows detailed LLM visibility analysis
- Displays per-model breakdown
- Shows visibility score chart with history

**Q3.1: Historical Data**
Should the fingerprint page show historical data (trends over time)?

- [x] A) Yes, show historical trends (chart with multiple data points)
- [ ] B) No, show only the latest fingerprint
- [ ] C) Yes, but optional (toggle between latest and history)
- [ ] D) Other: ___________

**Q3.2: No Fingerprint State**
What should be displayed when no fingerprint exists yet?

- [x] A) Empty state with CTA (e.g., "Analyze Now" button)
- [ ] B) Processing indicator (e.g., "Fingerprint in progress...")
- [ ] C) Both: empty state if not started, processing indicator if in progress
- [ ] D) Educational content explaining what fingerprinting is
- [ ] E) Other: ___________

**Q3.3: Multiple Fingerprint Comparison**
Should the page support comparing multiple fingerprints side-by-side?

- [x] A) Yes, allow selecting multiple fingerprints to compare
- [ ] B) No, show only one fingerprint at a time
- [ ] C) Yes, but only for Pro tier
- [ ] D) Other: ___________

**Q3.4: Export/Download**
Are export/download capabilities needed?

- [x] A) Yes, PDF report export
- [ ] B) Yes, CSV data export
- [ ] C) Yes, both PDF and CSV
- [ ] D) No export needed
- [ ] E) Other: ___________

### 4. Competitive Analysis Page (`/dashboard/businesses/[id]/competitive`)
**Current Understanding:**
- Shows competitive leaderboard
- Displays how business compares to competitors

**Q4.1: Leaderboard Generation**
How is the competitive leaderboard generated?

- [x] A) From fingerprint data (extracted from competitiveLeaderboard field)
- [ ] B) From separate competitive analysis service
- [ ] C) Both: fingerprint data + separate service enrichment
- [ ] D) Other: ___________

**Q4.2: Competitor Detection**
Should competitors be automatically detected or manually added?

- [x] A) Automatically detected (e.g., from category/location)
- [ ] B) Manually added by user
- [ ] C) Both: auto-detect with option to add manually
- [ ] D) Other: ___________

**Q4.3: Competitive Metrics**
What metrics should be shown in competitive analysis? (Select all that apply)

- [x] A) Visibility score
- [ ] B) Mention rate
- [ ] C) Sentiment score
- [ ] D) Rank/position
- [ ] E) Wikidata QID presence
- [ ] F) Other: ___________

**Q4.4: Historical Competitive Data**
Should there be historical competitive data (trends over time)?

- [x] A) Yes, show competitive trends over time
- [ ] B) No, show only current snapshot
- [ ] C) Yes, but only for Pro tier
- [ ] D) Other: ___________

### 5. Activity Page (`/dashboard/activity`)
**Current Understanding:**
- Shows activity feed of business operations
- Displays crawl, fingerprint, and publish events

**Q5.1: Activity Types**
What types of activities should be shown? (Select all that apply)

- [x] A) Crawl started
- [ ] B) Crawl completed
- [ ] C) Fingerprint generated
- [ ] D) Published to Wikidata
- [ ] E) Errors/failures
- [ ] F) Automation triggers
- [ ] G) Other: ___________

**Q5.2: Activity Filtering**
Should activities be filterable?

- [x] A) Yes, filter by business
- [ ] B) Yes, filter by date range
- [ ] C) Yes, filter by activity type
- [ ] D) Yes, all of the above
- [ ] E) No filtering needed
- [ ] F) Other: ___________

**Q5.3: Activity History Duration**
How far back should activity history go?

- [x] A) Last 30 days
- [ ] B) All time
- [ ] C) Configurable (user selects duration)
- [ ] D) Last 100 activities (regardless of date)
- [ ] E) Other: ___________

**Q5.4: Real-Time Activity Updates**
Should activities be real-time?

- [x] A) Yes, via polling (e.g., every 5-10 seconds)
- [ ] B) Yes, via WebSocket/SSE
- [ ] C) No, only on page load
- [ ] D) Yes, but only for recent activities (last hour)
- [ ] E) Other: ___________

---

## 🔄 Data Flow Questions

### 1. Service → DTO → Component Flow

**Current Understanding:**
```
Service (lib/services/) 
  → Executes business logic
  → Returns domain objects
  → DTO Layer (lib/data/) transforms to UI-friendly format
  → Hooks (lib/hooks/) fetch via API routes
  → Components receive DTOs as props
```

**Q6.1: DTO Transformation Location**
Where should DTO transformation happen?

- [x] A) Services return DTOs directly
- [ ] B) DTO transformation in API routes (services return domain objects)
- [ ] C) DTO transformation in hooks (API routes return domain objects)
- [ ] D) Hybrid: services return DTOs for some, domain objects for others
- [ ] E) Other: ___________

**Q6.2: Direct Service Calls**
Are there cases where services should be called directly from components (bypassing API routes)?

- [x] A) No, always use API routes
- [ ] B) Yes, for Server Components only
- [ ] C) Yes, for utility/helper services (non-data services)
- [ ] D) Other: ___________

**Q6.3: Computed/Derived Fields**
Should DTOs include computed/derived fields (e.g., trend calculations, formatted dates)?

- [x] A) Yes, DTOs should include all computed fields
- [ ] B) No, components should compute derived fields
- [ ] C) Hybrid: DTOs include some (trends), components compute others (formatting)
- [ ] D) Other: ___________

**Q6.4: Error Structure in DTOs**
How should errors be structured in DTOs?

- [x] A) Error field in DTO (e.g., `{ data: {...}, error: string | null }`)
- [ ] B) Null values for missing data (e.g., `fingerprint: null`)
- [ ] C) Separate error DTOs (e.g., `ErrorDTO`)
- [ ] D) Both: error field + null values
- [ ] E) Other: ___________

### 2. Real-Time Updates

**Current Understanding:**
- `useBusinessDetail` hook polls every 5 seconds when business is in processing state
- Polling stops after 60 attempts (3 minutes) or when status changes

**Q7.1: Pages with Real-Time Updates**
Which pages should support real-time updates?

- [x] A) All pages
- [ ] B) Only business detail page
- [ ] C) Business detail + dashboard (for processing businesses)
- [ ] D) Business detail + fingerprint + competitive pages
- [ ] E) Other: ___________

**Q7.2: Polling Interval**
What's the preferred polling interval?

- [x] A) 5 seconds (current)
- [ ] B) 10 seconds
- [ ] C) Configurable (user setting)
- [ ] D) Adaptive (faster when processing, slower when idle)
- [ ] E) Other: ___________

**Q7.3: Maximum Polling Duration**
Should there be a maximum polling duration?

- [x] A) Yes, maximum duration (e.g., 3 minutes / 60 attempts)
- [ ] B) No, poll until status changes
- [ ] C) Yes, but configurable per operation type
- [ ] D) Other: ___________

**Q7.4: Real-Time Technology**
What technology should be used for real-time updates?

- [x] A) Polling only (HTTP requests)
- [ ] B) WebSocket
- [ ] C) Server-Sent Events (SSE)
- [ ] D) Hybrid: polling for most, WebSocket/SSE for critical updates
- [ ] E) Other: ___________

**Q7.5: Polling Control**
How should polling be disabled/stopped?

- [x] A) Automatically when page is not visible (Page Visibility API)
- [ ] B) Manual stop button
- [ ] C) Both: auto-stop on visibility + manual button
- [ ] D) Stop when status changes (no manual control needed)
- [ ] E) Other: ___________

### 3. Error Handling Flow

**Current Understanding:**
- Services return `{ success: boolean, error?: string }` structure
- DTOs may include `errorMessage` field
- Components show error states via `ErrorCard` component

**Q8.1: Error Display Location**
Where should errors be displayed?

- [x] A) Inline within cards/components
- [ ] B) Full-page error states
- [ ] C) Both: inline for component errors, full-page for critical errors
- [ ] D) Toast notifications + inline errors
- [ ] E) Other: ___________

**Q8.2: Retry Strategy**
What's the retry strategy?

- [x] A) Automatic retry (with exponential backoff)
- [ ] B) Manual retry button only
- [ ] C) Both: automatic retry + manual retry button
- [ ] D) No retry (user must refresh page)
- [ ] E) Other: ___________

**Q8.3: Partial Failure Handling**
Should partial failures (e.g., crawl succeeds but fingerprint fails) show partial data?

- [x] A) Yes, show partial data with error indicator
- [ ] B) No, show full error (hide partial data)
- [ ] C) Yes, but with clear error messaging about what failed
- [ ] D) Other: ___________

**Q8.4: Error Type Differentiation**
How should network errors vs. business logic errors be differentiated in the UI?

- [x] A) Different error messages/styles
- [ ] B) Different retry strategies (auto-retry for network, manual for business logic)
- [ ] C) Same treatment for all errors
- [ ] D) Error codes/types in UI
- [ ] E) Other: ___________

**Q8.5: Error Message Style**
Should error messages be user-friendly or technical?

- [x] A) User-friendly only
- [ ] B) Technical only
- [ ] C) Both: user-friendly with expandable technical details
- [ ] D) User-friendly with link to technical details
- [ ] E) Other: ___________

### 4. Loading States

**Current Understanding:**
- Components use loading skeletons during data fetch
- `ActionButton` shows loading spinner during async operations
- `ProgressIndicator` shows progress for long-running operations

**Q9.1: Loading State Scope**
When should loading states be shown?

- [x] A) All async operations (even <1 second)
- [ ] B) Only long-running operations (>1 second)
- [ ] C) Only operations >2 seconds
- [ ] D) Configurable threshold
- [ ] E) Other: ___________

**Q9.2: Loading State Coordination**
How should loading states be coordinated across multiple components on the same page?

- [x] A) Independent loading states per component
- [ ] B) Global loading state (all components show loading together)
- [ ] C) Hybrid: global for initial load, independent for updates
- [ ] D) Other: ___________

**Q9.3: Global Loading Indicator**
Should there be a global loading indicator for page-level operations?

- [x] A) Yes, show global indicator for page-level operations
- [ ] B) No, use component-level loading states only
- [ ] C) Yes, but only for critical operations (e.g., publish)
- [ ] D) Other: ___________

**Q9.4: Background Refresh Behavior**
What's the expected behavior when data is being refreshed in the background?

- [x] A) Show stale data + loading indicator (stale-while-revalidate)
- [ ] B) Full loading state (hide stale data)
- [ ] C) Show stale data with subtle refresh indicator
- [ ] D) Other: ___________

### 5. Data Caching and Staleness

**Current Understanding:**
- Hooks manage local state for fetched data
- No explicit caching strategy visible

**Q10.1: Client-Side Caching**
Should data be cached client-side?

- [x] A) Yes, use React Query
- [ ] B) Yes, use SWR
- [ ] C) Yes, use custom caching solution
- [ ] D) No caching (always fetch fresh)
- [ ] E) Other: ___________

**Q10.2: Cache Freshness**
How long should cached data be considered fresh?

- [x] A) Immediate revalidation (always fetch fresh)
- [ ] B) Stale-while-revalidate (show stale, fetch fresh in background)
- [ ] C) Time-based (e.g., 5 minutes fresh, then stale)
- [ ] D) Configurable per data type
- [ ] E) Other: ___________

**Q10.3: Stale Data Display**
Should users see stale data while fresh data loads?

- [x] A) Yes, show stale data + loading indicator
- [ ] B) No, show loading state (hide stale data)
- [ ] C) Yes, but with clear "updating" indicator
- [ ] D) Other: ___________

**Q10.4: Cache Invalidation**
How should cache invalidation work?

- [x] A) On mutation (invalidate after create/update/delete)
- [ ] B) On time interval (periodic refresh)
- [ ] C) Manual refresh (user action)
- [ ] D) All of the above
- [ ] E) Other: ___________

---

## 🎯 Value Proposition Delivery Questions

### 1. GEMflush Core Value

**Q11.1: Primary Value Metric**
What's the primary value metric users care about?

- [x] A) Visibility score (0-100)
- [ ] B) Wikidata QID (published entity)
- [ ] C) Competitive rank
- [ ] D) All of the above (composite value)
- [ ] E) Other: ___________

**Q11.2: Value Communication**
How should value be communicated? (Select all that apply)

- [x] A) Numbers/metrics
- [ ] B) Charts/graphs
- [ ] C) Comparisons (vs. competitors)
- [ ] D) Trends over time
- [ ] E) Visual indicators (badges, colors)
- [ ] F) Other: ___________

**Q11.3: Value Summary/ROI**
Should there be a "value summary" or "ROI" section showing improvement over time?

- [x] A) Yes, dedicated ROI/value summary section
- [ ] B) No, value shown through individual metrics
- [ ] C) Yes, but only for Pro tier
- [ ] D) Other: ___________

**Q11.4: Minimum Viable Data**
What's the minimum viable data needed to show value?

- [x] A) Just crawl data (basic business info)
- [ ] B) Fingerprint data (visibility score)
- [ ] C) Published entity (Wikidata QID)
- [ ] D) Complete CFP flow (all data)
- [ ] E) Other: ___________

### 2. Onboarding and First Value

**Q12.1: First Value Timing**
What's the first value users should see?

- [x] A) Immediate after URL submission (confirmation message)
- [ ] B) After crawl (business data extracted)
- [ ] C) After fingerprint (visibility score)
- [ ] D) After publish (Wikidata QID)
- [ ] E) Progressive: value at each step
- [ ] F) Other: ___________

**Q12.2: Quick Win Flow**
Should there be a "quick win" flow that shows value faster?

- [x] A) Yes, basic fingerprint before full CFP
- [ ] B) Yes, crawl data preview before fingerprint
- [ ] C) No, full CFP flow only
- [ ] D) Yes, but only for Pro tier
- [ ] E) Other: ___________

**Q12.3: Progress Communication**
How should we communicate progress during the initial CFP flow?

- [x] A) Step-by-step progress (Crawl → Fingerprint → Publish)
- [ ] B) Estimated time remaining
- [ ] C) Percentage complete
- [ ] D) All of the above
- [ ] E) Other: ___________

**Q12.4: Waiting State Content**
What should users see while waiting for their first results?

- [x] A) Educational content (what is fingerprinting, etc.)
- [ ] B) Examples/demos
- [ ] C) Progress indicators only
- [ ] D) All of the above
- [ ] E) Other: ___________

### 3. Competitive Intelligence

**Q13.1: Competitive Data Presentation**
How should competitive data be presented? (Select all that apply)

- [x] A) Leaderboard (ranked list)
- [ ] B) Comparison charts
- [ ] C) Detailed breakdown (per-competitor)
- [ ] D) Side-by-side comparison
- [ ] E) Other: ___________

**Q13.2: Competitive Analysis Tier**
Should competitive analysis be a core feature or add-on?

- [x] A) Core feature (available to all tiers)
- [ ] B) Add-on (Pro tier only)
- [ ] C) Hybrid: basic for free, advanced for Pro
- [ ] D) Other: ___________

**Q13.3: Competitive Metrics Priority**
What competitive metrics matter most? (Select all that apply)

- [x] A) Visibility score
- [ ] B) Mention rate
- [ ] C) Sentiment score
- [ ] D) Rank/position
- [ ] E) Wikidata presence
- [ ] F) Other: ___________

**Q13.4: Custom Competitors**
Should users be able to add custom competitors?

- [x] A) Yes, add custom competitors
- [ ] B) No, only auto-detected competitors
- [ ] C) Yes, but only for Pro tier
- [ ] D) Other: ___________

### 4. Automation Value

**Q14.1: Automation Value Communication**
How should automation value be communicated? (Select all that apply)

- [x] A) Time saved (e.g., "Saves 2 hours/week")
- [ ] B) Automatic updates messaging
- [ ] C) Set-and-forget messaging
- [ ] D) Visual indicators (automation badges)
- [ ] E) Other: ___________

**Q14.2: Automation Status Dashboard**
Should there be an "automation status" dashboard showing what's running automatically?

- [x] A) Yes, dedicated automation dashboard
- [ ] B) No, show automation status inline (in business cards)
- [ ] C) Yes, but only for Pro tier
- [ ] D) Other: ___________

**Q14.3: Automation Understanding**
How should users understand what automation is doing?

- [x] A) Activity log (detailed automation events)
- [ ] B) Status indicators (visual badges/icons)
- [ ] C) Notifications (push/email)
- [ ] D) All of the above
- [ ] E) Other: ___________

**Q14.4: Automation Visibility**
Should automation be visible to free tier users?

- [x] A) Yes, as a teaser (show what they're missing)
- [ ] B) No, only visible to paid tier
- [ ] C) Yes, but with upgrade CTAs
- [ ] D) Other: ___________

---

## 🔧 Technical Integration Questions

### 1. API Route Structure

**Q15.1: API Route Return Type**
What should API routes return?

- [x] A) DTOs directly (routes call DTO functions)
- [ ] B) Domain objects (routes call services, transform to DTOs in route)
- [ ] C) Hybrid: DTOs for reads, domain objects for writes
- [ ] D) Other: ___________

**Q15.2: Server Actions vs API Routes**
Are there API routes that should be Server Actions instead?

- [x] A) Yes, mutations (create/update/delete) should be Server Actions
- [ ] B) No, all should be API routes
- [ ] C) Yes, form submissions should be Server Actions
- [ ] D) Other: ___________

**Q15.3: Error Transformation**
Should API routes handle error transformation (domain errors → user-friendly messages)?

- [x] A) Yes, routes transform all errors
- [ ] B) No, routes return raw errors, components transform
- [ ] C) Hybrid: routes transform critical errors, components handle others
- [ ] D) Other: ___________

**Q15.4: Authentication/Authorization**
Do API routes need authentication/authorization checks beyond middleware?

- [x] A) No, middleware handles all auth
- [ ] B) Yes, route-level checks for sensitive operations
- [ ] C) Yes, resource-level authorization (e.g., user owns business)
- [ ] D) Other: ___________

### 2. Service Orchestration

**Questions:**
- [ ] Should services call other services directly, or should orchestration happen at a higher level (API routes, CFP orchestrator)?
- [ ] How should service dependencies be managed? (dependency injection, direct imports, service locator)
- [ ] Should services be stateless, or can they maintain state? (e.g., progress tracking)
- [ ] How should long-running operations be handled? (background jobs, polling, webhooks)

### 3. Component Composition

**Questions:**
- [ ] Should components be composed at the page level, or should there be higher-level "container" components?
- [ ] How should shared state be managed across components on the same page? (context, props drilling, state management library)
- [ ] Should components be responsible for data fetching, or should pages/hooks handle fetching and pass data down?
- [ ] Are there any components that should be Server Components vs. Client Components?

---

## 📊 Data Requirements Questions

### 1. Business Data

**Questions:**
- [ ] What's the minimum required data to create a business? (just URL, or more fields)
- [ ] Should businesses have categories/tags for organization?
- [ ] Are there any business metadata fields needed? (notes, custom fields, labels)
- [ ] Should businesses support multiple URLs? (main site, social media, etc.)

### 2. Fingerprint Data

**Questions:**
- [ ] How long should fingerprint history be retained? (last 10, last 30, all time)
- [ ] Should fingerprints be versioned or just timestamped?
- [ ] Are there any fingerprint metadata fields needed? (LLM versions tested, test parameters)
- [ ] Should fingerprints support custom queries/test scenarios beyond the default?

### 3. Wikidata Entity Data

**Questions:**
- [ ] What's the minimum entity data needed to publish? (name, location, website?)
- [ ] Should entity data be editable before publishing, or auto-generated only?
- [ ] How should entity updates be handled? (re-publish, incremental updates, version control)
- [ ] Should there be a preview/dry-run mode before publishing?

---

## 🎨 UX/UI Questions

### 1. Status Communication

**Questions:**
- [ ] How should processing status be communicated? (badges, progress bars, icons, text)
- [ ] Should status be color-coded? (what colors for what states)
- [ ] Are there any status states missing? (current: pending, crawling, crawled, generating, published, error)
- [ ] Should status include estimated time remaining?

### 2. Empty States

**Questions:**
- [ ] What should empty states show? (CTAs, educational content, examples)
- [ ] Should empty states be different for first-time users vs. returning users?
- [ ] Are there any empty states that should show mock/demo data instead of empty?

### 3. Success States

**Questions:**
- [ ] How should success be communicated? (toast notifications, success banners, status changes)
- [ ] Should there be celebratory moments? (e.g., first publish, reaching visibility score threshold)
- [ ] Should success states include next steps/CTAs?

---

## Next Steps

Please answer the questions above (or indicate which are not applicable) so that:
1. Integration tests can be refined to match actual requirements
2. Test specifications accurately reflect expected behavior
3. Implementation can proceed with clear specifications

**Priority Questions** (most critical for integration tests):
- Page structure and component composition
- Data flow (Service → DTO → Component)
- Real-time updates and polling strategy
- Error handling and loading states

