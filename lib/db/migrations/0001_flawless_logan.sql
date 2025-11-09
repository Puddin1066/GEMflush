CREATE TABLE "businesses" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"name" varchar(200) NOT NULL,
	"url" text NOT NULL,
	"category" varchar(100),
	"location" jsonb,
	"wikidata_qid" varchar(50),
	"wikidata_published_at" timestamp,
	"last_crawled_at" timestamp,
	"crawl_data" jsonb,
	"status" varchar(20) DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "competitors" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"competitor_business_id" integer,
	"competitor_name" varchar(200),
	"competitor_url" text,
	"added_by" varchar(20) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "crawl_jobs" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"job_type" varchar(50) NOT NULL,
	"status" varchar(20) DEFAULT 'queued' NOT NULL,
	"progress" integer DEFAULT 0 NOT NULL,
	"result" jsonb,
	"error_message" text,
	"started_at" timestamp,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "llm_fingerprints" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"visibility_score" integer NOT NULL,
	"mention_rate" real,
	"sentiment_score" real,
	"accuracy_score" real,
	"avg_rank_position" real,
	"llm_results" jsonb,
	"competitive_benchmark" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "wikidata_entities" (
	"id" serial PRIMARY KEY NOT NULL,
	"business_id" integer NOT NULL,
	"qid" varchar(50) NOT NULL,
	"entity_data" jsonb NOT NULL,
	"published_to" varchar(50) NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"enrichment_level" integer DEFAULT 1 NOT NULL,
	"published_at" timestamp DEFAULT now() NOT NULL,
	"last_enriched_at" timestamp,
	CONSTRAINT "wikidata_entities_qid_unique" UNIQUE("qid")
);
--> statement-breakpoint
ALTER TABLE "businesses" ADD CONSTRAINT "businesses_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "competitors" ADD CONSTRAINT "competitors_competitor_business_id_businesses_id_fk" FOREIGN KEY ("competitor_business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "crawl_jobs" ADD CONSTRAINT "crawl_jobs_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "llm_fingerprints" ADD CONSTRAINT "llm_fingerprints_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wikidata_entities" ADD CONSTRAINT "wikidata_entities_business_id_businesses_id_fk" FOREIGN KEY ("business_id") REFERENCES "public"."businesses"("id") ON DELETE no action ON UPDATE no action;