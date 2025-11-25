# E2E Test Setup Instructions

## Prerequisites

### 1. Database Connection Required

E2E tests require a database connection. Set one of these environment variables:

```bash
# Option 1: Set DATABASE_URL
export DATABASE_URL="postgresql://user:password@host:5432/dbname"

# Option 2: Set POSTGRES_URL  
export POSTGRES_URL="postgresql://user:password@host:5432/dbname"
```

### 2. Verify Database is Accessible

```bash
# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Or check with Drizzle
pnpm drizzle-kit studio
```

### 3. Database Schema Must Be Migrated

Ensure migrations have been run:

```bash
pnpm drizzle-kit push
# or
pnpm drizzle-kit migrate
```

## Running Tests

After setting up database:

```bash
# Run all TDD tests
pnpm test:e2e critical-platform-stability.tdd.spec.ts

# Run with UI (better debugging)
pnpm test:e2e:ui critical-platform-stability

# Run specific test
pnpm test:e2e -g "complete CFP flow"
```

## Troubleshooting

### Sign-up Times Out
- **Check**: Database URL is set and accessible
- **Check**: Database schema is migrated
- **Check**: Database allows connections from localhost

### PostgresError During Tests
- **Check**: `DATABASE_URL` or `POSTGRES_URL` is set in environment
- **Check**: Database is running and accessible
- **Check**: Playwright config passes env vars to webServer (already fixed in `playwright.config.ts`)

## Next Steps After Setup

1. ✅ Set `DATABASE_URL` or `POSTGRES_URL` in your environment
2. ✅ Verify database connection works
3. ✅ Run tests: `pnpm test:e2e critical-platform-stability.tdd.spec.ts`
4. ✅ Continue with GREEN phase - fixing actual test failures

