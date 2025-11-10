# Data Access Layer Refactoring Summary

## Overview
The `@data/` folder has been refactored to support the new **competitive leaderboard** feature added to LLM fingerprinting.

## Changes Made

### 1. Updated Types (`lib/data/types.ts`)

#### New DTOs Added:

**CompetitiveLeaderboardDTO**
```typescript
interface CompetitiveLeaderboardDTO {
  targetBusiness: {
    name: string;
    rank: number | null;
    mentionCount: number;
    mentionRate: number;  // Percentage (0-100)
  };
  competitors: CompetitorDTO[];
  totalQueries: number;
  insights: {
    marketPosition: 'leading' | 'competitive' | 'emerging' | 'unknown';
    topCompetitor: string | null;
    competitiveGap: number | null;
    recommendation: string;
  };
}
```

**CompetitorDTO**
```typescript
interface CompetitorDTO {
  rank: number;
  name: string;
  mentionCount: number;
  avgPosition: number;
  appearsWithTarget: number;
  marketShare: number;  // Percentage (0-100)
  badge?: 'top' | 'rising' | 'declining';
}
```

#### Updated DTOs:

**FingerprintDetailDTO**
- Added `competitiveLeaderboard: CompetitiveLeaderboardDTO | null`

### 2. New Adapter (`lib/data/fingerprint-dto.ts`)

Created adapter functions to transform domain objects → DTOs:

#### Main Functions:

1. **`toFingerprintDetailDTO(analysis, previousAnalysis?)`**
   - Transforms `FingerprintAnalysis` → `FingerprintDetailDTO`
   - Calculates trends by comparing to previous analysis
   - Determines top performing models
   - Filters out technical details

2. **`toCompetitiveLeaderboardDTO(leaderboard, businessName)`**
   - Transforms raw leaderboard → `CompetitiveLeaderboardDTO`
   - Calculates market share percentages
   - Adds strategic insights
   - Generates recommendations

#### Helper Functions:

- **`determineMarketPosition()`** - Analyzes competitive position
  - Leading: 60%+ mention rate or most mentioned
  - Competitive: 30-60% mention rate
  - Emerging: <30% mention rate
  - Unknown: No data

- **`generateRecommendation()`** - Creates actionable advice
  - Leading: "Maintain quality and expand content"
  - Competitive: "Consider Wikidata to improve by X mentions"
  - Emerging: "Build online presence, publish to Wikidata"

- **`formatModelName()`** - UI-friendly names
  - `openai/gpt-4-turbo` → `GPT-4 Turbo`
  - `anthropic/claude-3-opus` → `Claude 3 Opus`

- **`calculateTrend()`** - Compares scores
  - Up: +5% or more
  - Down: -5% or more
  - Neutral: within ±5%

## Data Flow

```
Domain Layer (lib/types/gemflush.ts)
    ↓
FingerprintAnalysis {
  businessId, businessName,
  visibilityScore, mentionRate,
  sentimentScore, accuracyScore,
  avgRankPosition,
  llmResults: LLMResult[],
  competitiveLeaderboard: { ... },
  generatedAt
}
    ↓
Adapter (lib/data/fingerprint-dto.ts)
    ↓
toFingerprintDetailDTO()
    ↓
Data Access Layer (lib/data/types.ts)
    ↓
FingerprintDetailDTO {
  visibilityScore, trend,
  summary: { mentionRate, sentiment, topModels, averageRank },
  results: FingerprintResultDTO[],
  competitiveLeaderboard: CompetitiveLeaderboardDTO,
  createdAt: "2 hours ago"
}
    ↓
UI Components (app/(dashboard)/...)
```

## Example Transformation

### Input (Domain):
```typescript
const analysis: FingerprintAnalysis = {
  businessId: 1,
  businessName: "Mother Earth Wellness",
  visibilityScore: 73,
  mentionRate: 77.8,
  sentimentScore: 0.786,
  accuracyScore: 0.70,
  avgRankPosition: 4,
  llmResults: [...],
  competitiveLeaderboard: {
    targetBusiness: {
      name: "Mother Earth Wellness",
      rank: 4,
      mentionCount: 1,
      avgPosition: 4
    },
    competitors: [
      {
        name: "Summit Medical Compassion Center",
        mentionCount: 2,
        avgPosition: 1.5,
        appearsWithTarget: 2
      }
    ],
    totalRecommendationQueries: 3
  },
  generatedAt: new Date()
};
```

### Output (DTO):
```typescript
const dto: FingerprintDetailDTO = {
  visibilityScore: 73,
  trend: 'neutral',
  summary: {
    mentionRate: 78,
    sentiment: 'positive',
    topModels: ['GPT-4 Turbo', 'Claude 3 Opus', 'GPT-3.5 Turbo'],
    averageRank: 4
  },
  results: [
    {
      model: 'GPT-4 Turbo',
      mentioned: true,
      sentiment: 'positive',
      confidence: 70,
      rankPosition: 4
    },
    // ... more results
  ],
  competitiveLeaderboard: {
    targetBusiness: {
      name: "Mother Earth Wellness",
      rank: 4,
      mentionCount: 1,
      mentionRate: 33  // (1/3) * 100
    },
    competitors: [
      {
        rank: 1,
        name: "Summit Medical Compassion Center",
        mentionCount: 2,
        avgPosition: 1.5,
        appearsWithTarget: 2,
        marketShare: 67,  // (2/3) * 100
        badge: 'top'
      }
    ],
    totalQueries: 3,
    insights: {
      marketPosition: 'emerging',
      topCompetitor: "Summit Medical Compassion Center",
      competitiveGap: 1,
      recommendation: "Limited LLM visibility detected. Publishing to Wikidata and building online presence will significantly improve discoverability."
    }
  },
  createdAt: "2 minutes ago"
};
```

## Benefits

### 1. **Clean Separation**
- Domain layer stays focused on business logic
- DTOs provide stable UI contracts
- Adapters handle transformations

### 2. **UI-Friendly Data**
- Formatted timestamps ("2 hours ago")
- Percentage values (78 instead of 0.78)
- Human-readable insights
- Strategic recommendations

### 3. **Security**
- Filters out sensitive data (API keys, raw responses)
- Only exposes necessary fields to UI
- Prevents data leakage

### 4. **Maintainability**
- Changes to domain don't break UI
- Easy to add computed fields
- Clear transformation logic

### 5. **Type Safety**
- Full TypeScript support
- Compile-time checks
- IntelliSense support

## Usage in API Routes

```typescript
// app/api/fingerprint/[id]/route.ts
import { getFingerprintById } from '@/lib/services/fingerprint';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const analysis = await getFingerprintById(params.id);
  const previousAnalysis = await getPreviousFingerprintById(params.id);
  
  const dto = toFingerprintDetailDTO(analysis, previousAnalysis);
  
  return Response.json(dto);
}
```

## Usage in Server Components

```typescript
// app/(dashboard)/dashboard/businesses/[id]/fingerprint/page.tsx
import { getFingerprintForBusiness } from '@/lib/services/fingerprint';
import { toFingerprintDetailDTO } from '@/lib/data/fingerprint-dto';
import { CompetitiveLeaderboard } from '@/components/competitive-leaderboard';

export default async function FingerprintPage({ params }: { params: { id: string } }) {
  const analysis = await getFingerprintForBusiness(params.id);
  const dto = toFingerprintDetailDTO(analysis);
  
  return (
    <div>
      <h1>LLM Fingerprint Analysis</h1>
      <VisibilityScore score={dto.visibilityScore} trend={dto.trend} />
      
      {dto.competitiveLeaderboard && (
        <CompetitiveLeaderboard data={dto.competitiveLeaderboard} />
      )}
    </div>
  );
}
```

## Testing

DTOs should be tested to ensure correct transformations:

```typescript
// lib/data/__tests__/fingerprint-dto.test.ts
import { toFingerprintDetailDTO } from '../fingerprint-dto';

describe('toFingerprintDetailDTO', () => {
  it('should transform analysis to DTO', () => {
    const analysis = createMockAnalysis();
    const dto = toFingerprintDetailDTO(analysis);
    
    expect(dto.visibilityScore).toBe(73);
    expect(dto.summary.mentionRate).toBe(78); // Rounded
    expect(dto.competitiveLeaderboard).not.toBeNull();
  });
  
  it('should calculate market position correctly', () => {
    const analysis = createLeadingAnalysis();
    const dto = toFingerprintDetailDTO(analysis);
    
    expect(dto.competitiveLeaderboard?.insights.marketPosition).toBe('leading');
  });
});
```

## Next Steps

### Future Enhancements:

1. **Historical Trends**
   - Track competitive position over time
   - Show trend charts
   - Alert on significant changes

2. **Competitor Profiles**
   - Link to competitor analysis
   - Track competitor trends
   - Benchmark against industry

3. **Strategic Insights**
   - AI-generated recommendations
   - Industry-specific advice
   - Actionable next steps

4. **Real-time Updates**
   - WebSocket for live data
   - Progressive loading
   - Optimistic UI updates

## Summary

The data access layer has been successfully refactored to support competitive intelligence features while maintaining:

✅ Clean separation of concerns
✅ Type safety throughout
✅ UI-friendly data transformations
✅ Strategic insights and recommendations
✅ Following Next.js best practices

All changes follow the established Data Access Layer pattern from `DATA_ACCESS_LAYER_GUIDE.md`.

