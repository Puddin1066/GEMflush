# SPARQL Service Fix Proposal

**Date**: January 2025  
**File**: `lib/wikidata/sparql.ts`  
**Issue**: SPARQL queries may not work correctly with Wikidata endpoint

---

## 🔍 **Current Implementation Issues**

### 1. **HTTP Method & Content Type**
**Current Code** (Line 416-425):
```typescript
const response = await fetch(this.endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/sparql-query',
    'Accept': 'application/json',
    'User-Agent': 'GEMflush/1.0 (https://gemflush.com)',
  },
  body: query,
});
```

**Problem**: Wikidata SPARQL endpoint expects:
- **GET** with query parameter: `?query=...&format=json`
- **POST** with `application/x-www-form-urlencoded`: `query=...&format=json`

The current `application/sparql-query` content type is not standard for Wikidata.

### 2. **Query Syntax Issues**

**City Query** (Line 364-371):
```sparql
SELECT ?city WHERE {
  ?city rdfs:label "${cityName}"@en .
  ?city wdt:P31/wdt:P279* wd:Q515 .
  ?city wdt:P17 wd:${countryQID} .
}
LIMIT 1
```

**Issues**:
- String interpolation in SPARQL is unsafe (SQL injection risk)
- Should use proper SPARQL string escaping
- Missing proper namespace prefixes

**Industry Query** (Line 391-397):
```sparql
SELECT ?industry WHERE {
  ?industry rdfs:label "${industryName}"@en .
  ?industry wdt:P31/wdt:P279* wd:Q268592 .
}
LIMIT 1
```

**Same issues**: String interpolation and missing proper escaping.

### 3. **Response Parsing**
**Current Code** (Line 376-378):
```typescript
if (response.results.bindings.length > 0) {
  const uri = response.results.bindings[0].city.value;
  return uri.split('/').pop() || null;
}
```

**Issue**: Should handle both `http://www.wikidata.org/entity/Q...` and `wd:Q...` formats.

---

## ✅ **Proposed Fixes**

### Fix 1: Correct HTTP Method & Content Type

```typescript
private async executeQuery(query: string): Promise<any> {
  // Wikidata SPARQL endpoint accepts POST with form-encoded data
  const params = new URLSearchParams({
    query: query,
    format: 'json'
  });

  const response = await fetch(this.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'User-Agent': 'GEMflush/1.0 (https://gemflush.com)',
    },
    body: params.toString(),
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}\n${errorText}`);
  }
  
  return await response.json();
}
```

### Fix 2: Proper SPARQL Query with Escaping

```typescript
/**
 * Escape string for SPARQL query (prevent injection)
 */
private escapeSparqlString(str: string): string {
  return str
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t');
}

/**
 * SPARQL city lookup (production)
 */
private async sparqlCityLookup(
  cityName: string,
  countryQID: string
): Promise<string | null> {
  const escapedCity = this.escapeSparqlString(cityName);
  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    
    SELECT ?city WHERE {
      ?city rdfs:label "${escapedCity}"@en .
      ?city wdt:P31/wdt:P279* wd:Q515 .
      ?city wdt:P17 wd:${countryQID} .
    }
    LIMIT 1
  `;
  
  try {
    const response = await this.executeQuery(query);
    
    if (response.results?.bindings?.length > 0) {
      const uri = response.results.bindings[0].city.value;
      // Handle both formats: http://www.wikidata.org/entity/Q... and wd:Q...
      const qidMatch = uri.match(/(?:entity\/|^)(Q\d+)$/);
      return qidMatch ? qidMatch[1] : null;
    }
  } catch (error) {
    console.error('SPARQL city lookup error:', error);
  }
  
  return null;
}
```

### Fix 3: Improved Industry Query

```typescript
/**
 * SPARQL industry lookup (production)
 */
private async sparqlIndustryLookup(industryName: string): Promise<string | null> {
  const escapedIndustry = this.escapeSparqlString(industryName);
  const query = `
    PREFIX wd: <http://www.wikidata.org/entity/>
    PREFIX wdt: <http://www.wikidata.org/prop/direct/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    
    SELECT ?industry WHERE {
      ?industry rdfs:label "${escapedIndustry}"@en .
      ?industry wdt:P31/wdt:P279* wd:Q268592 .
    }
    LIMIT 1
  `;
  
  try {
    const response = await this.executeQuery(query);
    
    if (response.results?.bindings?.length > 0) {
      const uri = response.results.bindings[0].industry.value;
      const qidMatch = uri.match(/(?:entity\/|^)(Q\d+)$/);
      return qidMatch ? qidMatch[1] : null;
    }
  } catch (error) {
    console.error('SPARQL industry lookup error:', error);
  }
  
  return null;
}
```

---

## 🧪 **Testing**

### Test Queries (from Wikidata examples)

1. **City Query Test**:
   - Test: "San Francisco" with country Q30 (USA)
   - Expected: Q62
   - Query: https://query.wikidata.org/#SELECT%20%3Fcity%20WHERE%20%7B%0A%20%20%3Fcity%20rdfs%3Alabel%20%22San%20Francisco%22%40en%20.%0A%20%20%3Fcity%20wdt%3AP31%2Fwdt%3AP279*%20wd%3AQ515%20.%0A%20%20%3Fcity%20wdt%3AP17%20wd%3AQ30%20.%0A%7D%0ALIMIT%201

2. **Industry Query Test**:
   - Test: "software development"
   - Expected: Q7397
   - Query: https://query.wikidata.org/#SELECT%20%3Findustry%20WHERE%20%7B%0A%20%20%3Findustry%20rdfs%3Alabel%20%22software%20development%22%40en%20.%0A%20%20%3Findustry%20wdt%3AP31%2Fwdt%3AP279*%20wd%3AQ268592%20.%0A%7D%0ALIMIT%201

---

## 📊 **Expected Behavior After Fix**

1. ✅ **Proper HTTP format** - Uses `application/x-www-form-urlencoded`
2. ✅ **Safe string escaping** - Prevents SPARQL injection
3. ✅ **Proper namespace prefixes** - Uses standard Wikidata prefixes
4. ✅ **Better error handling** - Includes error details in exceptions
5. ✅ **Robust QID extraction** - Handles multiple URI formats

---

## 🔧 **Implementation Priority**

1. **High**: Fix HTTP method/content type (blocks all SPARQL queries)
2. **High**: Add string escaping (security issue)
3. **Medium**: Add namespace prefixes (best practice)
4. **Medium**: Improve error handling (debugging)
5. **Low**: Improve QID extraction (robustness)

---

## 📝 **References**

- Wikidata SPARQL Query Service: https://query.wikidata.org/
- SPARQL Query Examples: https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service/queries/examples
- SPARQL 1.1 Protocol: https://www.w3.org/TR/sparql11-protocol/

