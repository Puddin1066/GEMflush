# Data Flow Schematic: Quick Reference

**Date:** January 2025  
**Purpose:** Visual reference for data flow patterns

---

## 🎯 Complete Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          DATA GENERATION (WRITE)                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│  External APIs  │
│                 │
│ • Firecrawl     │
│ • OpenRouter    │
│ • Wikidata      │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   LIBRARIES     │  ← Pure functions, no side effects
│   (lib/)        │
│                 │
│ • crawler/      │  crawlWebsite() → Returns data
│ • llm/          │  fingerprint() → Returns scores
│ • wikidata/     │  buildEntity() → Returns entity
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   SERVICES      │  ← Orchestrate + write to DB
│ (lib/services/) │
│                 │
│ • business-     │  executeCrawlJob()
│   execution.ts  │    ├── Calls crawler library
│                 │    └── Writes to database
│ • cfp-auto-     │  executeCFPAutomation()
│   mation.ts     │    └── Orchestrates workflow
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  DB QUERIES     │  ← Database access layer
│ (lib/db/)       │
│                 │
│ • queries.ts    │  updateBusiness()
│ • schema.ts     │  createFingerprint()
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   DATABASE      │  ← Single source of truth
│  (PostgreSQL)   │
│                 │
│ • businesses    │
│ • llmFinger-    │
│   prints        │
│ • crawlJobs     │
│ • wikidata-     │
│   Entities      │
└─────────────────┘


┌─────────────────────────────────────────────────────────────────────────────┐
│                        DATA RETRIEVAL (READ)                                  │
└─────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┐
│   DATABASE      │
│  (PostgreSQL)   │
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│  DB QUERIES     │  ← Raw database access
│ (lib/db/)       │
│                 │
│ • queries.ts    │  getBusinessesByTeam()
│                 │  getLatestFingerprint()
└────────┬────────┘
         │
         ↓
┌─────────────────┐
│   DTO LAYER     │  ← Data transformation
│  (lib/data/)    │
│                 │
│ • dashboard-    │  getDashboardDTO()
│   dto.ts        │    ├── Formats dates
│                 │    ├── Calculates trends
│                 │    └── Returns DTO
└────────┬────────┘
         │
         ├─────────────────┬─────────────────┐
         ↓                 ↓                 ↓
┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
│   API ROUTES    │ │   SERVER     │ │   HOOKS      │
│  (app/api/)     │ │ COMPONENTS   │ │  (lib/hooks/)│
│                 │ │ (app/...)   │ │              │
│ GET /api/       │ │ async page() │ │ useDashboard()│
│   business      │ │              │ │              │
└────────┬────────┘ └──────┬───────┘ └──────┬───────┘
         │                 │                 │
         │                 │                 │
         └─────────────────┴─────────────────┘
                           │
                           ↓
                  ┌─────────────────┐
                  │    FRONTEND     │
                  │                 │
                  │ • Client        │
                  │   Components    │
                  │ • Server-       │
                  │   rendered HTML │
                  └─────────────────┘
```

---

## 🔄 Key Data Flows

### **Flow 1: Business Creation & Processing**

```
User creates business
    ↓
POST /api/business
    ↓
createBusiness() → INSERT businesses
    ↓
executeCFPAutomation()
    ├── executeCrawlJob()
    │     ├── crawler.crawlWebsite()
    │     └── updateBusiness(crawlData)
    │
    └── executeFingerprint()
          ├── llm.fingerprint()
          └── createFingerprint()
    ↓
Database updated
```

### **Flow 2: Dashboard Data Display**

```
User visits dashboard
    ↓
Client Component: useDashboard()
    ↓
fetch('/api/business')
    ↓
API Route: GET /api/business
    ↓
getDashboardDTO(teamId)
    ├── getBusinessesByTeam(teamId)
    ├── getLatestFingerprint(businessId)
    └── transformBusinessToDTO()
    ↓
Returns DashboardDTO
    ↓
Frontend renders UI
```

### **Flow 3: Server Component Rendering**

```
User visits /dashboard/businesses/[id]
    ↓
Server Component: page.tsx
    ↓
[Current] Direct DB query
    OR
[Ideal] getBusinessDetailDTO(businessId)
    ↓
Renders server-side HTML
    ↓
Browser receives HTML
```

---

## 📊 Layer Responsibilities

| Layer | Responsibility | Side Effects? | Example |
|-------|---------------|---------------|---------|
| **Libraries** | Generate data | ❌ No | `crawler.crawlWebsite()` |
| **Services** | Orchestrate + write | ✅ Yes | `executeCrawlJob()` |
| **DB Queries** | Database access | ✅ Yes | `updateBusiness()` |
| **Database** | Store data | N/A | PostgreSQL tables |
| **DTO Layer** | Transform data | ❌ No | `getDashboardDTO()` |
| **API Routes** | HTTP handlers | ❌ No | `GET /api/business` |
| **Components** | Render UI | ❌ No | `<DashboardPage />` |

---

## ✅ Best Practices

### **✅ DO:**
- Use libraries for data generation (pure functions)
- Use services for orchestration
- Use DTO layer for data transformation
- Use database as single source of truth

### **❌ DON'T:**
- Don't write to database from libraries
- Don't skip DTO layer in Server Components
- Don't do data transformation in components
- Don't query database directly in components

---

## 🔍 Current vs Ideal

### **Current Pattern (Mixed)**
```
Server Component
    ├── Direct DB query ❌ (inconsistent)
    └── OR DTO layer ✅ (good)
```

### **Ideal Pattern (Consistent)**
```
Server Component
    └── Always use DTO layer ✅
```

---

## 📝 Quick Reference

**Data Generation:**
```
Libraries → Services → Database
```

**Data Retrieval:**
```
Database → DB Queries → DTO Layer → API/Components → Frontend
```

**Key Principle:**
```
Database is single source of truth
DTO layer transforms for UI
Components consume transformed data
```


