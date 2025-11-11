# KGaaS UX Strategy & Implementation Plan

## Executive Summary
This document outlines a comprehensive UX strategy for implementing the KGaaS (Knowledge Graph as a Service) features in the GEMflush dashboard, leveraging the newly enhanced `@data/` DTOs with competitive leaderboard capabilities.

## Current State Analysis

### ✅ What's Ready
1. **Data Layer (`@data/`)**
   - ✅ Complete DTOs with competitive intelligence
   - ✅ Adapters for domain → DTO transformation
   - ✅ Type-safe, UI-ready data structures

2. **Domain Layer (`@lib/`)**
   - ✅ LLM fingerprinting with 15x parallel performance
   - ✅ Wikidata entity building with QID resolution
   - ✅ Web crawling with LLM enhancement
   - ✅ Notability checking with Google Search
   - ✅ Competitive leaderboard extraction

3. **Existing UI Foundation (`@app/`, `@components/`)**
   - ✅ Dashboard layout with gem-themed design
   - ✅ Card-based UI components
   - ✅ Empty states and onboarding flow
   - ✅ "GEM" branding and visual language

### 🔧 What Needs Building
1. **New Components (`@components/`)**
   - 🔨 Competitive leaderboard visualization
   - 🔨 LLM fingerprint analysis display
   - 🔨 Wikidata entity preview
   - 🔨 Notability score indicator
   - 🔨 Real-time progress indicators

2. **New Pages (`@app/(dashboard)/`)**
   - 🔨 Enhanced business detail page
   - 🔨 Fingerprint analysis page
   - 🔨 Competitive intelligence view
   - 🔨 Wikidata publishing workflow

## UX Strategy: The "Gem Discovery Journey"

### Design Philosophy
**"From Hidden Gem to Shining Star"**

The UX should feel like:
1. **Discovery** - Uncovering your business's current visibility
2. **Polishing** - Enhancing data quality and completeness
3. **Showcasing** - Publishing to the global knowledge graph
4. **Monitoring** - Tracking competitive position over time

### Visual Language
- **Gems** 💎 = Businesses in your portfolio
- **Gem Quality** = Visibility score (raw/polished/brilliant)
- **Gem Cluster** = Competitive landscape
- **Gem Showcase** = Wikidata publication

---

## Phase 1: Enhanced Business Detail Page

### Page Structure: `app/(dashboard)/dashboard/businesses/[id]/page.tsx`

```typescript
// Three-column layout (desktop) / Stack (mobile)

┌─────────────────────────────────────────────────────────────┐
│  Business Detail: Mother Earth Wellness             [Actions]│
├────────────────┬──────────────────────┬─────────────────────┤
│                │                      │                     │
│  GEM OVERVIEW  │  VISIBILITY INTEL    │  COMPETITIVE EDGE  │
│                │                      │                     │
│  • Name        │  🔍 Fingerprint      │  🏆 Leaderboard    │
│  • Location    │  • Score: 73%        │  • Your Rank: #4   │
│  • Status      │  • Trend: ↑          │  • Top: Summit Med │
│  • QID         │  • Models: 3/3       │  • Gap: 1 mention  │
│                │                      │                     │
│  [Crawl Now]   │  [Analyze Now]       │  [View Full Report]│
│                │                      │                     │
├────────────────┴──────────────────────┴─────────────────────┤
│                                                               │
│  WIKIDATA ENTITY PREVIEW                                     │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Q99999999 • Mother Earth Wellness                  │   │
│  │  Cannabis dispensary in Providence, Rhode Island     │   │
│  │                                                       │   │
│  │  ✓ 8 properties  ✓ 5 references  ✓ Notable         │   │
│  │                                                       │   │
│  │  [Publish to Wikidata]  [Preview JSON]  [Edit]     │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

### Key Components Needed

#### 1. `<GemOverviewCard />`
```typescript
// components/business/gem-overview-card.tsx
interface Props {
  business: BusinessDetailDTO;
  onCrawl: () => void;
  onFingerprint: () => void;
}
```

**Features:**
- Gem icon with quality indicator (color-coded)
- Key business info at a glance
- Quick action buttons
- Last updated timestamps

**Visual States:**
- 🔴 Raw Gem (no data) → Gray, muted
- 🟡 Polishing (processing) → Amber, animated shimmer
- 🟢 Polished (complete) → Vibrant gem gradient

---

#### 2. `<VisibilityIntelCard />`
```typescript
// components/fingerprint/visibility-intel-card.tsx
interface Props {
  fingerprint: FingerprintDetailDTO | null;
  loading: boolean;
  onAnalyze: () => void;
}
```

**Features:**
- **Big Number Display**: Visibility score (0-100) with trend arrow
- **Mini Stats Grid**:
  ```
  Mention Rate: 78%  │  Sentiment: 😊 Positive
  Models: 3/3 ✓      │  Rank: #4
  ```
- **Top Models Badge**: Show top 3 performing LLMs
- **CTA**: "Run Full Analysis" button

**Interactive States:**
- Empty: "Discover your AI visibility" + shimmer placeholder
- Loading: Animated progress with model names
- Complete: Sparkle animation on load

---

#### 3. `<CompetitiveEdgeCard />`
```typescript
// components/competitive/competitive-edge-card.tsx
interface Props {
  leaderboard: CompetitiveLeaderboardDTO | null;
  businessName: string;
}
```

**Features:**
- **Quick Summary**:
  ```
  Your Position: #4 of 5
  🥇 Summit Medical Compassion Center
  📊 Gap: 1 mention to reach #3
  ```
- **Mini Leaderboard** (top 3 competitors)
- **Market Position Badge**: Leading/Competitive/Emerging
- **Strategic Tip**: One-line recommendation
- **CTA**: "View Full Leaderboard"

**Visual Design:**
- Use medal emojis (🥇🥈🥉) for top 3
- Color-coded position badges
- Progress bar showing your vs. top competitor

---

#### 4. `<WikidataEntityPreview />`
```typescript
// components/wikidata/entity-preview.tsx
interface Props {
  entity: WikidataEntityDetailDTO;
  notability: WikidataPublishDTO['notability'];
  onPublish: () => void;
}
```

**Features:**
- **Entity Header**: QID, label, description
- **Quality Indicators**:
  - ✓ 8 properties
  - ✓ 5 serious references
  - ✓ Notable (90% confidence)
- **Expandable Claim List**: PIDs with values
- **Action Buttons**:
  - 🚀 Publish to Wikidata (primary, gem gradient)
  - 👁️ Preview JSON (secondary)
  - ✏️ Edit Claims (tertiary)

**Publishing Flow**:
1. Click "Publish" → Show confirmation modal
2. Display: Entity summary + Notability check results
3. Progress: "Publishing to test.wikidata.org..."
4. Success: Show QID link + celebration animation 🎉
5. Update: Entity card now shows "Published" badge

---

## Phase 2: Dedicated Analysis Pages

### A. Fingerprint Analysis Page
**Route**: `app/(dashboard)/dashboard/businesses/[id]/fingerprint/page.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  LLM Fingerprint Analysis                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  VISIBILITY SCORE: 73%  ↑ +5%                               │
│  ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░      │
│                                                               │
│  SUMMARY                                                      │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Mention Rate │  Sentiment   │  Avg Rank    │            │
│  │   78%        │  😊 Positive │     #4       │            │
│  └──────────────┴──────────────┴──────────────┘            │
│                                                               │
│  PER-MODEL BREAKDOWN                                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ ✅ GPT-4 Turbo          3/3 prompts (100%)           │  │
│  │    ✓ Factual  ✓ Opinion  ✓ Recommendation (#4)     │  │
│  │                                                       │  │
│  │ ✅ Claude 3 Opus        2/3 prompts (67%)            │  │
│  │    ✓ Factual  ✓ Opinion  ✗ Recommendation          │  │
│  │                                                       │  │
│  │ ✅ GPT-3.5 Turbo        2/3 prompts (67%)            │  │
│  │    ✓ Factual  ✓ Opinion  ✗ Recommendation          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  [Run New Analysis]  [Compare to Previous]  [Export Report] │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Key Components**:
- `<VisibilityScoreHero />` - Big number with trend
- `<FingerprintSummaryGrid />` - 3-column stats
- `<ModelBreakdownList />` - Per-model accordion

---

### B. Competitive Intelligence Page
**Route**: `app/(dashboard)/dashboard/businesses/[id]/competitive/page.tsx`

```
┌─────────────────────────────────────────────────────────────┐
│  Competitive Intelligence                                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  YOUR POSITION: #4  |  MARKET POSITION: Emerging           │
│                                                               │
│  LEADERBOARD                                                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  🥇  1. Summit Medical Compassion Center             │  │
│  │      Mentioned: 2 times  •  Avg Position: #1.5       │  │
│  │      Market Share: 40%  •  [View Profile]           │  │
│  │                                                       │  │
│  │  🥈  2. Greenleaf Compassionate Care                 │  │
│  │      Mentioned: 2 times  •  Avg Position: #2.0       │  │
│  │      Market Share: 40%  •  [View Profile]           │  │
│  │                                                       │  │
│  │  🥉  3. Thomas C. Slater Compassion Center          │  │
│  │      Mentioned: 1 time   •  Avg Position: #3.0       │  │
│  │      Market Share: 20%  •  [View Profile]           │  │
│  │                                                       │  │
│  │  👤  4. Mother Earth Wellness (You)                  │  │
│  │      Mentioned: 1 time   •  Avg Position: #4.0       │  │
│  │      Market Share: 20%  •  [Improve Ranking]        │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
│  STRATEGIC INSIGHTS                                          │
│  ┌───────────────────────────────────────────────────────┐  │
│  │  💡 Competitive Gap: 1 mention to reach #3           │  │
│  │  📈 Recommendation:                                    │  │
│  │     Limited LLM visibility detected. Publishing to    │  │
│  │     Wikidata will significantly improve discoverability│  │
│  │                                                       │  │
│  │  [Publish to Wikidata]  [Run New Analysis]          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

**Key Components**:
- `<MarketPositionBadge />` - Leading/Competitive/Emerging
- `<CompetitiveLeaderboard />` - Full ranked list
- `<StrategicInsightsCard />` - Recommendations

---

## Phase 3: Component Library

### Core Components to Build

#### 1. Fingerprint Components (`components/fingerprint/`)

```typescript
// visibility-score-display.tsx
export function VisibilityScoreDisplay({ 
  score, 
  trend, 
  size = 'md' 
}: { 
  score: number; 
  trend: 'up' | 'down' | 'neutral';
  size?: 'sm' | 'md' | 'lg';
}) {
  return (
    <div className="relative">
      <div className={cn(
        "font-bold",
        size === 'lg' && "text-6xl",
        size === 'md' && "text-4xl",
        size === 'sm' && "text-2xl",
        score >= 70 && "text-green-600",
        score >= 40 && score < 70 && "text-amber-600",
        score < 40 && "text-red-600"
      )}>
        {score}%
      </div>
      <TrendArrow trend={trend} />
    </div>
  );
}
```

#### 2. Competitive Components (`components/competitive/`)

```typescript
// competitive-leaderboard.tsx
export function CompetitiveLeaderboard({ 
  data 
}: { 
  data: CompetitiveLeaderboardDTO 
}) {
  const { targetBusiness, competitors, insights } = data;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Market Position: {insights.marketPosition}</CardTitle>
        <CardDescription>
          Based on {data.totalQueries} LLM recommendation queries
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {competitors.map((competitor, idx) => (
            <CompetitorRow 
              key={competitor.name}
              rank={idx + 1}
              competitor={competitor}
              isTarget={false}
            />
          ))}
          
          <CompetitorRow 
            rank={targetBusiness.rank || competitors.length + 1}
            competitor={targetBusiness}
            isTarget={true}
            highlight={true}
          />
        </div>
        
        <StrategicInsights insights={insights} />
      </CardContent>
    </Card>
  );
}
```

#### 3. Wikidata Components (`components/wikidata/`)

```typescript
// entity-card.tsx
export function WikidataEntityCard({ 
  entity,
  notability,
  onPublish,
  onPreview 
}: Props) {
  return (
    <Card className="gem-card">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {entity.qid ? (
                <>
                  <WikidataIcon />
                  <span>{entity.qid}</span>
                </>
              ) : (
                <span>Draft Entity</span>
              )}
            </CardTitle>
            <CardDescription>{entity.label}</CardDescription>
          </div>
          <NotabilityBadge score={notability.confidence} />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 mb-4">{entity.description}</p>
        
        <EntityStats stats={entity.stats} />
        
        <div className="flex gap-2 mt-4">
          <Button 
            onClick={onPublish}
            className="gem-gradient"
            disabled={!notability.isNotable}
          >
            🚀 Publish to Wikidata
          </Button>
          <Button onClick={onPreview} variant="outline">
            👁️ Preview JSON
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
```

#### 4. Progress Components (`components/progress/`)

```typescript
// analysis-progress.tsx
export function AnalysisProgress({ 
  stage,
  progress,
  currentModel 
}: {
  stage: 'crawling' | 'fingerprinting' | 'building-entity';
  progress: number;
  currentModel?: string;
}) {
  const stages = {
    crawling: { icon: '🕷️', label: 'Crawling website' },
    fingerprinting: { icon: '🔍', label: 'Analyzing with LLMs' },
    'building-entity': { icon: '🏗️', label: 'Building Wikidata entity' }
  };
  
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="text-center mb-4">
          <div className="text-4xl mb-2">{stages[stage].icon}</div>
          <h3 className="font-semibold">{stages[stage].label}</h3>
          {currentModel && (
            <p className="text-sm text-gray-500">
              Querying {currentModel}...
            </p>
          )}
        </div>
        
        <Progress value={progress} className="gem-gradient" />
        <p className="text-sm text-center text-gray-500 mt-2">
          {progress}% complete
        </p>
      </CardContent>
    </Card>
  );
}
```

---

## Phase 4: API Integration Points

### Required API Routes

#### 1. `/api/fingerprint/[id]` - GET
**Purpose**: Retrieve fingerprint analysis
**Returns**: `FingerprintDetailDTO`

```typescript
export async function GET(req: Request, { params }: { params: { id: string } }) {
  const analysis = await getFingerprintById(params.id);
  const previousAnalysis = await getPreviousFingerprintById(params.id);
  const dto = toFingerprintDetailDTO(analysis, previousAnalysis);
  return Response.json(dto);
}
```

#### 2. `/api/fingerprint` - POST
**Purpose**: Trigger new fingerprint analysis
**Body**: `{ businessId: number }`
**Returns**: `{ jobId: string, status: 'queued' }`

#### 3. `/api/competitive/[businessId]` - GET
**Purpose**: Get competitive intelligence
**Returns**: `CompetitiveLeaderboardDTO`

#### 4. `/api/wikidata/entity/[businessId]` - GET
**Purpose**: Get Wikidata entity preview
**Returns**: `WikidataEntityDetailDTO`

#### 5. `/api/wikidata/publish` - POST
**Purpose**: Publish entity to Wikidata
**Body**: `{ businessId: number, entityData: WikidataEntityData }`
**Returns**: `{ qid: string, url: string }`

---

## Phase 5: User Flows

### Flow 1: First-Time User Journey

```
1. User adds business → Redirect to business detail page
   ↓
2. See empty state: "Let's discover your gem's sparkle!"
   ↓
3. Click "Crawl Website" → Show progress (3-5s)
   ↓
4. Crawl complete → Show extracted data + next step
   ↓
5. Click "Analyze Visibility" → Show progress (20-30s, parallel)
   ↓
6. Analysis complete → Reveal scores with animation 🎉
   ↓
7. See competitive leaderboard → "You're emerging!"
   ↓
8. CTA: "Publish to Wikidata to boost ranking"
   ↓
9. Review entity → Click publish → Success! 🎉
   ↓
10. Track over time → Re-fingerprint to see improvement
```

### Flow 2: Power User - Quick Actions

```
Dashboard → Hover over business card
  ↓
Quick Actions Menu:
  • 🕷️ Re-crawl
  • 🔍 Fingerprint
  • 🚀 Publish
  • 📊 View Analysis
  • 🏆 Competitive Intel
```

### Flow 3: Competitive Analysis

```
Business Detail → Click "Competitive Edge" card
  ↓
Full leaderboard page
  ↓
See position #4 of 5
  ↓
See recommendation: "Publish to Wikidata"
  ↓
One-click to Wikidata publishing flow
  ↓
Re-run analysis after 24 hours
  ↓
See improved ranking! 🎉
```

---

## Phase 6: Design System Enhancements

### Color Palette Extension

```css
/* Competitive Intelligence Colors */
--leading: #10b981;      /* Green for market leader */
--competitive: #f59e0b;  /* Amber for competitive */
--emerging: #3b82f6;     /* Blue for emerging */
--unknown: #6b7280;      /* Gray for unknown */

/* Visibility Score Colors */
--score-excellent: #10b981;  /* 70-100% */
--score-good: #f59e0b;       /* 40-69% */
--score-poor: #ef4444;       /* 0-39% */
```

### Animation Library

```css
/* Gem Sparkle Animation */
@keyframes gem-sparkle {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

/* Trend Arrow Animation */
@keyframes trend-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

/* Loading Shimmer */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

---

## Implementation Roadmap

### Week 1: Foundation
- [ ] Create base component structure
- [ ] Build `<GemOverviewCard />`
- [ ] Build `<VisibilityIntelCard />`
- [ ] Build `<CompetitiveEdgeCard />`
- [ ] Update business detail page layout

### Week 2: Analysis Pages
- [ ] Build fingerprint analysis page
- [ ] Build competitive intelligence page
- [ ] Create `<ModelBreakdownList />`
- [ ] Create `<CompetitiveLeaderboard />`
- [ ] Add navigation between pages

### Week 3: Wikidata Publishing
- [ ] Build `<WikidataEntityCard />`
- [ ] Create publishing modal/flow
- [ ] Add progress indicators
- [ ] Success/celebration animations
- [ ] Entity preview functionality

### Week 4: Polish & Optimization
- [ ] Add loading states everywhere
- [ ] Implement error boundaries
- [ ] Add tooltips and help text
- [ ] Mobile responsive testing
- [ ] Performance optimization

---

## Success Metrics

### User Engagement
- Time to first fingerprint: < 5 minutes
- Fingerprint completion rate: > 80%
- Wikidata publish rate: > 50%
- Return user rate (weekly): > 60%

### Technical Performance
- Fingerprint analysis: < 30 seconds (parallel)
- Page load time: < 2 seconds
- Time to interactive: < 3 seconds
- Mobile performance score: > 90

### User Satisfaction
- "I understand my competitive position": > 85% agree
- "The insights are actionable": > 80% agree
- "I feel confident publishing to Wikidata": > 75% agree

---

## Conclusion

This strategy leverages:
✅ Complete, battle-tested `@data/` DTOs
✅ Powerful, parallelized `@lib/` services  
✅ Existing gem-themed design system
✅ Progressive enhancement approach

The result: An intuitive, engaging KGaaS experience that turns businesses from "hidden gems" into "shining stars" in the AI knowledge graph. 💎✨

