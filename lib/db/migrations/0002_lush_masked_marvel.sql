DO $$ BEGIN
 ALTER TABLE "crawl_jobs" ALTER COLUMN "status" DROP DEFAULT;
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_jobs" ALTER COLUMN "progress" DROP NOT NULL;
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wikidata_entities" ALTER COLUMN "version" DROP NOT NULL;
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "wikidata_entities" ALTER COLUMN "enrichment_level" DROP NOT NULL;
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "crawl_jobs" DROP COLUMN IF EXISTS "started_at";
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_fingerprints" DROP COLUMN IF EXISTS "mention_rate";
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_fingerprints" DROP COLUMN IF EXISTS "sentiment_score";
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_fingerprints" DROP COLUMN IF EXISTS "accuracy_score";
EXCEPTION
 WHEN OTHERS THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "llm_fingerprints" DROP COLUMN IF EXISTS "avg_rank_position";
EXCEPTION
 WHEN OTHERS THEN null;
END $$;