-- QID Cache Table for Persistent SPARQL Results
-- Stores resolved QIDs from SPARQL queries and local mappings
-- Enables fast lookups and learning over time

CREATE TABLE IF NOT EXISTS qid_cache (
  id SERIAL PRIMARY KEY,
  
  -- Entity classification
  entity_type VARCHAR(50) NOT NULL, -- 'city', 'industry', 'legal_form', 'organization', 'person'
  
  -- Normalized search key (e.g., "providence, ri", "healthcare")
  search_key VARCHAR(255) NOT NULL,
  
  -- Resolved Wikidata QID
  qid VARCHAR(20) NOT NULL,
  
  -- Resolution source
  source VARCHAR(20) NOT NULL, -- 'local_mapping', 'sparql', 'manual'
  
  -- Usage analytics
  query_count INTEGER DEFAULT 1,
  last_queried_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Validation tracking
  validated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Ensure unique entity_type + search_key combinations
  UNIQUE(entity_type, search_key)
);

-- Index for fast lookups (primary use case)
CREATE INDEX idx_qid_cache_lookup ON qid_cache(entity_type, search_key);

-- Index for analytics (most popular searches)
CREATE INDEX idx_qid_cache_popular ON qid_cache(query_count DESC);

-- Index for maintenance (revalidation of old entries)
CREATE INDEX idx_qid_cache_validated ON qid_cache(validated_at);

-- Index for source-based queries
CREATE INDEX idx_qid_cache_source ON qid_cache(source);

