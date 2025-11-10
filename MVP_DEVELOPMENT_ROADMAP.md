# GEMflush MVP Development Roadmap

**Date:** November 10, 2025  
**Platform:** Next.js Knowledge Graph as a Service (KGaaS)  
**Goal:** Launch a functional, revenue-generating MVP in 2-3 weeks  
**Strategy:** Lean, focused, ship fast

---

## 🎯 Executive Summary

### Current State
- ✅ **Foundation Complete**: Auth, database schema, Stripe integration, premium UI
- ✅ **Backend Services**: Crawler, Wikidata builder, LLM fingerprinter (with mocks)
- ✅ **Design System**: Gem-inspired brand identity fully implemented
- 🔶 **Integration**: ~15% complete - UI and backend need connection
- ⏳ **Testing**: Minimal - needs end-to-end validation

### MVP Definition
**Core Value Proposition:** Help businesses test their AI visibility for free, upgrade to publish to Wikidata.

**Essential Features (MVP):**
1. Free tier: Add 1 business → Run LLM fingerprint → See visibility score
2. Paid tier: Publish business to Wikidata (test.wikidata.org initially)
3. Payment flow: Upgrade from free to Pro ($49/month)
4. Dashboard: View businesses, scores, and status

**Non-Essential (Post-MVP):**
- Historical trend tracking
- Competitive benchmarking
- Progressive enrichment
- Multiple businesses per user
- Weekly automated fingerprints

### Path to Launch
**Timeline:** 2-3 weeks  
**Focus:** Core workflows + payment conversion  
**Quality Bar:** Good enough to validate demand, polished enough to charge money

---

## 📊 Current vs Target State

| Component | Current State | MVP Target | Post-MVP |
|-----------|--------------|------------|----------|
| **Auth** | ✅ Complete | ✅ Use as-is | Email verification |
| **UI/UX** | ✅ Premium gem design | ✅ Use as-is | Loading states, animations |
| **Database** | ✅ Schema ready | ✅ Use as-is | Optimize queries |
| **Services** | ✅ Mock APIs | 🔄 Connect real APIs | Scale, optimize |
| **Business CRUD** | 🔶 Basic UI | 🔄 Full workflow | Bulk operations |
| **Crawling** | ✅ Mock service | 🔄 Real Cheerio crawler | Add Puppeteer fallback |
| **Wikidata** | ✅ Mock service | 🔄 test.wikidata.org | wikidata.org (prod) |
| **LLM Fingerprint** | ✅ Mock service | 🔄 OpenRouter (3 models) | 5-6 models, all prompts |
| **Payments** | ✅ Stripe ready | 🔄 Test upgrade flow | Usage tracking |
| **Dashboard** | 🔶 Uses mock data | 🔄 Real data integration | Charts, trends |
| **Testing** | ⏳ Minimal | 🔄 Manual E2E testing | Automated tests |

---

## 🚀 MVP Development Path (3 Phases)

### Phase 1: Foundation Integration (Week 1)
**Goal:** Connect existing UI to existing backend services. Get core workflows functional.

#### **Day 1-2: Dashboard Data Integration** ⭐ CRITICAL
- [ ] **1.1 Fix Build Errors**
  - Resolve any blocking TypeScript/build issues
  - Ensure `pnpm build` succeeds
  - Time: 1-2 hours

- [ ] **1.2 Dashboard Real Data** (INTEGRATION_STATUS indicates this is partially done)
  - ✅ Already converted to Server Component
  - ✅ Already replaced mock data with DB queries
  - [ ] Test with real database data
  - [ ] Add loading states
  - [ ] Handle empty states properly
  - Time: 2-3 hours

- [ ] **1.3 Business List Page**
  - Connect to `getBusinessesByTeam()` query
  - Display real business data with gem-card styling
  - Add "Add Business" CTA
  - Time: 2 hours

- [ ] **1.4 Add Business Flow**
  - Form validation (name, URL, category, location)
  - POST to `/api/business`
  - Success → redirect to business detail page
  - Error handling with user feedback
  - Time: 3-4 hours

**Deliverable:** User can sign up, add a business, see it in dashboard

---

#### **Day 3-4: Crawling + Wikidata Publishing** ⭐ CRITICAL

- [ ] **2.1 Connect Web Crawler**
  - Remove mock in `/api/crawl/route.ts`
  - Integrate real Cheerio-based crawler from `/lib/crawler/`
  - Extract: name, description, address, phone, social links
  - Store in `businesses.crawlData` JSONB field
  - Background job status tracking
  - Time: 4-5 hours

- [ ] **2.2 Wikidata Entity Builder**
  - Use crawler data → generate Wikidata entity JSON
  - Validate PIDs/QIDs via SPARQL (or mock validation for MVP)
  - Display entity preview to user
  - Time: 3-4 hours

- [ ] **2.3 Test Wikidata Publishing**
  - Create test Wikidata bot account
  - Connect to `test.wikidata.org` API
  - Publish entity, receive QID
  - Store QID in database
  - Time: 4-5 hours

- [ ] **2.4 Business Detail Page**
  - Display business info + crawl status
  - "Crawl Website" button → triggers `/api/crawl`
  - "Publish to Wikidata" button (Pro only) → triggers `/api/wikidata/publish`
  - Show Wikidata QID when published
  - Job status indicators (queued/processing/complete)
  - Time: 4-5 hours

**Deliverable:** User can crawl website, generate entity, publish to test.wikidata.org (Pro users)

---

#### **Day 5: LLM Fingerprinting** ⭐ CRITICAL

- [ ] **3.1 OpenRouter Setup**
  - Get OpenRouter API key
  - Test connection with 1 model (GPT-3.5-turbo or Claude-3-haiku)
  - Time: 1 hour

- [ ] **3.2 Simplified Fingerprinting (MVP)**
  - Use ONLY 1 prompt type: "What do you know about [Business Name] in [Location]?"
  - Test with 2-3 LLMs max (GPT-4, Claude, Gemini)
  - Simple mention detection (business name in response?)
  - Calculate basic visibility score: 0-100 based on mention rate
  - Skip: sentiment analysis, competitive benchmarking, accuracy checking
  - Time: 5-6 hours

- [ ] **3.3 Display Results**
  - Show visibility score (big number with gem styling)
  - Show per-LLM breakdown (which models mentioned you?)
  - Store in `llmFingerprints` table
  - Time: 2-3 hours

**Deliverable:** User can run fingerprint, see if LLMs know about their business

---

### Phase 2: Payment Flow + Polish (Week 2)

#### **Day 6-7: Stripe Integration** ⭐ CRITICAL

- [ ] **4.1 Create Stripe Products**
  - Pro: $49/month recurring
  - Agency: $149/month (optional for MVP)
  - Get price IDs, add to `.env.local`
  - Time: 1 hour

- [ ] **4.2 Upgrade Flow**
  - "Upgrade to Pro" button in multiple places:
    - Dashboard (if free user)
    - Pricing page
    - Business detail page (when clicking "Publish to Wikidata")
  - Connect to existing Stripe checkout
  - Verify webhook updates `teams.planName`
  - Time: 3-4 hours

- [ ] **4.3 Permission Gating**
  - Free users: Can't click "Publish to Wikidata"
  - Pro users: Can publish
  - Show appropriate CTAs based on plan
  - Use `/lib/gemflush/permissions.ts`
  - Time: 2-3 hours

- [ ] **4.4 Subscription Management**
  - Link to Stripe Customer Portal (already exists)
  - Show current plan in dashboard
  - Time: 1-2 hours

**Deliverable:** User can upgrade to Pro, unlock Wikidata publishing

---

#### **Day 8-9: Testing + Bug Fixes**

- [ ] **5.1 End-to-End Manual Testing**
  - Create new account
  - Add business
  - Run fingerprint (free tier)
  - Upgrade to Pro
  - Crawl website
  - Publish to test Wikidata
  - Verify QID stored
  - Check if fingerprint shows better score (if entity is notable)
  - Time: 4-5 hours

- [ ] **5.2 Edge Case Handling**
  - Business URL can't be crawled (invalid, 404, blocked)
  - Wikidata publish fails (validation error, API error)
  - Fingerprint job fails (API rate limit, timeout)
  - Payment fails (card declined)
  - Add error messages, retry mechanisms
  - Time: 4-5 hours

- [ ] **5.3 UI Polish**
  - Loading spinners during jobs
  - Success/error toast notifications
  - Empty states with helpful CTAs
  - Mobile responsiveness check
  - Time: 3-4 hours

**Deliverable:** Smooth, reliable core workflows

---

### Phase 3: Launch Prep (Week 3)

#### **Day 10-11: Production Readiness**

- [ ] **6.1 Environment Setup**
  - Production database (Neon, Supabase, or Vercel Postgres)
  - Production Stripe products
  - OpenRouter production API key (with budget limit)
  - Wikidata bot account (use test.wikidata initially)
  - Time: 2-3 hours

- [ ] **6.2 Database Migration**
  - Run `pnpm db:push` on production database
  - Verify all tables created
  - Time: 1 hour

- [ ] **6.3 Deploy to Vercel**
  - Connect GitHub repo
  - Add all environment variables
  - Deploy to production
  - Test live URLs
  - Time: 2-3 hours

- [ ] **6.4 Monitoring Setup**
  - Add basic error logging (Sentry or Vercel logs)
  - Set up alerts for failed jobs
  - Monitor OpenRouter costs
  - Time: 2-3 hours

**Deliverable:** Live production site at gemflush.com (or subdomain)

---

#### **Day 12-14: Launch + Iteration**

- [ ] **7.1 Content + Marketing**
  - Finalize landing page copy
  - Add FAQ about what's included in MVP
  - Transparent about limitations (e.g., "test Wikidata only for now")
  - Time: 3-4 hours

- [ ] **7.2 Soft Launch**
  - Share with small group (friends, beta users)
  - Collect feedback
  - Fix critical bugs
  - Time: Ongoing

- [ ] **7.3 Iterate Based on Feedback**
  - Focus on conversion funnel improvements
  - Fix usability issues
  - Add missing features based on demand
  - Time: Ongoing

**Deliverable:** Live MVP with real users

---

## 🎯 MVP Feature Matrix

### ✅ Include in MVP

| Feature | Why Essential | Complexity | Time |
|---------|---------------|------------|------|
| **Add Business** | Core user action | Low | 4h |
| **Web Crawling** | Data source for entities | Medium | 5h |
| **Wikidata Publishing** | Paid feature (revenue) | High | 8h |
| **LLM Fingerprint (basic)** | Free tier hook | Medium | 6h |
| **Stripe Upgrade** | Monetization | Low | 4h |
| **Dashboard Overview** | User home | Low | 3h |
| **Business Detail Page** | Action center | Medium | 5h |

**Total:** ~35 hours of core development

---

### ❌ Exclude from MVP (Post-Launch)

| Feature | Why Not MVP | Add When |
|---------|-------------|----------|
| **Competitive Benchmarking** | Complex, not core value | Week 4-5 |
| **Historical Trends** | Requires time-series data | Week 5-6 |
| **Multiple Businesses** | Adds complexity | Week 4 |
| **Weekly Auto-Fingerprints** | Needs job scheduler | Week 5 |
| **Progressive Enrichment** | Advanced feature | Month 2 |
| **Agency Plan** | Small market initially | Month 2-3 |
| **API Access** | No demand yet | Month 3+ |
| **Sentiment Analysis** | Nice-to-have | Month 2 |
| **5+ LLM Models** | Expensive, diminishing returns | Month 2 |

---

## 🛠️ Technical Implementation Details

### Critical Files to Modify/Complete

#### **Week 1 Priority:**

1. **`app/(dashboard)/dashboard/page.tsx`** (PARTIALLY DONE)
   - Verify real data integration works
   - Add loading states

2. **`app/(dashboard)/dashboard/businesses/page.tsx`**
   - Display business list from DB
   - Add gem-card styling

3. **`app/(dashboard)/dashboard/businesses/new/page.tsx`**
   - Complete form with validation
   - POST to API

4. **`app/(dashboard)/dashboard/businesses/[id]/page.tsx`**
   - Add action buttons (Crawl, Fingerprint, Publish)
   - Show job status
   - Display results

5. **`app/api/business/route.ts`**
   - Verify POST handler works
   - Add validation

6. **`app/api/crawl/route.ts`**
   - Remove mock, use real crawler
   - Add job tracking

7. **`app/api/wikidata/publish/route.ts`**
   - Connect to test.wikidata.org
   - Store QID

8. **`app/api/fingerprint/route.ts`** (NEW - might not exist yet)
   - Create route
   - Call OpenRouter
   - Store results

9. **`lib/crawler/index.ts`**
   - Ensure Cheerio scraper works
   - Add error handling

10. **`lib/llm/fingerprinter.ts`**
    - Simplify for MVP (fewer models, simpler scoring)

---

### Database Verification

Check if these tables exist and have data:

```bash
# Connect to database
psql $DATABASE_URL

# Verify tables
\dt

# Expected tables:
# - users
# - teams
# - team_members
# - businesses (GEMflush)
# - wikidata_entities (GEMflush)
# - llm_fingerprints (GEMflush)
# - crawl_jobs (GEMflush)
```

If tables don't exist:
```bash
pnpm db:push
```

---

### Environment Variables Checklist

```bash
# .env.local (for development)
DATABASE_URL=postgresql://...
AUTH_SECRET=your-secret-key

# Stripe
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...

# OpenRouter
OPENROUTER_API_KEY=sk-or-v1-...

# Wikidata (for production publishing)
WIKIDATA_BOT_USERNAME=YourBot@YourBot
WIKIDATA_BOT_PASSWORD=your-bot-password

# Optional for MVP
UPSTASH_REDIS_URL=...
UPSTASH_REDIS_TOKEN=...
```

---

## 🧪 Testing Strategy for MVP

### Manual Testing Checklist

**Happy Path:**
- [ ] Sign up → Dashboard
- [ ] Add business → Success
- [ ] View business detail
- [ ] Click "Crawl Website" → See loading → See results
- [ ] Click "Run Fingerprint" → See score
- [ ] Click "Upgrade" → Stripe checkout → Success
- [ ] Click "Publish to Wikidata" (as Pro user) → See QID

**Edge Cases:**
- [ ] Invalid URL (should show error)
- [ ] Already-crawled business (should show cached data or re-crawl)
- [ ] Wikidata publish failure (should show error message)
- [ ] Free user tries to publish (should show upgrade CTA)
- [ ] Payment fails (Stripe handles this)

**Performance:**
- [ ] Crawl completes in < 2 minutes
- [ ] Fingerprint completes in < 5 minutes
- [ ] Dashboard loads in < 2 seconds

---

## 💰 Cost Estimation for MVP Testing

### OpenRouter Costs (per fingerprint)

| Model | Cost per 1K tokens | Tokens per query | Cost per fingerprint |
|-------|-------------------|------------------|---------------------|
| GPT-3.5 Turbo | $0.0005 | ~500 | $0.00025 |
| GPT-4 Turbo | $0.01 | ~500 | $0.005 |
| Claude 3 Haiku | $0.00025 | ~500 | $0.000125 |

**MVP Configuration (3 models, 1 prompt):**
- GPT-4 Turbo: $0.005
- Claude 3 Haiku: $0.000125
- Gemini Pro (free tier): $0

**Total per fingerprint:** ~$0.005 (half a cent)

**Budget for 100 test fingerprints:** ~$0.50  
**Budget for 1,000 fingerprints:** ~$5

**Recommendation:** Start with $20 OpenRouter credit, monitor usage carefully.

---

### Infrastructure Costs (Monthly)

| Service | Tier | Cost |
|---------|------|------|
| Vercel | Pro | $20 |
| Database (Neon/Supabase) | Free/Hobby | $0-10 |
| Redis (Upstash) | Free | $0 |
| Stripe | Pay-as-you-go | 2.9% + $0.30 per txn |
| Domain | - | $12/year |

**Total MVP Burn:** ~$20-30/month

---

## 🚨 Risks & Mitigation

### Technical Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Wikidata bot approval delay** | High | Medium | Use test.wikidata.org initially (no approval needed) |
| **OpenRouter rate limits** | Medium | Low | Implement exponential backoff, queue system |
| **Crawling blocked by sites** | Medium | High | Start with mock data, add Puppeteer fallback later |
| **Database performance** | Low | Low | Use indexes, connection pooling |
| **Build errors blocking progress** | High | Medium | Fix immediately (Day 1 priority) |

### Business Risks

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **No demand for paid tier** | High | Medium | Strong free tier value, clear upgrade benefits |
| **Free tier abuse** | Medium | Medium | Rate limiting, email verification |
| **High OpenRouter costs** | Medium | Low | Budget limits, cost monitoring |
| **Competitors launch similar product** | Medium | Low | Speed to market, unique UX |

---

## 📈 Success Metrics for MVP

### Week 1 (Build)
- ✅ All core workflows functional
- ✅ Zero critical bugs
- ✅ Build succeeds

### Week 2 (Polish + Payment)
- ✅ Stripe checkout working
- ✅ At least 1 test upgrade successful
- ✅ Mobile-responsive

### Week 3 (Launch)
- 🎯 Deploy to production
- 🎯 5-10 beta users
- 🎯 At least 1 real paid subscription

### Month 1 Post-Launch
- 🎯 50+ sign-ups
- 🎯 10+ paid subscriptions ($490 MRR)
- 🎯 < $100 monthly costs
- 🎯 5+ Wikidata entities published
- 🎯 100+ fingerprints run

---

## 🛤️ Post-MVP Roadmap (Months 2-3)

### Month 2: Enhancement
- [ ] Add 2 more LLM models (total 5)
- [ ] Add all 3 prompt types (factual, opinion, recommendation)
- [ ] Implement competitive benchmarking
- [ ] Multiple businesses per user (up to plan limit)
- [ ] Historical trend charts

### Month 3: Growth
- [ ] Weekly automated fingerprints
- [ ] Email notifications (fingerprint complete, Wikidata published)
- [ ] Progressive enrichment workflow
- [ ] Agency plan features (multi-client dashboard)
- [ ] Production Wikidata publishing (after bot approval)

### Month 4+: Scale
- [ ] API access for Agency tier
- [ ] Advanced analytics dashboard
- [ ] Sentiment analysis
- [ ] Content recommendations based on LLM feedback
- [ ] White-label options

---

## 🎯 Decision Framework

### Should Feature X Be in MVP?

Ask these 3 questions:

1. **Does it directly support the core value prop?**
   - ✅ Yes → Consider for MVP
   - ❌ No → Post-MVP

2. **Can we validate demand without it?**
   - ✅ Yes → Post-MVP
   - ❌ No → MVP

3. **How much time will it take?**
   - < 8 hours → Consider for MVP
   - 8-16 hours → Strong justification needed
   - \> 16 hours → Definitely post-MVP

### Example Applications:

| Feature | Q1 | Q2 | Q3 | Decision |
|---------|----|----|----|----|
| LLM Fingerprinting | ✅ | ❌ | 6h | ✅ MVP |
| Wikidata Publishing | ✅ | ❌ | 8h | ✅ MVP |
| Competitive Benchmarking | ❌ | ✅ | 12h | ❌ Post-MVP |
| Historical Trends | ❌ | ✅ | 8h | ❌ Post-MVP |
| Multiple Businesses | ❌ | ✅ | 4h | 🤔 Maybe MVP |

---

## 📋 Week-by-Week Task Breakdown

### Week 1: Core Integration

**Monday:**
- [ ] AM: Fix build errors, test existing integrations
- [ ] PM: Complete dashboard data integration

**Tuesday:**
- [ ] AM: Business list + add business form
- [ ] PM: Business detail page structure

**Wednesday:**
- [ ] AM: Connect web crawler (real data)
- [ ] PM: Test crawl workflow, debug issues

**Thursday:**
- [ ] AM: Wikidata entity builder integration
- [ ] PM: test.wikidata.org publishing setup

**Friday:**
- [ ] AM: OpenRouter setup + basic fingerprinting
- [ ] PM: Display fingerprint results

**Weekend:**
- [ ] Buffer time for debugging
- [ ] Optional: Start payment flow

---

### Week 2: Payment + Polish

**Monday:**
- [ ] AM: Create Stripe products
- [ ] PM: Upgrade button flow

**Tuesday:**
- [ ] AM: Permission gating (free vs pro)
- [ ] PM: Test full upgrade workflow

**Wednesday:**
- [ ] AM: End-to-end manual testing
- [ ] PM: Fix critical bugs

**Thursday:**
- [ ] AM: Edge case handling
- [ ] PM: UI polish (loading states, errors)

**Friday:**
- [ ] AM: Mobile responsiveness check
- [ ] PM: Final testing round

**Weekend:**
- [ ] Code review
- [ ] Documentation updates

---

### Week 3: Launch Prep

**Monday:**
- [ ] AM: Production environment setup
- [ ] PM: Database migration to production

**Tuesday:**
- [ ] AM: Deploy to Vercel
- [ ] PM: Test production site

**Wednesday:**
- [ ] AM: Monitoring + logging setup
- [ ] PM: Landing page content finalization

**Thursday:**
- [ ] AM: Final smoke tests
- [ ] PM: Soft launch to beta users

**Friday:**
- [ ] AM: Monitor for issues
- [ ] PM: Collect feedback, plan iterations

---

## 🎉 Definition of Done (MVP Launch)

### Technical Completeness
- [ ] ✅ Build succeeds with zero errors
- [ ] ✅ All environment variables documented
- [ ] ✅ Database schema deployed to production
- [ ] ✅ Core workflows tested end-to-end

### Feature Completeness
- [ ] ✅ User can sign up and log in
- [ ] ✅ User can add a business
- [ ] ✅ User can crawl a website (gets data)
- [ ] ✅ User can run LLM fingerprint (free tier)
- [ ] ✅ User can upgrade to Pro via Stripe
- [ ] ✅ Pro user can publish to test Wikidata
- [ ] ✅ User sees Wikidata QID when published

### Quality Bar
- [ ] ✅ Zero critical bugs
- [ ] ✅ Error messages are helpful
- [ ] ✅ Loading states show progress
- [ ] ✅ Mobile-responsive (basic)
- [ ] ✅ Works in Chrome, Safari, Firefox

### Business Readiness
- [ ] ✅ Pricing page accurate
- [ ] ✅ Stripe webhooks working
- [ ] ✅ Can accept real payments
- [ ] ✅ Landing page explains value prop
- [ ] ✅ FAQ addresses common questions

### Operational Readiness
- [ ] ✅ Error logging active
- [ ] ✅ Can monitor OpenRouter costs
- [ ] ✅ Can access production database
- [ ] ✅ Know how to debug issues

---

## 🚀 Launch Checklist

### Pre-Launch (Day Before)

**Technical:**
- [ ] Production deploy successful
- [ ] All environment variables set
- [ ] Database migrated
- [ ] SSL certificate active
- [ ] DNS configured

**Testing:**
- [ ] Sign up flow works
- [ ] Payment flow works
- [ ] Crawl workflow works
- [ ] Fingerprint workflow works
- [ ] Wikidata publish works (for Pro users)

**Content:**
- [ ] Landing page reviewed
- [ ] Pricing page accurate
- [ ] Terms of Service + Privacy Policy (basic)
- [ ] Support email configured

**Monitoring:**
- [ ] Sentry (or equivalent) configured
- [ ] Stripe webhooks delivering
- [ ] OpenRouter budget limit set

---

### Launch Day

**Morning:**
- [ ] Final smoke test on production
- [ ] Verify all critical paths work
- [ ] Check error logs (should be empty)

**Announcement:**
- [ ] Share with beta group (email, Slack, Discord)
- [ ] Post on social media (if applicable)
- [ ] Monitor for sign-ups

**Throughout Day:**
- [ ] Respond to support requests immediately
- [ ] Fix critical bugs ASAP
- [ ] Monitor error logs
- [ ] Track conversion funnel

**Evening:**
- [ ] Review metrics (sign-ups, upgrades, errors)
- [ ] Plan hot-fixes if needed
- [ ] Celebrate! 🎉

---

## 📞 Getting Unstuck

### If You're Blocked

**Technical Issues:**
1. Check error logs first
2. Search documentation (Next.js, Drizzle, Stripe)
3. Review existing code (especially `/lib/`)
4. Use Claude/GPT to debug
5. Simplify the problem (remove complexity)

**Scope Creep:**
- Refer back to MVP Feature Matrix
- Ask: "Can we ship without this?"
- If yes → post-MVP backlog

**Time Crunch:**
- Cut features, not quality
- Use more mocks if APIs are slow
- Focus on core workflow only

---

## 💡 Key Principles

### 1. **Ship Fast, Iterate Faster**
Perfect is the enemy of done. Get something in users' hands, learn, improve.

### 2. **Mock Smart**
Don't wait for API approvals. Use realistic mocks, swap later.

### 3. **Prioritize Revenue Features**
Wikidata publishing = paid feature = priority. Trends = nice-to-have = later.

### 4. **Measure Everything**
Can't improve what you don't measure. Set up analytics from day 1.

### 5. **User Feedback > Your Opinion**
Let users tell you what's important. Don't build features nobody wants.

---

## 🎓 Success Criteria

### MVP is "Done" When:

✅ A stranger can:
1. Sign up without help
2. Add their business
3. See a visibility score
4. Understand what Pro offers
5. Upgrade and pay
6. Publish to Wikidata (as Pro user)
7. Know what to do next

✅ You can:
1. Accept payments
2. Monitor costs
3. Debug issues
4. Add new users manually (if needed)
5. Explain the value proposition in 30 seconds

---

## 🎯 Final Recommendation

### Your Most Efficient Path to MVP:

**Option A: Speed First (2 weeks)**
- Week 1: Integration (use lots of mocks)
- Week 2: Payment + deploy
- Validate demand before building everything

**Option B: Quality First (3 weeks)** ⭐ RECOMMENDED
- Week 1: Real integration (actual APIs)
- Week 2: Payment + thorough testing
- Week 3: Polish + launch
- Better user experience, fewer post-launch fires

**Option C: Lean Validation (1 week)**
- Week 1: Only landing page + payment + mock everything else
- Collect pre-orders before building
- Riskier, but fastest to validate demand

### I Recommend Option B

**Why:**
- Real APIs aren't that hard (you already have the code)
- Better to validate with a real product, not smoke & mirrors
- 3 weeks is still fast for a SaaS MVP
- Less technical debt to clean up later

### Start Tomorrow:

1. ✅ **Day 1, Hour 1:** Fix any build errors
2. ✅ **Day 1, Hour 2:** Test dashboard with real data
3. ✅ **Day 1, Hour 3:** Get one business added via the UI
4. ✅ **Day 1, Rest:** Make "Add Business" flow perfect

**Build momentum. Ship in 3 weeks. Change the game.** 🚀

---

**Document Owner:** Development Team  
**Review Cycle:** Weekly during MVP phase  
**Success Metric:** MVP launched by Week 3  
**Updated:** November 10, 2025

