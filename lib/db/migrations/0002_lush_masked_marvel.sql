ALTER TABLE "crawl_jobs" ALTER COLUMN "status" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "crawl_jobs" ALTER COLUMN "progress" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wikidata_entities" ALTER COLUMN "version" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "wikidata_entities" ALTER COLUMN "enrichment_level" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "crawl_jobs" DROP COLUMN "started_at";--> statement-breakpoint
ALTER TABLE "llm_fingerprints" DROP COLUMN "mention_rate";--> statement-breakpoint
ALTER TABLE "llm_fingerprints" DROP COLUMN "sentiment_score";--> statement-breakpoint
ALTER TABLE "llm_fingerprints" DROP COLUMN "accuracy_score";--> statement-breakpoint
ALTER TABLE "llm_fingerprints" DROP COLUMN "avg_rank_position";