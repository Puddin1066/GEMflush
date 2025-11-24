-- Enhance crawl_jobs table for Firecrawl multi-page crawling
-- Add fields to support Firecrawl job tracking and multi-page results

ALTER TABLE crawl_jobs 
ADD COLUMN IF NOT EXISTS firecrawl_job_id VARCHAR(100), -- Firecrawl's job ID for tracking
ADD COLUMN IF NOT EXISTS started_at TIMESTAMP, -- When the job actually started
ADD COLUMN IF NOT EXISTS pages_discovered INTEGER DEFAULT 0, -- Number of pages found
ADD COLUMN IF NOT EXISTS pages_processed INTEGER DEFAULT 0, -- Number of pages completed
ADD COLUMN IF NOT EXISTS firecrawl_metadata JSONB; -- Store Firecrawl-specific metadata

-- Add index for efficient Firecrawl job lookups
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_firecrawl_job_id ON crawl_jobs(firecrawl_job_id);

-- Add index for job status and progress tracking
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_status_progress ON crawl_jobs(status, progress);

-- Add index for business and job type queries
CREATE INDEX IF NOT EXISTS idx_crawl_jobs_business_type ON crawl_jobs(business_id, job_type);

