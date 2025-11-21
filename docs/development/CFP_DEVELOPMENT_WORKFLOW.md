# CFP Development Workflow

## Overview

During development, you need to test CFP (Crawl, Fingerprint, Publish) changes without creating new businesses each time. This document explains the best practices for iterative development.

## Development vs Production

### Production (Automated)
- **CFP runs automatically** on schedule based on subscription tier:
  - **Free**: Manual only
  - **Pro**: Weekly automatic crawl + fingerprint
  - **Enterprise**: Daily automatic crawl + fingerprint + publish
- Users don't need to manually trigger CFP
- Fingerprint data accumulates over time (historical tracking)

### Development (Manual)
- You need to **manually trigger CFP** to see changes
- Two options available:
  1. **Re-run CFP** - Runs CFP on existing data (keeps old fingerprints)
  2. **Reset & Re-run** - Clears fingerprints and starts fresh (dev only)

## Development Workflow Options

### Option 1: Re-run CFP (Recommended for Most Cases)

**When to use:**
- Testing changes to CFP logic
- Testing UI updates
- Testing new features that work with existing data

**How to use:**
1. Navigate to business detail page: `/dashboard/businesses/{id}`
2. Click **"Run CFP"** button
3. Wait for processing to complete
4. View updated metrics

**Pros:**
- Fast (no data deletion)
- Preserves historical data
- Tests real-world scenario (accumulated fingerprints)

**Cons:**
- Old fingerprints remain (may affect visibility score calculations)
- May need to wait for processing to complete

### Option 2: Reset & Re-run (Development Only)

**When to use:**
- Testing changes to fingerprint calculation logic
- Testing changes to competitive leaderboard
- Want to see "fresh" metrics without old data
- Testing initial CFP flow

**How to use:**
1. Navigate to business detail page: `/dashboard/businesses/{id}`
2. Click **"Reset & Re-run"** button (only visible in dev mode)
3. Confirm deletion
4. Wait for CFP to complete
5. View fresh metrics

**Pros:**
- Clean slate - no old data affecting results
- Tests initial CFP flow
- Better for testing calculation changes

**Cons:**
- Deletes all fingerprint history
- Takes longer (full CFP cycle)
- Only available in development mode

### Option 3: Create New Business (When Needed)

**When to use:**
- Testing business creation flow
- Testing URL validation
- Testing location form
- Need completely fresh test data

**How to use:**
1. Navigate to `/dashboard/businesses/new`
2. Enter URL and submit
3. Complete CFP process
4. Test with new business

**Pros:**
- Tests full user flow
- Completely fresh data
- Tests business creation logic

**Cons:**
- Creates database clutter
- Slower workflow
- Need to clean up test businesses

## Best Practices

### For UI Development
- Use **Option 1: Re-run CFP** - Fast iteration, preserves data
- Use existing business with data already populated

### For Algorithm/Calculation Changes
- Use **Option 2: Reset & Re-run** - Clean slate for accurate testing
- Verify calculations match expected results

### For End-to-End Testing
- Use **Option 3: Create New Business** - Tests full flow
- Clean up test businesses after testing

### For Production-Like Testing
- Use **Option 1: Re-run CFP** - Mimics production behavior
- Test with accumulated fingerprint history

## API Endpoints

### Re-run CFP
```bash
POST /api/business/{id}/process
```
- Triggers full CFP: Crawl → Fingerprint → Publish
- Keeps existing fingerprint data
- Available in all environments

### Reset & Re-run (Dev Only)
```bash
POST /api/business/{id}/reset-fingerprint
```
- Deletes all fingerprints and competitors
- Re-runs full CFP cycle
- Only available when `NODE_ENV !== 'production'`

## Cleanup Scripts

### Remove All Test Businesses
```bash
tsx scripts/remove-most-recent-business.ts
```
- Removes all businesses from test account
- Cleans up related data (fingerprints, entities, etc.)

### Remove Single Business
```bash
tsx scripts/remove-most-recent-business.ts --most-recent
```
- Removes only the most recent business

## Quick Reference

| Scenario | Method | Speed | Data Preserved |
|----------|--------|-------|----------------|
| UI changes | Re-run CFP | ⚡ Fast | ✅ Yes |
| Calculation changes | Reset & Re-run | 🐢 Slower | ❌ No |
| Full flow testing | Create New | 🐢 Slowest | N/A |
| Production testing | Re-run CFP | ⚡ Fast | ✅ Yes |

## Tips

1. **Keep one test business** - Use the same business for most development
2. **Use Reset & Re-run sparingly** - Only when you need clean data
3. **Monitor logs** - Check terminal output for CFP progress
4. **Use browser dev tools** - Watch network requests and console logs
5. **Clean up regularly** - Remove test businesses periodically

## Troubleshooting

### CFP Not Running
- Check business status (must be `crawled` or `published`)
- Check browser console for errors
- Check terminal logs for processing errors

### Changes Not Reflected
- Ensure CFP completed successfully
- Refresh the page
- Check if changes are in the right component
- Verify data is being fetched correctly

### Reset Not Working
- Ensure you're in development mode (`NODE_ENV !== 'production'`)
- Check browser console for errors
- Verify business ownership

