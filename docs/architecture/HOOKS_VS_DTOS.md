# Hooks vs DTOs: Data Flow Architecture

## 🎯 Quick Answer

**DTOs (Data Transfer Objects)** are responsible for sending core logic data to the frontend. They transform backend/domain data into UI-friendly formats.

**Hooks** are React components that fetch DTOs from APIs and manage frontend state.

## 📊 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Server-Side)                         │
│                                                                   │
│  1. Domain Logic (lib/llm/fingerprinter.ts)                     │
│     ↓                                                             │
│     FingerprintAnalysis {                                        │
│       businessId: 686,                                           │
│       visibilityScore: 73,                                       │
│       llmResults: [...15 raw LLM responses...],                  │
│       competitiveLeaderboard: {...complex object...}              │
│     }                                                             │
│                                                                   │
│  2. DTO Transformation (lib/data/fingerprint-dto.ts)            │
│     ↓                                                             │
│     toFingerprintDetailDTO()                                     │
│     • Filters out technical fields                               │
│     • Formats dates ("2 hours ago")                              │
│     • Calculates trends                                          │
│     • Simplifies complex objects                                  │
│     ↓                                                             │
│     FingerprintDetailDTO {                                       │
│       visibilityScore: 73,                                      │
│       trend: "up",                                                │
│       summary: { mentionRate: 78, sentiment: "positive" },      │
│       results: [...simplified...],                                │
│       createdAt: "2 hours ago"                                    │
│     }                                                             │
│                                                                   │
│  3. API Route (app/api/fingerprint/business/[businessId]/route.ts)│
│     ↓                                                             │
│     GET /api/fingerprint/business/686                            │
│     Returns: NextResponse.json(dto)                              │
└─────────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP/JSON
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (Client-Side)                        │
│                                                                   │
│  4. React Hook (lib/hooks/use-business-detail.ts)              │
│     ↓                                                             │
│     const { fingerprint } = useBusinessDetail(686);            │
│     • Fetches DTO from API                                       │
│     • Manages loading/error state                                │
│     • Provides refresh() function                                │
│     • Returns: FingerprintDetailDTO | null                       │
│                                                                   │
│  5. React Component (app/(dashboard)/dashboard/businesses/[id]/page.tsx)│
│     ↓                                                             │
│     <VisibilityIntelCard fingerprint={fingerprint} />          │
│     • Receives DTO from hook                                     │
│     • Renders UI                                                 │
│     • Displays: score, trend, summary                           │
└─────────────────────────────────────────────────────────────────┘
```

## 🔑 Key Differences

### DTOs (Data Transfer Objects)
**Location:** `lib/data/*-dto.ts`  
**Purpose:** Transform backend data → frontend-friendly format

**Responsibilities:**
- ✅ **Transform** domain objects to UI-friendly structures
- ✅ **Filter** out technical/internal fields
- ✅ **Format** data (dates, numbers, strings)
- ✅ **Calculate** derived values (trends, percentages)
- ✅ **Simplify** complex nested objects

**Example:**
```typescript
// lib/data/fingerprint-dto.ts
export function toFingerprintDetailDTO(
  analysis: FingerprintAnalysis  // Raw domain object
): FingerprintDetailDTO {        // UI-friendly DTO
  return {
    visibilityScore: Math.round(analysis.visibilityScore),
    trend: calculateTrend(analysis, previousAnalysis),
    summary: {
      mentionRate: Math.round(analysis.mentionRate),
      sentiment: formatSentiment(analysis.sentimentScore),
      topModels: extractTopModels(analysis.llmResults),
    },
    results: analysis.llmResults.map(simplifyResult),
    createdAt: formatDistanceToNow(analysis.generatedAt),
  };
}
```

**Used in:** API routes (`app/api/**/route.ts`)

### Hooks (React Hooks)
**Location:** `lib/hooks/*.ts`  
**Purpose:** Fetch DTOs and manage frontend state

**Responsibilities:**
- ✅ **Fetch** DTOs from API routes
- ✅ **Manage** loading/error state
- ✅ **Provide** refresh/update functions
- ✅ **Orchestrate** multiple API calls
- ✅ **Handle** client-side state

**Example:**
```typescript
// lib/hooks/use-business-detail.ts
export function useBusinessDetail(businessId: number) {
  const [fingerprint, setFingerprint] = useState<FingerprintDetailDTO | null>(null);
  
  const load = useCallback(async () => {
    // Fetch DTO from API
    const response = await fetch(`/api/fingerprint/business/${businessId}`);
    const dto = await response.json(); // Receives FingerprintDetailDTO
    setFingerprint(dto);
  }, [businessId]);
  
  return { fingerprint, loading, error, refresh: load };
}
```

**Used in:** React components (`app/**/*.tsx`)

## 📋 Which is Responsible for Sending Data?

**DTOs are responsible for sending core logic data to the frontend.**

### Why DTOs?

1. **Separation of Concerns**
   - Backend logic stays in backend
   - Frontend only gets what it needs
   - No exposure of internal implementation

2. **Data Transformation**
   - Domain objects are complex (15 LLM results, nested objects)
   - UI needs simplified data (summary, top 3 models)
   - DTOs bridge this gap

3. **API Contract**
   - DTOs define the API response shape
   - Stable interface even if backend changes
   - Type-safe with TypeScript

### Example: Fingerprint Data Flow

**Backend Domain Object:**
```typescript
// lib/types/gemflush.ts
interface FingerprintAnalysis {
  businessId: 686,
  businessName: "Welcome | Pediatric Dentistry",
  visibilityScore: 73.456,
  llmResults: [
    { model: "openai/gpt-4-turbo", mentioned: true, rawResponse: "..." },
    { model: "anthropic/claude-3-opus", mentioned: true, rawResponse: "..." },
    // ... 13 more results
  ],
  competitiveLeaderboard: {
    targetBusiness: { name: "...", rank: 4, mentionCount: 1 },
    competitors: [...],
    totalRecommendationQueries: 3
  },
  generatedAt: new Date("2025-11-18T16:07:53Z")
}
```

**DTO (What Frontend Receives):**
```typescript
// lib/data/types.ts
interface FingerprintDetailDTO {
  visibilityScore: 73,  // Rounded
  trend: "up",
  summary: {
    mentionRate: 78,   // Calculated percentage
    sentiment: "positive",
    topModels: ["GPT-4 Turbo", "Claude 3 Opus"],  // Top 3 only
    averageRank: 4
  },
  results: [            // Simplified, no rawResponse
    { model: "GPT-4 Turbo", mentioned: true, sentiment: "positive" },
    // ... simplified results
  ],
  competitiveLeaderboard: {
    targetBusiness: { name: "Welcome | Pediatric Dentistry", rank: 4 },
    competitors: [...],
    insights: { marketPosition: "competitive", recommendation: "..." }
  },
  createdAt: "2 hours ago"  // Formatted string
}
```

## 🎯 Summary

| Aspect | DTOs | Hooks |
|--------|-----|-------|
| **Location** | `lib/data/*-dto.ts` | `lib/hooks/*.ts` |
| **Runs On** | Server (API routes) | Client (React components) |
| **Purpose** | Transform backend → frontend data | Fetch & manage frontend state |
| **Responsible For** | ✅ **Sending core logic data** | Fetching & displaying data |
| **Input** | Domain objects, database records | API responses (DTOs) |
| **Output** | DTOs (JSON) | React state (TypeScript) |

## 🔄 Complete Example

```typescript
// 1. BACKEND: Domain logic creates complex object
const analysis = await llmFingerprinter.fingerprint(business);
// analysis: FingerprintAnalysis (complex, 15 LLM results)

// 2. BACKEND: DTO transforms it
const dto = toFingerprintDetailDTO(analysis);
// dto: FingerprintDetailDTO (simplified, UI-friendly)

// 3. BACKEND: API route sends DTO
return NextResponse.json(dto);

// 4. FRONTEND: Hook fetches DTO
const { fingerprint } = useBusinessDetail(686);
// fingerprint: FingerprintDetailDTO | null

// 5. FRONTEND: Component displays DTO
<VisibilityIntelCard fingerprint={fingerprint} />
```

## ✅ Best Practices

1. **DTOs should be in API routes** - Transform data before sending
2. **Hooks should fetch DTOs** - Don't transform in hooks
3. **Components should consume DTOs** - Don't fetch directly
4. **Keep domain logic in backend** - Don't expose internal structures

## 📚 Related Files

- **DTOs:** `lib/data/fingerprint-dto.ts`, `lib/data/wikidata-dto.ts`
- **Hooks:** `lib/hooks/use-business-detail.ts`, `lib/hooks/use-businesses.ts`
- **API Routes:** `app/api/fingerprint/business/[businessId]/route.ts`
- **Components:** `app/(dashboard)/dashboard/businesses/[id]/page.tsx`

