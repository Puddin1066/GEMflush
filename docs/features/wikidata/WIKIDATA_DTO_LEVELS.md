# 🎯 Wikidata DTO Levels: Simple → Rich

**Purpose:** Explains the three levels of Wikidata DTOs and when to use each  
**Date:** November 10, 2025

---

## 📊 **Three Levels of Detail**

Wikidata data has **three different use cases** requiring **three different DTOs**:

```
Level 1: Status        → WikidataStatusDTO          (Dashboard card)
Level 2: Publish       → WikidataPublishDTO         (Publish workflow)
Level 3: Full Details  → WikidataEntityDetailDTO    (Entity details page)
```

---

## 🎚️ **Level 1: WikidataStatusDTO (Simplest)**

### **Use Case:**
Dashboard card showing quick status

### **User Question:**
"Is this business published to Wikidata?"

### **DTO Structure:**
```typescript
interface WikidataStatusDTO {
  qid: string | null;                // "Q123456" or null
  status: 'published' | 'pending' | 'not-started';
  url: string | null;                // Link to Wikidata
  lastChecked: string | null;        // "2 hours ago"
  claimCount: number;                // 8 properties
  notabilityScore: number | null;    // 85/100
}
```

### **UI Display:**
```
┌─────────────────────────────────┐
│ Blue Bottle Coffee              │
│ ✅ Published (Q123456)           │
│ 8 properties • 85/100 quality   │
│ Last checked: 2 hours ago       │
└─────────────────────────────────┘
```

### **Data Size:** ~100 bytes  
### **Complexity:** Minimal  
### **Use:** Dashboard, business cards, lists

---

## 🎚️ **Level 2: WikidataPublishDTO (Moderate)**

### **Use Case:**
Pre-publish validation and decision

### **User Question:**
"Should I publish this business to Wikidata? Why or why not?"

### **DTO Structure:**
```typescript
interface WikidataPublishDTO {
  businessId: number;
  businessName: string;
  entity: {
    label: string;                  // "Blue Bottle Coffee"
    description: string;            // "Specialty coffee roaster..."
    claimCount: number;             // 8
  };
  notability: {
    isNotable: boolean;             // true
    confidence: number;             // 0.9
    reasons: string[];              // ["Strong references", ...]
    seriousReferenceCount: number;  // 5
    topReferences: Array<{
      title: string;
      url: string;
      source: string;
      trustScore: number;
    }>;
  };
  canPublish: boolean;              // true
  recommendation: string;           // "Ready to publish..."
}
```

### **UI Display:**
```
┌─────────────────────────────────────────────────┐
│ Publish to Wikidata                             │
├─────────────────────────────────────────────────┤
│ Entity: Blue Bottle Coffee                      │
│ Description: Specialty coffee roaster...        │
│ Properties: 8                                   │
│                                                 │
│ ✅ Notability Check (90% confidence)            │
│ 5 serious references found:                     │
│ • Wikipedia article (trust: 95/100)             │
│ • Oakland Chamber of Commerce (trust: 85/100)   │
│ • SFGate article (trust: 80/100)                │
│                                                 │
│ ✅ Ready to publish!                            │
│                                                 │
│ [Cancel] [Publish to Wikidata →]               │
└─────────────────────────────────────────────────┘
```

### **Data Size:** ~1-2KB  
### **Complexity:** Moderate  
### **Use:** Publish workflow, pre-publish validation

---

## 🎚️ **Level 3: WikidataEntityDetailDTO (Richest)**

### **Use Case:**
Full entity details page with all properties

### **User Question:**
"Show me everything about this Wikidata entity - all properties, QIDs, PIDs, references"

### **DTO Structure:**
```typescript
interface WikidataEntityDetailDTO {
  qid: string | null;
  label: string;
  description: string;
  wikidataUrl: string | null;
  lastUpdated: string | null;
  
  claims: WikidataClaimDTO[];      // Full property list
  
  stats: {
    totalClaims: number;
    claimsWithReferences: number;
    referenceQuality: 'high' | 'medium' | 'low';
  };
  
  canEdit: boolean;
  editUrl: string | null;
}

interface WikidataClaimDTO {
  pid: string;                     // "P31"
  propertyLabel: string;           // "instance of"
  propertyDescription?: string;    // "class of which this is an instance"
  
  value: string | number | {
    qid: string;                   // "Q4830453"
    label: string;                 // "business"
  };
  valueType: 'item' | 'string' | 'time' | 'quantity' | 'coordinate' | 'url';
  
  references: Array<{
    url: string;
    title: string;
    retrieved?: string;
  }>;
  
  rank: 'preferred' | 'normal' | 'deprecated';
  hasQualifiers: boolean;
}
```

### **UI Display:**
```
┌────────────────────────────────────────────────────────────┐
│ Wikidata Entity: Blue Bottle Coffee (Q123456)             │
├────────────────────────────────────────────────────────────┤
│ Description: Specialty coffee roaster based in Oakland    │
│ Last updated: 3 days ago                                  │
│                                                           │
│ Stats: 8 properties • 7 with references • High quality   │
│                                                           │
│ [Edit on Wikidata →]                                     │
├────────────────────────────────────────────────────────────┤
│ Properties                                                │
├────────────────────────────────────────────────────────────┤
│                                                           │
│ P31: instance of                                          │
│ ├─ Value: business (Q4830453)                            │
│ ├─ References:                                           │
│ │  • https://bluebottlecoffee.com                       │
│ │  • https://opencorporates.com/...                     │
│ └─ Rank: normal                                          │
│                                                           │
│ P571: inception                                           │
│ ├─ Value: 2002                                           │
│ ├─ References:                                           │
│ │  • https://en.wikipedia.org/wiki/Blue_Bottle_Coffee   │
│ └─ Rank: normal                                          │
│                                                           │
│ P159: headquarters location                               │
│ ├─ Value: Oakland (Q17042)                               │
│ ├─ References:                                           │
│ │  • https://bluebottlecoffee.com/about                 │
│ └─ Rank: normal                                          │
│                                                           │
│ P452: industry                                            │
│ ├─ Value: coffee roasting (Q1415443)                     │
│ ├─ No references ⚠️                                      │
│ └─ Rank: normal                                          │
│                                                           │
│ P625: coordinate location                                 │
│ ├─ Value: 37.8044°N, 122.2712°W                          │
│ ├─ References:                                           │
│ │  • https://www.openstreetmap.org/...                  │
│ └─ Rank: normal                                          │
│                                                           │
│ [+ Add Property]                                          │
└────────────────────────────────────────────────────────────┘
```

### **Data Size:** ~5-10KB (depends on claim count)  
### **Complexity:** High  
### **Use:** Entity details page, editing interface

---

## 📋 **Comparison Table**

| Feature | StatusDTO | PublishDTO | EntityDetailDTO |
|---------|-----------|------------|-----------------|
| **QID** | ✅ | ✅ | ✅ |
| **Status** | ✅ | ✅ (via canPublish) | ✅ |
| **Claim count** | ✅ | ✅ | ✅ (detailed) |
| **Notability** | Score only | ✅ Full assessment | ❌ |
| **PIDs** | ❌ | ❌ | ✅ All PIDs |
| **Property labels** | ❌ | ❌ | ✅ Human-readable |
| **QID values** | ❌ | ❌ | ✅ With labels |
| **References** | ❌ | Top 3 only | ✅ All references |
| **Edit link** | ❌ | ❌ | ✅ |
| **Data size** | ~100B | ~1-2KB | ~5-10KB |

---

## 🎯 **When to Use Each DTO**

### **Use WikidataStatusDTO when:**
- ✅ Showing entity in a list/grid
- ✅ Dashboard cards
- ✅ Quick status checks
- ✅ Performance critical (small payload)

### **Use WikidataPublishDTO when:**
- ✅ User is about to publish
- ✅ Need notability validation
- ✅ Showing publish preview
- ✅ Providing publish recommendations

### **Use WikidataEntityDetailDTO when:**
- ✅ Showing full entity page
- ✅ User wants to see all properties
- ✅ Editing interface
- ✅ Detailed entity analysis

---

## 🔄 **Data Flow Examples**

### **Example 1: Dashboard Display**
```typescript
// Dashboard showing 10 businesses
const businesses = await getDashboardDTO(teamId);

businesses.forEach(async (business) => {
  // Level 1: Just status
  const status = await getWikidataStatusDTO(business.id);
  
  // Display: "✅ Published (Q123) • 8 properties"
  <WikidataStatusBadge status={status} />
});
```

### **Example 2: Publish Workflow**
```typescript
// User clicks "Publish to Wikidata"
const publishData = await getWikidataPublishDTO(businessId);

if (!publishData.canPublish) {
  // Show why not
  return <PublishBlockedDialog 
    reasons={publishData.notability.reasons}
    recommendation={publishData.recommendation}
  />;
}

// Show preview and confirm
<PublishConfirmDialog 
  entity={publishData.entity}
  notability={publishData.notability}
  onConfirm={handlePublish}
/>
```

### **Example 3: Entity Details Page**
```typescript
// User views full entity details
const entity = await getWikidataEntityDetailDTO(businessId);

<EntityDetailsPage>
  <EntityHeader 
    qid={entity.qid}
    label={entity.label}
    description={entity.description}
  />
  
  <EntityStats stats={entity.stats} />
  
  <PropertyTable>
    {entity.claims.map(claim => (
      <PropertyRow
        pid={claim.pid}
        label={claim.propertyLabel}
        value={claim.value}
        references={claim.references}
        rank={claim.rank}
      />
    ))}
  </PropertyTable>
  
  {entity.canEdit && (
    <EditButton href={entity.editUrl} />
  )}
</EntityDetailsPage>
```

---

## 🎨 **Progressive Enhancement**

Start simple, add richness as needed:

```
User Journey:

1. Dashboard (WikidataStatusDTO)
   ↓ "Tell me more"
   
2. Business Detail Page (WikidataStatusDTO + stats)
   ↓ "Publish this"
   
3. Publish Preview (WikidataPublishDTO)
   ↓ "Yes, publish"
   
4. Entity Published!
   ↓ "View full entity"
   
5. Entity Details Page (WikidataEntityDetailDTO)
```

---

## 📚 **Implementation Priority**

### **Phase 2.7 (Current):**
- ✅ `WikidataStatusDTO` - Simple status
- ✅ `WikidataPublishDTO` - Publish workflow with notability

### **Phase 3 (Future UI Enhancement):**
- ⏳ `WikidataEntityDetailDTO` - Full entity page
- ⏳ `WikidataPropertySuggestionDTO` - Property suggestions

---

## ✅ **Summary**

**Three DTOs for three purposes:**

1. **WikidataStatusDTO** → "Is it published?" (Dashboard)
2. **WikidataPublishDTO** → "Should I publish?" (Workflow)
3. **WikidataEntityDetailDTO** → "Show me everything" (Details)

**Key Principle:**
> **Start simple (StatusDTO), add detail as user engagement deepens (PublishDTO → EntityDetailDTO)**

This progressive disclosure keeps the UI fast and focused while providing rich detail when users need it.

---

**Related Documents:**
- `lib/data/types.ts` - All DTO definitions
- `DATA_ACCESS_LAYER_GUIDE.md` - Implementation guide
- `DTO_SERVICE_MAPPING.md` - Service → DTO mapping

