import {
  pgTable,
  serial,
  varchar,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  boolean,
  unique,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  role: varchar('role', { length: 20 }).notNull().default('member'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
});

export const teams = pgTable('teams', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 100 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
  stripeCustomerId: text('stripe_customer_id').unique(),
  stripeSubscriptionId: text('stripe_subscription_id').unique(),
  stripeProductId: text('stripe_product_id'),
  planName: varchar('plan_name', { length: 50 }),
  subscriptionStatus: varchar('subscription_status', { length: 20 }),
});

export const teamMembers = pgTable('team_members', {
  id: serial('id').primaryKey(),
  userId: integer('user_id')
    .notNull()
    .references(() => users.id),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  role: varchar('role', { length: 50 }).notNull(),
  joinedAt: timestamp('joined_at').notNull().defaultNow(),
});

export const activityLogs = pgTable('activity_logs', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  userId: integer('user_id').references(() => users.id),
  action: text('action').notNull(),
  timestamp: timestamp('timestamp').notNull().defaultNow(),
  ipAddress: varchar('ip_address', { length: 45 }),
});

export const invitations = pgTable('invitations', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  email: varchar('email', { length: 255 }).notNull(),
  role: varchar('role', { length: 50 }).notNull(),
  invitedBy: integer('invited_by')
    .notNull()
    .references(() => users.id),
  invitedAt: timestamp('invited_at').notNull().defaultNow(),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
});

export const teamsRelations = relations(teams, ({ many }) => ({
  teamMembers: many(teamMembers),
  activityLogs: many(activityLogs),
  invitations: many(invitations),
}));

export const usersRelations = relations(users, ({ many }) => ({
  teamMembers: many(teamMembers),
  invitationsSent: many(invitations),
}));

export const invitationsRelations = relations(invitations, ({ one }) => ({
  team: one(teams, {
    fields: [invitations.teamId],
    references: [teams.id],
  }),
  invitedBy: one(users, {
    fields: [invitations.invitedBy],
    references: [users.id],
  }),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, {
    fields: [teamMembers.userId],
    references: [users.id],
  }),
  team: one(teams, {
    fields: [teamMembers.teamId],
    references: [teams.id],
  }),
}));

export const activityLogsRelations = relations(activityLogs, ({ one }) => ({
  team: one(teams, {
    fields: [activityLogs.teamId],
    references: [teams.id],
  }),
  user: one(users, {
    fields: [activityLogs.userId],
    references: [users.id],
  }),
}));

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;
export type TeamMember = typeof teamMembers.$inferSelect;
export type NewTeamMember = typeof teamMembers.$inferInsert;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type NewActivityLog = typeof activityLogs.$inferInsert;
export type Invitation = typeof invitations.$inferSelect;
export type NewInvitation = typeof invitations.$inferInsert;
export type TeamDataWithMembers = Team & {
  teamMembers: (TeamMember & {
    user: Pick<User, 'id' | 'name' | 'email'>;
  })[];
};

export enum ActivityType {
  SIGN_UP = 'SIGN_UP',
  SIGN_IN = 'SIGN_IN',
  SIGN_OUT = 'SIGN_OUT',
  UPDATE_PASSWORD = 'UPDATE_PASSWORD',
  DELETE_ACCOUNT = 'DELETE_ACCOUNT',
  UPDATE_ACCOUNT = 'UPDATE_ACCOUNT',
  CREATE_TEAM = 'CREATE_TEAM',
  REMOVE_TEAM_MEMBER = 'REMOVE_TEAM_MEMBER',
  INVITE_TEAM_MEMBER = 'INVITE_TEAM_MEMBER',
  ACCEPT_INVITATION = 'ACCEPT_INVITATION',
}

// ========== GEMFLUSH TABLES ==========

export const businesses = pgTable('businesses', {
  id: serial('id').primaryKey(),
  teamId: integer('team_id')
    .notNull()
    .references(() => teams.id),
  name: varchar('name', { length: 200 }).notNull(),
  url: text('url').notNull(),
  category: varchar('category', { length: 100 }),
  location: jsonb('location').$type<{
    city: string;
    state: string;
    country: string;
    coordinates?: { lat: number; lng: number };
  }>(),
  wikidataQID: varchar('wikidata_qid', { length: 50 }),
  wikidataPublishedAt: timestamp('wikidata_published_at'),
  lastCrawledAt: timestamp('last_crawled_at'),
  crawlData: jsonb('crawl_data'),
  status: varchar('status', { length: 20 }).notNull().default('pending'),
  // Automation fields
  automationEnabled: boolean('automation_enabled').default(false),
  nextCrawlAt: timestamp('next_crawl_at'),
  lastAutoPublishedAt: timestamp('last_auto_published_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const wikidataEntities = pgTable('wikidata_entities', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id),
  qid: varchar('qid', { length: 50 }).notNull().unique(),
  entityData: jsonb('entity_data').notNull(),
  publishedTo: varchar('published_to', { length: 50 }).notNull(),
  version: integer('version'),
  enrichmentLevel: integer('enrichment_level'),
  publishedAt: timestamp('published_at').notNull().defaultNow(),
  lastEnrichedAt: timestamp('last_enriched_at'),
});

export const llmFingerprints = pgTable('llm_fingerprints', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id),
  visibilityScore: integer('visibility_score').notNull(),
  mentionRate: real('mention_rate'),
  sentimentScore: real('sentiment_score'),
  accuracyScore: real('accuracy_score'),
  avgRankPosition: real('avg_rank_position'),
  llmResults: jsonb('llm_results'),
  competitiveBenchmark: jsonb('competitive_benchmark'),
  competitiveLeaderboard: jsonb('competitive_leaderboard'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const crawlJobs = pgTable('crawl_jobs', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id),
  jobType: varchar('job_type', { length: 50 }).notNull(),
  status: varchar('status', { length: 20 }).notNull(),
  progress: integer('progress'),
  result: jsonb('result'),
  errorMessage: text('error_message'),
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

export const competitors = pgTable('competitors', {
  id: serial('id').primaryKey(),
  businessId: integer('business_id')
    .notNull()
    .references(() => businesses.id),
  competitorBusinessId: integer('competitor_business_id').references(
    () => businesses.id
  ),
  competitorName: varchar('competitor_name', { length: 200 }),
  competitorUrl: text('competitor_url'),
  addedBy: varchar('added_by', { length: 20 }).notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
});

// Relations
export const businessesRelations = relations(businesses, ({ one, many }) => ({
  team: one(teams, {
    fields: [businesses.teamId],
    references: [teams.id],
  }),
  wikidataEntities: many(wikidataEntities),
  llmFingerprints: many(llmFingerprints),
  crawlJobs: many(crawlJobs),
  competitors: many(competitors),
}));

export const wikidataEntitiesRelations = relations(wikidataEntities, ({ one }) => ({
  business: one(businesses, {
    fields: [wikidataEntities.businessId],
    references: [businesses.id],
  }),
}));

export const llmFingerprintsRelations = relations(llmFingerprints, ({ one }) => ({
  business: one(businesses, {
    fields: [llmFingerprints.businessId],
    references: [businesses.id],
  }),
}));

export const crawlJobsRelations = relations(crawlJobs, ({ one }) => ({
  business: one(businesses, {
    fields: [crawlJobs.businessId],
    references: [businesses.id],
  }),
}));

export const competitorsRelations = relations(competitors, ({ one }) => ({
  business: one(businesses, {
    fields: [competitors.businessId],
    references: [businesses.id],
  }),
  competitorBusiness: one(businesses, {
    fields: [competitors.competitorBusinessId],
    references: [businesses.id],
  }),
}));

// Type exports
export type Business = typeof businesses.$inferSelect;
export type NewBusiness = typeof businesses.$inferInsert;
export type WikidataEntity = typeof wikidataEntities.$inferSelect;
export type NewWikidataEntity = typeof wikidataEntities.$inferInsert;
export type LLMFingerprint = typeof llmFingerprints.$inferSelect;
export type NewLLMFingerprint = typeof llmFingerprints.$inferInsert;
export type CrawlJob = typeof crawlJobs.$inferSelect;
export type NewCrawlJob = typeof crawlJobs.$inferInsert;
export type Competitor = typeof competitors.$inferSelect;
export type NewCompetitor = typeof competitors.$inferInsert;

// QID Cache table for persistent Wikidata QID lookups
// SOLID: Single Responsibility - stores cached QID lookups
// DRY: Prevents duplicate lookups by enforcing unique entity_type + search_key combination
export const qidCache = pgTable(
  'qid_cache',
  {
    id: serial('id').primaryKey(),
    entityType: varchar('entity_type', { length: 50 }).notNull(),
    searchKey: varchar('search_key', { length: 255 }).notNull(),
    qid: varchar('qid', { length: 20 }).notNull(),
    source: varchar('source', { length: 20 }).notNull(), // 'local_mapping', 'sparql', 'manual'
    queryCount: integer('query_count').default(1),
    lastQueriedAt: timestamp('last_queried_at').defaultNow(),
    validatedAt: timestamp('validated_at').defaultNow(),
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
  },
  (table) => ({
    // Composite unique constraint: entity_type + search_key must be unique
    // This enables ON CONFLICT updates in lib/wikidata/sparql.ts
    // Matches migration 0003_add_qid_cache.sql: UNIQUE(entity_type, search_key)
    entityTypeSearchKeyUnique: unique('qid_cache_entity_type_search_key_unique').on(
      table.entityType,
      table.searchKey
    ),
  })
);

export type QidCache = typeof qidCache.$inferSelect;
export type NewQidCache = typeof qidCache.$inferInsert;
