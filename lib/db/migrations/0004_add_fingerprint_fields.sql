-- Migration: Add detailed fingerprint fields to llm_fingerprints table
ALTER TABLE "llm_fingerprints" ADD COLUMN IF NOT EXISTS "mention_rate" real;
ALTER TABLE "llm_fingerprints" ADD COLUMN IF NOT EXISTS "sentiment_score" real;
ALTER TABLE "llm_fingerprints" ADD COLUMN IF NOT EXISTS "accuracy_score" real;
ALTER TABLE "llm_fingerprints" ADD COLUMN IF NOT EXISTS "avg_rank_position" real;
ALTER TABLE "llm_fingerprints" ADD COLUMN IF NOT EXISTS "competitive_leaderboard" jsonb;

