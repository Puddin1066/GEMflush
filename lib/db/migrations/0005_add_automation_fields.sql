-- Migration: Add automation fields to businesses table
-- Enables automated crawl and publication scheduling based on subscription tier

ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "automation_enabled" boolean DEFAULT false;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "next_crawl_at" timestamp;
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "last_auto_published_at" timestamp;

-- Index for efficient querying of businesses due for crawl
CREATE INDEX IF NOT EXISTS "idx_businesses_next_crawl" ON "businesses"("automation_enabled", "next_crawl_at") WHERE "automation_enabled" = true;

