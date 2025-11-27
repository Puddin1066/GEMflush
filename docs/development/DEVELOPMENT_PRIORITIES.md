# Development Priorities - Strategic Plan

**Date:** January 2025  
**Purpose:** Prioritized roadmap for codebase development  
**Approach:** Risk-based, dependency-aware, value-driven prioritization

---

## 🎯 Priority Framework

### Priority Levels
- **P0 - BLOCKER**: Prevents all development/testing/deployment
- **P1 - CRITICAL**: Core functionality, high business value, user-facing
- **P2 - HIGH**: Important features, improves quality/UX
- **P3 - MEDIUM**: Nice-to-have improvements, technical debt
- **P4 - LOW**: Future enhancements, optimizations

### Prioritization Criteria
1. **Dependency Impact**: Blocks other work?
2. **Business Value**: Revenue, user experience, core value prop
3. **Risk**: Technical debt, scalability, maintainability
4. **Effort**: Time/complexity vs. value
5. **User Impact**: Visible to end users?

---

## 🔴 P0 - BLOCKERS (Fix Immediately)

### 1. Build System Failure
**Status:** 🔴 BLOCKING  
**Files:** `app/(login)/login.tsx`  
**Impact:**
- ❌ Cannot run `pnpm build`
- ❌ Cannot deploy to production
- ❌ Blocks all testing
- ❌ Prevents development continuation

**Evidence:**
- Multiple documents reference this as critical blocker
- `INTEGRATION_STATUS.md`: "Build error resolution: 0% (BLOCKING)"
- `NEXT_DEVELOPMENT_STEP.md`: "IMMEDIATE BLOCKER (Must Fix First)"

**Solution Options:**
1. Recreate login component (15 min)
2. Downgrade Next.js to stable (30 min)
3. Simplify component temporarily (10 min)

**Estimated Time:** 15-60 minutes  
**Risk:** Blocks ALL progress  
**Priority:** **HIGHEST**

---

### 2. Database Connection in Test Environment
**Status:** 🔴 BLOCKING E2E TESTS  
**Files:** `tests/e2e/*`, `lib/db/drizzle.ts`  
**Impact:**
- ❌ E2E tests cannot run
- ❌ Cannot validate end-to-end workflows
- ❌ Unknown integration bugs
- ❌ Cannot validate production readiness

**Evidence:**
- `TDD_CURRENT_STATUS.md`: "Tests still fail with Runtime PostgresError"
- Multiple E2E test documents reference connection issues
- Environment variables set but connection fails

**Solution:**
- Verify DATABASE_URL format
- Check Supabase firewall/whitelist
- Test connection directly with psql
- Configure connection pooler properly

**Estimated Time:** 1-2 hours  
**Risk:** Cannot validate system integrity  
**Priority:** **HIGHEST**

---

## 🟠 P1 - CRITICAL (Core Functionality)

### 3. TDD Test Coverage - Critical Modules
**Status:** 🟠 LOW COVERAGE  
**Files:** Multiple modules  
**Impact:**
- ⚠️ Unknown bugs in core workflows
- ⚠️ No confidence in refactoring
- ⚠️ Risk of regressions
- ⚠️ Difficult to maintain

**Priority Order (by business impact):**

#### 3a. Wikidata Module (1.61% coverage)
**Files:**
- `lib/wikidata/service.ts` - Main orchestrator
- `lib/wikidata/entity-builder.ts` - Entity creation
- `lib/wikidata/client.ts` - Wikidata API client
- `lib/wikidata/sparql.ts` - QID lookups
- `lib/wikidata/notability-checker.ts` - Notability assessment

**Business Value:** Core revenue feature (Pro tier)  
**Risk:** Publishing failures = lost revenue  
**Estimated Time:** 2-3 days  
**Priority:** **P1 - HIGHEST**

#### 3b. Payments Module (0% coverage)
**Files:**
- `lib/payments/stripe.ts` - Stripe client
- `lib/payments/actions.ts` - Payment actions
- `lib/payments/setup-products.ts` - Product setup

**Business Value:** Revenue collection  
**Risk:** Payment failures = business critical  
**Estimated Time:** 1-2 days  
**Priority:** **P1 - HIGHEST**

#### 3c. LLM Module (6.86% coverage)
**Files:**
- `lib/llm/openrouter-client.ts` - API client
- `lib/llm/parallel-processor.ts` - Parallel processing
- `lib/llm/prompt-generator.ts` - Prompt generation
- `lib/llm/response-analyzer.ts` - Response analysis

**Business Value:** Core value proposition  
**Risk:** Incorrect visibility scores = product failure  
**Estimated Time:** 2-3 days  
**Priority:** **P1 - HIGH**

#### 3d. Crawler Module (4.46% coverage)
**Files:**
- `lib/crawler/index.ts` - Main crawler
- `lib/crawler/firecrawl-client.ts` - Firecrawl integration

**Business Value:** Data collection foundation  
**Risk:** No data = no product value  
**Estimated Time:** 1-2 days  
**Priority:** **P1 - HIGH**

---

### 4. UI/UX Critical Fixes
**Status:** 🟠 INCOMPLETE  
**Evidence:** `UX_CRITICAL_FIXES.md` documents multiple issues

#### 4a. Data Consistency Issues
- Dashboard shows "0/5 businesses" while main content shows "2 businesses"
- **Impact:** Trust and credibility issues
- **Estimated Time:** 2-4 hours
- **Priority:** **P1 - HIGH**

#### 4b. Business Name Display
- All businesses display as "Business" instead of actual names
- **Impact:** Core feature appears broken
- **Estimated Time:** 1-2 hours
- **Priority:** **P1 - HIGH**

#### 4c. Missing Fingerprint Data
- All businesses show "Never" for last fingerprint, "--" for visibility score
- **Impact:** Core value proposition not demonstrated
- **Estimated Time:** 2-4 hours
- **Priority:** **P1 - CRITICAL**

#### 4d. Loading States & Error Handling
- No loading indicators during async operations
- Errors crash the page instead of showing messages
- **Impact:** Poor user experience
- **Estimated Time:** 4-6 hours
- **Priority:** **P1 - HIGH**

---

### 5. Real API Integration
**Status:** 🟠 MOCK ONLY  
**Current:** Mock APIs work for testing  
**Needed:** Production API connections

**Priority Order:**

#### 5a. OpenRouter LLM Integration
**Status:** Mock only  
**Needs:**
- API key setup
- Real model testing
- Error handling for rate limits
- Cost tracking

**Business Value:** Core product functionality  
**Estimated Time:** 1 day  
**Priority:** **P1 - HIGH**

#### 5b. Wikidata Publishing (Production)
**Status:** Mock only  
**Needs:**
- Bot account creation (test.wikidata.org for MVP)
- Authentication setup
- Real publishing validation
- QID assignment verification

**Business Value:** Core revenue feature  
**Estimated Time:** 1-2 days  
**Priority:** **P1 - HIGH**

#### 5c. Real Web Crawler
**Status:** Mock/Cheerio only  
**Needs:**
- Production crawler deployment
- Error handling for blocked sites
- Rate limiting
- Retry logic

**Business Value:** Data quality  
**Estimated Time:** 1 day  
**Priority:** **P1 - MEDIUM**

---

### 6. End-to-End Workflow Testing
**Status:** 🟠 INFRASTRUCTURE BLOCKED  
**Evidence:** `TDD_CURRENT_STATUS.md`, `TDD_BLOCKER.md`

**Needs:**
- Database connection working
- Authentication flow tested
- Full CFP workflow validated
- Edge cases covered

**Business Value:** Production confidence  
**Estimated Time:** 2-3 days  
**Priority:** **P1 - HIGH**

---

## 🟡 P2 - HIGH (Important Improvements)

### 7. Job Queue System
**Status:** 🟡 MOCK ONLY  
**Current:** Fire-and-forget, no real queue  
**Needs:** Background job processing

**MVP Solution (Recommended):**
- Keep current approach for jobs < 30 seconds
- Frontend polling for status
- Store job status in database

**Future Solution:**
- Redis/BullMQ integration
- Proper queue management
- Job retry logic

**Business Value:** Scalability, reliability  
**Estimated Time:** MVP: 4 hours | Future: 2-3 days  
**Priority:** **P2 - MEDIUM** (MVP sufficient for launch)

---

### 8. UI Polish & Professional Finish
**Status:** 🟡 50% COMPLETE  
**Needs:**
- Toast notifications (success/error messages)
- Loading spinners on all async actions
- Error boundaries (graceful failure handling)
- Mobile responsiveness verification
- Accessibility improvements (keyboard nav, screen readers)

**Business Value:** Professional appearance, user trust  
**Estimated Time:** 1-2 days  
**Priority:** **P2 - MEDIUM**

---

### 9. TDD Coverage - Supporting Modules
**Status:** 🟡 PARTIAL  
**Modules:**
- `lib/db/` (75.63% → target 100%)
- `lib/services/` (29.66% → target 100%)
- `lib/utils/` (36.55% → target 100%)
- `lib/validation/` (47.61% → target 100%)
- `lib/auth/` (0% → target 80%+)
- `lib/email/` (0% → target 80%+)

**Business Value:** Maintainability, confidence  
**Estimated Time:** 1-2 weeks  
**Priority:** **P2 - MEDIUM** (after P1 critical modules)

---

### 10. Production Environment Setup
**Status:** 🟡 CONFIGURATION NEEDED  
**Needs:**
- Vercel production deployment
- Production database (Supabase/Neon)
- Environment variables configured
- Stripe production keys
- Domain setup
- SSL certificates

**Business Value:** Launch readiness  
**Estimated Time:** 1 day  
**Priority:** **P2 - HIGH** (before launch)

---

## 🟢 P3 - MEDIUM (Nice-to-Have)

### 11. Advanced Features
**Status:** 🟢 POST-MVP  
**Items:**
- Historical trend tracking
- Competitive benchmarking
- Progressive enrichment
- Multiple businesses per user (beyond plan limits)
- Weekly automated fingerprints

**Business Value:** Differentiation, retention  
**Estimated Time:** 2-4 weeks  
**Priority:** **P3 - LOW** (post-MVP)

---

### 12. Monitoring & Observability
**Status:** 🟢 POST-MVP  
**Needs:**
- Error tracking (Sentry)
- Analytics (PostHog/Mixpanel)
- Performance monitoring
- Database query optimization
- API rate limit monitoring

**Business Value:** Operations, debugging  
**Estimated Time:** 1 week  
**Priority:** **P3 - LOW** (post-MVP)

---

### 13. Performance Optimization
**Status:** 🟢 OPTIMIZATION  
**Areas:**
- Database query optimization
- API response caching
- Image optimization
- Bundle size reduction
- Serverless function cold starts

**Business Value:** User experience, costs  
**Estimated Time:** 1 week  
**Priority:** **P3 - LOW** (post-MVP)

---

## 📊 Prioritized Development Roadmap

### Week 1: Unblock & Critical Foundations

**Day 1-2: Blockers**
- [ ] P0.1: Fix build error in login.tsx (15-60 min)
- [ ] P0.2: Fix database connection for tests (1-2 hours)
- [ ] P1.4c: Fix missing fingerprint data display (2-4 hours)
- [ ] P1.4a: Fix data consistency in dashboard (2-4 hours)

**Day 3-4: Core Functionality**
- [ ] P1.4b: Fix business name display (1-2 hours)
- [ ] P1.4d: Add loading states & error handling (4-6 hours)
- [ ] P1.3c: TDD tests for LLM module (2-3 days, start)

**Day 5: Integration Testing**
- [ ] P1.6: Set up E2E testing infrastructure (1 day)
- [ ] Validate core workflows work end-to-end

### Week 2: Production Readiness

**Day 6-8: Critical Tests**
- [ ] P1.3a: TDD tests for Wikidata module (2-3 days)
- [ ] P1.3b: TDD tests for Payments module (1-2 days)

**Day 9-10: Real APIs**
- [ ] P1.5a: OpenRouter LLM integration (1 day)
- [ ] P1.5b: Wikidata publishing setup (1-2 days)

**Day 11-12: Polish & Deploy**
- [ ] P2.8: UI polish (1-2 days)
- [ ] P2.10: Production environment setup (1 day)

**Day 13-14: Launch Prep**
- [ ] Final testing
- [ ] Bug fixes
- [ ] Documentation
- [ ] Launch! 🚀

### Week 3+: Post-MVP

- [ ] P2.9: TDD coverage for supporting modules
- [ ] P2.7: Proper job queue system (future)
- [ ] P3 items: Advanced features, monitoring, optimization

---

## 🎯 Success Metrics

### MVP Launch Criteria

**Must Have (P0 + P1 Critical):**
- ✅ Build succeeds
- ✅ E2E tests pass
- ✅ Core workflows functional
- ✅ UI shows correct data
- ✅ Loading/error states work
- ✅ Real LLM fingerprints work
- ✅ Wikidata publishing works (test)
- ✅ Stripe payments work

**Should Have (P1 + P2 High):**
- ✅ TDD tests for critical modules
- ✅ UI polish complete
- ✅ Production environment ready
- ✅ Error tracking configured

**Nice to Have (P2 + P3):**
- ✅ Advanced features
- ✅ Performance optimizations
- ✅ Full TDD coverage

---

## 💡 Decision Framework

### When to Defer

**Defer if:**
- Doesn't block other work
- Low user visibility
- Can be added post-MVP
- High effort, low value

**Don't Defer if:**
- Blocks other work (P0)
- Core functionality (P1)
- Revenue-critical (payments, publishing)
- User-facing bugs

### When to Prioritize

**Prioritize:**
1. Blockers first (P0)
2. Critical tests before features (catch bugs early)
3. User-visible improvements (UX, data accuracy)
4. Revenue-critical features (payments, publishing)

---

## 📝 Quick Reference

### Immediate Actions (Next 24 Hours)

1. **Fix build error** (P0.1) - 15-60 min
2. **Fix database connection** (P0.2) - 1-2 hours
3. **Fix fingerprint data display** (P1.4c) - 2-4 hours
4. **Fix dashboard data consistency** (P1.4a) - 2-4 hours

### This Week (Next 5 Days)

1. Complete P0 blockers
2. Complete P1.4 UI/UX fixes
3. Start P1.3 TDD tests for critical modules
4. Set up P1.6 E2E testing

### This Month (Next 4 Weeks)

1. Complete all P1 items
2. Complete P2 high-priority items
3. Launch MVP
4. Begin post-MVP improvements

---

## 🔗 Related Documentation

- **NEXT_DEVELOPMENT_STEP.md** - Detailed next steps
- **MVP_DEVELOPMENT_ROADMAP.md** - Overall MVP plan
- **INTEGRATION_STATUS.md** - Current integration status
- **UX_CRITICAL_FIXES.md** - Known UX issues
- **TDD_COVERAGE_ANALYSIS.md** - Test coverage analysis
- **TDD_DATABASE_INTEGRATION_GUIDE.md** - Database integration guide

---

**Remember:** 
- Fix blockers first (P0)
- Build quality foundation (P1)
- Polish for launch (P2)
- Optimize later (P3)

**Focus:** Ship MVP fast, iterate based on user feedback.



