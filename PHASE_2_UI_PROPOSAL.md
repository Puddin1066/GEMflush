# Phase 2: UI Implementation Proposal

**Date:** November 10, 2025  
**Status:** 📝 Proposal  
**Prerequisite:** Phase 2 backend complete ✅

---

## 🎯 **Goal**

Make the **Wikidata notability checker visible and testable** in the UI before deploying to Vercel.

**Problem:** Backend features exist but users can't see or interact with them.

**Solution:** Add minimal UI to display notability status, references, and publishing controls.

---

## 📊 **Current Architecture**

### **Backend (Complete)** ✅
```
User Action → API Route → Wikidata DTO → Notability Checker
                                              ↓
                                        Google Search API
                                              ↓
                                        LLM Assessment
                                              ↓
                                        Return Result
```

### **Frontend (Missing)** ❌
```
No UI to:
- Trigger notability check
- Display assessment results
- Show references
- Guide user on next steps
```

---

## 🎨 **UI Implementation Strategy**

### **Phase 2A: Minimal Viable UI** (Recommended First)
**Time:** 1-2 hours  
**Goal:** Make feature visible and testable

### **Phase 2B: Enhanced UX** (After testing with real data)
**Time:** 3-4 hours  
**Goal:** Production-quality user experience

---

## 📁 **File Structure**

### **New Files to Create:**
```
app/(dashboard)/dashboard/businesses/[id]/
├── page.tsx                           (UPDATE: Add Wikidata section)
└── components/
    ├── wikidata-publish-card.tsx     (NEW: Main publishing UI)
    ├── notability-status.tsx         (NEW: Status indicator)
    ├── reference-list.tsx            (NEW: Display references)
    └── publish-button.tsx            (NEW: Action button)
```

### **Existing Files to Reference:**
```
lib/data/wikidata-dto.ts              (DTO provides data)
lib/data/types.ts                     (WikidataPublishDTO type)
app/api/wikidata/publish/route.ts     (API endpoint)
```

---

## 🎨 **Phase 2A: Minimal Viable UI**

### **1. Business Detail Page Layout**

**File:** `app/(dashboard)/dashboard/businesses/[id]/page.tsx`

**Current State:** Likely doesn't exist or is minimal

**Proposed Structure:**
```tsx
export default async function BusinessDetailPage({ 
  params 
}: { 
  params: { id: string } 
}) {
  const businessId = parseInt(params.id);
  
  // Fetch business data
  const business = await getBusinessById(businessId);
  
  if (!business) {
    notFound();
  }
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Business Header */}
      <BusinessHeader business={business} />
      
      {/* Business Details Card */}
      <BusinessDetailsCard business={business} />
      
      {/* Crawl Status Card */}
      {business.status === 'crawled' && (
        <CrawlDataCard businessId={businessId} />
      )}
      
      {/* Wikidata Publishing Card - NEW */}
      {business.status === 'crawled' || business.status === 'published' ? (
        <WikidataPublishCard businessId={businessId} />
      ) : null}
      
      {/* Fingerprint History */}
      <FingerprintHistoryCard businessId={businessId} />
    </div>
  );
}
```

**Key Points:**
- Server Component (can fetch data directly)
- Only show Wikidata card if business is crawled
- Progressive disclosure pattern

---

### **2. Wikidata Publish Card Component**

**File:** `app/(dashboard)/dashboard/businesses/[id]/components/wikidata-publish-card.tsx`

**Purpose:** Main container for Wikidata publishing feature

```tsx
'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { NotabilityStatus } from './notability-status';
import { ReferenceList } from './reference-list';
import { PublishButton } from './publish-button';
import type { WikidataPublishDTO } from '@/lib/data/types';

interface WikidataPublishCardProps {
  businessId: number;
}

export function WikidataPublishCard({ businessId }: WikidataPublishCardProps) {
  const [data, setData] = useState<WikidataPublishDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch notability data
  useEffect(() => {
    async function checkNotability() {
      try {
        setLoading(true);
        
        // Call a new GET endpoint to check notability without publishing
        const response = await fetch(`/api/wikidata/check-notability?businessId=${businessId}`);
        
        if (!response.ok) {
          throw new Error('Failed to check notability');
        }
        
        const result = await response.json();
        setData(result);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }
    
    checkNotability();
  }, [businessId]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wikidata Publishing</CardTitle>
          <CardDescription>Checking notability standards...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Wikidata Publishing</CardTitle>
          <CardDescription>Unable to check notability</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-red-600">{error || 'Unknown error'}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Wikidata Publishing</CardTitle>
        <CardDescription>
          {data.canPublish 
            ? 'Ready to publish to Wikidata' 
            : 'Not ready for publication'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notability Status */}
        <NotabilityStatus notability={data.notability} />
        
        {/* Entity Preview */}
        <div>
          <h4 className="text-sm font-medium mb-2">Entity Preview</h4>
          <div className="text-sm space-y-1 text-gray-600">
            <p><strong>Label:</strong> {data.entity.label}</p>
            <p><strong>Description:</strong> {data.entity.description}</p>
            <p><strong>Claims:</strong> {data.entity.claimCount} properties</p>
          </div>
        </div>
        
        {/* References (if available) */}
        {data.notability.topReferences.length > 0 && (
          <ReferenceList references={data.notability.topReferences} />
        )}
        
        {/* Recommendation */}
        <div className="p-4 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">{data.recommendation}</p>
        </div>
        
        {/* Publish Button */}
        <PublishButton 
          businessId={businessId}
          canPublish={data.canPublish}
          entityLabel={data.entity.label}
        />
      </CardContent>
    </Card>
  );
}
```

**Key Features:**
- Client Component (needs interactivity)
- Fetches notability data on mount
- Loading and error states
- Displays all key information
- Reusable sub-components

---

### **3. Notability Status Component**

**File:** `app/(dashboard)/dashboard/businesses/[id]/components/notability-status.tsx`

```tsx
import { CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

interface NotabilityStatusProps {
  notability: {
    isNotable: boolean;
    confidence: number;
    reasons: string[];
    seriousReferenceCount: number;
  };
}

export function NotabilityStatus({ notability }: NotabilityStatusProps) {
  const { isNotable, confidence, reasons, seriousReferenceCount } = notability;
  
  // Determine status color and icon
  const getStatusConfig = () => {
    if (!isNotable) {
      return {
        icon: XCircle,
        color: 'text-red-600',
        bgColor: 'bg-red-50',
        label: 'Not Notable',
      };
    }
    
    if (confidence >= 0.8) {
      return {
        icon: CheckCircle2,
        color: 'text-green-600',
        bgColor: 'bg-green-50',
        label: 'Notable (High Confidence)',
      };
    }
    
    return {
      icon: AlertCircle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      label: 'Notable (Review Recommended)',
    };
  };
  
  const config = getStatusConfig();
  const Icon = config.icon;
  
  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Notability Assessment</h4>
      
      <div className={`p-4 rounded-lg ${config.bgColor} space-y-3`}>
        {/* Status Header */}
        <div className="flex items-center gap-3">
          <Icon className={`h-5 w-5 ${config.color}`} />
          <div>
            <p className={`font-medium ${config.color}`}>{config.label}</p>
            <p className="text-sm text-gray-600">
              {seriousReferenceCount} serious reference{seriousReferenceCount !== 1 ? 's' : ''} found
            </p>
          </div>
        </div>
        
        {/* Confidence Bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-600 mb-1">
            <span>Confidence</span>
            <span>{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all ${
                confidence >= 0.7 ? 'bg-green-500' : 'bg-red-500'
              }`}
              style={{ width: `${confidence * 100}%` }}
            />
          </div>
        </div>
        
        {/* Reasons (if not notable) */}
        {reasons.length > 0 && (
          <div className="pt-2 border-t border-gray-200">
            <p className="text-xs font-medium text-gray-700 mb-1">Issues:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              {reasons.map((reason, idx) => (
                <li key={idx}>• {reason}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Key Features:**
- Visual status indicator (icon + color)
- Confidence bar visualization
- Lists issues when not notable
- Responsive design
- Follows DRY (config object pattern)

---

### **4. Reference List Component**

**File:** `app/(dashboard)/dashboard/businesses/[id]/components/reference-list.tsx`

```tsx
import { ExternalLink } from 'lucide-react';

interface Reference {
  title: string;
  url: string;
  source: string;
  trustScore: number;
}

interface ReferenceListProps {
  references: Reference[];
}

export function ReferenceList({ references }: ReferenceListProps) {
  return (
    <div>
      <h4 className="text-sm font-medium mb-3">Top References</h4>
      <div className="space-y-3">
        {references.map((ref, idx) => (
          <div 
            key={idx}
            className="p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <a 
                  href={ref.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-blue-600 hover:underline flex items-center gap-1"
                >
                  {ref.title}
                  <ExternalLink className="h-3 w-3 flex-shrink-0" />
                </a>
                <p className="text-xs text-gray-500 mt-1">{ref.source}</p>
              </div>
              
              {/* Trust Score Badge */}
              <div className="flex-shrink-0">
                <div className={`px-2 py-1 rounded text-xs font-medium ${
                  ref.trustScore >= 80 
                    ? 'bg-green-100 text-green-700'
                    : ref.trustScore >= 60
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-red-100 text-red-700'
                }`}>
                  {ref.trustScore}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <p className="text-xs text-gray-500 mt-2">
        Trust scores indicate source reliability (0-100)
      </p>
    </div>
  );
}
```

**Key Features:**
- Displays top 3 references
- Trust score badges with color coding
- External link icon
- Clickable links to sources
- Accessible and semantic HTML

---

### **5. Publish Button Component**

**File:** `app/(dashboard)/dashboard/businesses/[id]/components/publish-button.tsx`

```tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface PublishButtonProps {
  businessId: number;
  canPublish: boolean;
  entityLabel: string;
}

export function PublishButton({ businessId, canPublish, entityLabel }: PublishButtonProps) {
  const [publishing, setPublishing] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    qid?: string;
  } | null>(null);

  const handlePublish = async () => {
    if (!canPublish) return;
    
    // Confirmation dialog
    const confirmed = window.confirm(
      `Publish "${entityLabel}" to Wikidata?\n\nThis will create a public entity on test.wikidata.org.`
    );
    
    if (!confirmed) return;
    
    try {
      setPublishing(true);
      setResult(null);
      
      const response = await fetch('/api/wikidata/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId,
          publishToProduction: false, // Test instance for now
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Publication failed');
      }
      
      setResult({
        success: true,
        message: `Successfully published to ${data.publishedTo}`,
        qid: data.qid,
      });
      
      // Reload page after 2 seconds to show updated status
      setTimeout(() => window.location.reload(), 2000);
      
    } catch (err) {
      setResult({
        success: false,
        message: err instanceof Error ? err.message : 'Unknown error',
      });
    } finally {
      setPublishing(false);
    }
  };

  if (result) {
    return (
      <div className={`p-4 rounded-lg ${
        result.success ? 'bg-green-50' : 'bg-red-50'
      }`}>
        <div className="flex items-start gap-3">
          {result.success ? (
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          )}
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              result.success ? 'text-green-900' : 'text-red-900'
            }`}>
              {result.message}
            </p>
            {result.qid && (
              <a
                href={`https://test.wikidata.org/wiki/${result.qid}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-1 inline-block"
              >
                View on Wikidata: {result.qid}
              </a>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <Button
      onClick={handlePublish}
      disabled={!canPublish || publishing}
      className="w-full"
      variant={canPublish ? 'default' : 'outline'}
    >
      {publishing ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Publishing...
        </>
      ) : canPublish ? (
        'Publish to Wikidata (Test)'
      ) : (
        'Cannot Publish - Improve Notability'
      )}
    </Button>
  );
}
```

**Key Features:**
- Confirmation dialog before publishing
- Loading state during API call
- Success/error result display
- Auto-reload after success
- Disabled state when can't publish
- Test instance by default (safety)

---

## 🔌 **New API Endpoint Required**

### **6. Check Notability Endpoint (GET)**

**File:** `app/api/wikidata/check-notability/route.ts` (NEW)

**Purpose:** Non-destructive notability check (doesn't publish)

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { getUser, getTeamForUser } from '@/lib/db/queries';
import { getWikidataPublishDTO } from '@/lib/data/wikidata-dto';

/**
 * GET /api/wikidata/check-notability
 * Check if business meets notability standards without publishing
 */
export async function GET(request: NextRequest) {
  try {
    // Auth check
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const team = await getTeamForUser();
    if (!team) {
      return NextResponse.json({ error: 'No team found' }, { status: 404 });
    }

    // Get businessId from query params
    const { searchParams } = new URL(request.url);
    const businessIdStr = searchParams.get('businessId');
    
    if (!businessIdStr) {
      return NextResponse.json(
        { error: 'businessId required' },
        { status: 400 }
      );
    }
    
    const businessId = parseInt(businessIdStr, 10);
    
    if (isNaN(businessId)) {
      return NextResponse.json(
        { error: 'Invalid businessId' },
        { status: 400 }
      );
    }

    // Get notability data via DTO
    const publishData = await getWikidataPublishDTO(businessId);
    
    // Return DTO (without fullEntity - not needed for display)
    return NextResponse.json({
      businessId: publishData.businessId,
      businessName: publishData.businessName,
      entity: publishData.entity,
      notability: publishData.notability,
      canPublish: publishData.canPublish,
      recommendation: publishData.recommendation,
    });
    
  } catch (error) {
    console.error('Error checking notability:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
```

**Key Features:**
- GET endpoint (safe, idempotent)
- Returns DTO data without publishing
- Proper auth and validation
- Error handling

---

## 📱 **Responsive Design Considerations**

### **Mobile View:**
- Stack cards vertically
- Collapse reference details
- Larger touch targets for buttons
- Readable text sizes (14px+)

### **Desktop View:**
- Side-by-side layout where appropriate
- More detailed information visible
- Hover states on interactive elements

### **Accessibility:**
- Semantic HTML (headings, lists, buttons)
- ARIA labels where needed
- Keyboard navigation support
- Color contrast ratios (WCAG AA)

---

## 🧪 **Testing Strategy**

### **Manual Testing Checklist:**

**Scenario 1: Notable Business**
- [ ] Status shows green checkmark
- [ ] Confidence bar shows high percentage
- [ ] References list displays
- [ ] Trust scores visible
- [ ] Publish button enabled
- [ ] Clicking publishes successfully
- [ ] Success message shows with QID

**Scenario 2: Not Notable Business**
- [ ] Status shows red X
- [ ] Reasons list displays
- [ ] Recommendation shows
- [ ] Publish button disabled
- [ ] Error message is actionable

**Scenario 3: API Errors**
- [ ] Loading state shows
- [ ] Error message displays
- [ ] Retry mechanism works
- [ ] No white screen of death

**Scenario 4: Rate Limit Hit**
- [ ] Graceful error message
- [ ] Explains daily limit
- [ ] Suggests trying later

---

## 🎯 **Implementation Order**

### **Step 1: Create API Endpoint** (15 min)
```
app/api/wikidata/check-notability/route.ts
```
- Test with curl/Postman first
- Verify DTO returns correctly

### **Step 2: Create Sub-Components** (30 min)
```
notability-status.tsx
reference-list.tsx  
publish-button.tsx
```
- Build in isolation
- Use mock data initially

### **Step 3: Create Main Card** (20 min)
```
wikidata-publish-card.tsx
```
- Integrate sub-components
- Add loading/error states

### **Step 4: Integrate into Page** (15 min)
```
app/(dashboard)/dashboard/businesses/[id]/page.tsx
```
- Add card to layout
- Test with real business ID

### **Step 5: End-to-End Testing** (20 min)
- Test with real business
- Verify Google API calls work
- Check LLM responses
- Confirm publishing works

**Total: ~1.5-2 hours**

---

## 📊 **Before & After**

### **Before Phase 2 UI:**
```
Business Detail Page:
├─ Business Info
├─ Crawl Data
└─ Fingerprint History

❌ No way to publish to Wikidata
❌ No notability visibility
❌ Backend feature unusable
```

### **After Phase 2 UI:**
```
Business Detail Page:
├─ Business Info
├─ Crawl Data
├─ Wikidata Publishing          ← NEW
│  ├─ Notability Status
│  ├─ Entity Preview
│  ├─ Top References
│  ├─ Recommendation
│  └─ Publish Button
└─ Fingerprint History

✅ Visual notability check
✅ Reference quality display
✅ One-click publishing
✅ Test instance safety
```

---

## 🚀 **Deployment Readiness**

### **After Phase 2A UI:**
✅ Feature visible in UI  
✅ Can test with real data  
✅ Notability checker validated  
✅ Publishing workflow complete  
✅ Error handling visible  
✅ **Ready for Vercel deployment**

---

## 💡 **Future Enhancements (Phase 2B)**

### **When to Implement:**
- After testing with real users
- After gathering feedback
- When prioritizing UX polish

### **Possible Improvements:**
1. **Publishing Wizard**
   - Step 1: Review entity
   - Step 2: Check notability
   - Step 3: Confirm & publish

2. **Reference Visualization**
   - Trust score charts
   - Source type breakdown
   - Timeline of references

3. **Historical Publishing**
   - Show past publications
   - Version history
   - Edit tracking

4. **Batch Publishing**
   - Publish multiple businesses
   - Bulk notability check
   - Queue management

5. **Advanced Recommendations**
   - Specific actions to improve notability
   - Links to potential sources
   - Progress tracking

---

## ✅ **Summary**

**Recommended Approach:**

1. ✅ **Implement Phase 2A** (1.5-2 hours)
   - Minimal UI to make feature visible
   - Test with real data
   - Deploy to Vercel

2. ⏳ **Gather Real Usage Data**
   - See which businesses are notable
   - Identify pain points
   - Collect user feedback

3. ⏳ **Iterate with Phase 2B** (as needed)
   - Enhance UX based on data
   - Add polish and advanced features
   - Optimize workflows

**This follows:**
- ✅ DRY (reusable components)
- ✅ SOLID (separation of concerns)
- ✅ Progressive disclosure (DTO supports it)
- ✅ Next.js best practices (Server + Client Components)
- ✅ Lean MVP philosophy (ship, test, iterate)

**Ready to implement Phase 2A?** 🎨

