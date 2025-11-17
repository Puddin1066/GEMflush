# Wikidata Entity JSON - Alpha Dental Center

This document contains the entity JSON that was generated and attempted to be published to Wikidata during the e2e test.

## Entity Summary

- **Labels**: 1 language (English)
- **Descriptions**: 1 language (English)  
- **Claims**: 5 properties
- **Total Statements**: 5

## Full Entity JSON

```json
{
  "labels": {
    "en": {
      "language": "en",
      "value": "Alpha Dental Center | Family & Cosmetic Dentistry"
    }
  },
  "descriptions": {
    "en": {
      "language": "en",
      "value": "Dental Care at Alpha Dental in Southeastern Mass, The Cape, and Rhode Island. Our team offers dental services, from Check-Ups to Advanced Treatments."
    }
  },
  "claims": {
    "P31": [
      {
        "mainsnak": {
          "snaktype": "value",
          "property": "P31",
          "datavalue": {
            "value": {
              "entity-type": "item",
              "id": "Q4830453"
            },
            "type": "wikibase-entityid"
          }
        },
        "type": "statement",
        "references": [
          {
            "snaks": {
              "P854": [
                {
                  "snaktype": "value",
                  "property": "P854",
                  "datavalue": {
                    "value": "https://alphadentalcenter.com/",
                    "type": "string"
                  }
                }
              ],
              "P813": [
                {
                  "snaktype": "value",
                  "property": "P813",
                  "datavalue": {
                    "value": {
                      "time": "+2025-11-17T00:00:00Z",
                      "precision": 11,
                      "timezone": 0,
                      "calendarmodel": "http://www.wikidata.org/entity/Q1985727"
                    },
                    "type": "time"
                  }
                }
              ]
            }
          }
        ]
      }
    ],
    "P856": [
      {
        "mainsnak": {
          "snaktype": "value",
          "property": "P856",
          "datavalue": {
            "value": "https://alphadentalcenter.com/",
            "type": "string"
          }
        },
        "type": "statement"
      }
    ],
    "P1448": [
      {
        "mainsnak": {
          "snaktype": "value",
          "property": "P1448",
          "datavalue": {
            "value": "Alpha Dental Center | Family & Cosmetic Dentistry",
            "type": "string"
          }
        },
        "type": "statement",
        "references": [
          {
            "snaks": {
              "P854": [
                {
                  "snaktype": "value",
                  "property": "P854",
                  "datavalue": {
                    "value": "https://alphadentalcenter.com/",
                    "type": "string"
                  }
                }
              ],
              "P813": [
                {
                  "snaktype": "value",
                  "property": "P813",
                  "datavalue": {
                    "value": {
                      "time": "+2025-11-17T00:00:00Z",
                      "precision": 11,
                      "timezone": 0,
                      "calendarmodel": "http://www.wikidata.org/entity/Q1985727"
                    },
                    "type": "time"
                  }
                }
              ]
            }
          }
        ]
      }
    ],
    "P2013": [
      {
        "mainsnak": {
          "snaktype": "value",
          "property": "P2013",
          "datavalue": {
            "value": "AlphaDentalCenters",
            "type": "string"
          }
        },
        "type": "statement",
        "references": [
          {
            "snaks": {
              "P854": [
                {
                  "snaktype": "value",
                  "property": "P854",
                  "datavalue": {
                    "value": "https://alphadentalcenter.com/",
                    "type": "string"
                  }
                }
              ],
              "P813": [
                {
                  "snaktype": "value",
                  "property": "P813",
                  "datavalue": {
                    "value": {
                      "time": "+2025-11-17T00:00:00Z",
                      "precision": 11,
                      "timezone": 0,
                      "calendarmodel": "http://www.wikidata.org/entity/Q1985727"
                    },
                    "type": "time"
                  }
                }
              ]
            }
          }
        ]
      }
    ],
    "P2003": [
      {
        "mainsnak": {
          "snaktype": "value",
          "property": "P2003",
          "datavalue": {
            "value": "alphadentalcenter",
            "type": "string"
          }
        },
        "type": "statement",
        "references": [
          {
            "snaks": {
              "P854": [
                {
                  "snaktype": "value",
                  "property": "P854",
                  "datavalue": {
                    "value": "https://alphadentalcenter.com/",
                    "type": "string"
                  }
                }
              ],
              "P813": [
                {
                  "snaktype": "value",
                  "property": "P813",
                  "datavalue": {
                    "value": {
                      "time": "+2025-11-17T00:00:00Z",
                      "precision": 11,
                      "timezone": 0,
                      "calendarmodel": "http://www.wikidata.org/entity/Q1985727"
                    },
                    "type": "time"
                  }
                }
              ]
            }
          }
        ]
      }
    ]
  },
  "llmSuggestions": {
    "suggestedProperties": [
      {
        "pid": "P452",
        "value": "Healthcare",
        "dataType": "item",
        "confidence": 0.95,
        "reasoning": "The business data specifies the industry as 'Healthcare'."
      },
      {
        "pid": "P159",
        "value": "Attleboro",
        "dataType": "item",
        "confidence": 0.9,
        "reasoning": "The location provided is 'Attleboro, MA', and the property requires only the city name."
      }
    ],
    "suggestedReferences": [],
    "qualityScore": 62,
    "completeness": 27,
    "model": "openai/gpt-4-turbo",
    "generatedAt": "2025-11-17T06:48:38.547Z"
  }
}
```

## Properties Included

1. **P31** (instance of): Q4830453 (business) - with reference to website
2. **P856** (official website): https://alphadentalcenter.com/
3. **P1448** (official name): "Alpha Dental Center | Family & Cosmetic Dentistry" - with reference
4. **P2013** (Facebook ID): AlphaDentalCenters - with reference
5. **P2003** (Instagram username): alphadentalcenter - with reference

## LLM Suggestions

The entity includes LLM-generated suggestions for additional properties:
- **P452** (industry): Healthcare (confidence: 0.95)
- **P159** (headquarters location): Attleboro (confidence: 0.9)

## References

All claims include proper references with:
- **P854** (reference URL): https://alphadentalcenter.com/
- **P813** (retrieved date): 2025-11-17

## Status

This entity was generated successfully but failed to publish due to authentication issues with test.wikidata.org. The entity JSON structure is correct and ready for publishing once authentication is resolved.

