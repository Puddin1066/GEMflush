# Manual Wikidata Publication Method

## Overview

This document describes the manual publication method for Wikidata entities. This system provides a complementary approach to automated publication, allowing you to review and publish entities manually when you prefer more control over the publication process.

## How It Works

### Automatic Storage

When a Wikidata entity is assembled (with rich data including PIDs, QIDs, notability references, etc.), it is **automatically stored** in a backend folder for manual review. This happens:

1. **During scheduled monthly publication** - When the automation system assembles entities for businesses due for publication
2. **During manual API publication** - When a user triggers publication via the API endpoint

The storage happens **unbeknownst to the user** - it's completely transparent and doesn't affect the normal publication flow.

### Storage Location

Entities are stored in:
```
.wikidata-manual-publish/
```

This directory is created automatically in your project root. Each entity is stored as two files:

- `entity-{businessId}-{timestamp}.json` - The full entity JSON ready for publication
- `entity-{businessId}-{timestamp}.metadata.json` - Metadata about the entity (business name, notability status, etc.)

### What Gets Stored

Each stored entity includes:

- **Full entity JSON** - Complete Wikidata entity structure with:
  - Labels (all languages)
  - Descriptions (all languages)
  - Claims (all properties with PIDs and QIDs)
  - References (notability references attached to claims)
  - All enrichment data

- **Metadata** - Information about the entity:
  - Business ID and name
  - Storage timestamp
  - Publication readiness (`canPublish` flag)
  - Notability assessment (if available):
    - Is notable (boolean)
    - Confidence score
    - Recommendation message

## Manual Publication Script

A command-line script is provided for manual publication:

```bash
tsx scripts/manual-publish-wikidata.ts
```

### Commands

#### List Stored Entities

View all stored entities with their metadata:

```bash
tsx scripts/manual-publish-wikidata.ts list
```

This shows:
- Business ID and name
- Storage timestamp
- Publication readiness status
- Notability information
- File locations

#### Publish Single Entity

Publish a specific entity by business ID:

```bash
tsx scripts/manual-publish-wikidata.ts publish <businessId>
```

Example:
```bash
tsx scripts/manual-publish-wikidata.ts publish 123
```

**Note:** The script will skip entities that don't meet publication criteria unless you override (future enhancement).

#### Publish All Entities (Batch)

Publish all stored entities in sequence:

```bash
tsx scripts/manual-publish-wikidata.ts publish-all
```

This will:
- Process all stored entities
- Skip entities that don't meet publication criteria
- Show progress for each entity
- Provide a summary at the end

#### Publish Ready Entities Only

Publish only entities that meet publication criteria:

```bash
tsx scripts/manual-publish-wikidata.ts publish-ready
```

This filters to entities where `canPublish === true` before publishing.

#### Delete Stored Entity

Remove a stored entity after publishing:

```bash
tsx scripts/manual-publish-wikidata.ts delete <businessId>
```

Example:
```bash
tsx scripts/manual-publish-wikidata.ts delete 123
```

## Environment Variables

Control publication behavior with environment variables:

### Target Environment

- **Default:** `test.wikidata.org` (test environment)
- **Production:** Set `WIKIDATA_PUBLISH_TO_PRODUCTION=true` to publish to `wikidata.org`

Example:
```bash
WIKIDATA_PUBLISH_TO_PRODUCTION=true tsx scripts/manual-publish-wikidata.ts publish 123
```

### Publication Mode

- **Mock Mode:** `WIKIDATA_PUBLISH_MODE=mock` (default) - Simulates publication
- **Real Mode:** `WIKIDATA_PUBLISH_MODE=real` - Actual API calls to Wikidata

Example:
```bash
WIKIDATA_PUBLISH_MODE=real tsx scripts/manual-publish-wikidata.ts publish 123
```

### Authentication

For real publication, ensure these are set:
- `WIKIDATA_BOT_USERNAME` - Your bot username
- `WIKIDATA_BOT_PASSWORD` - Your bot password

See [Wikidata Authentication Documentation](../wikidata/WIKIDATA_AUTH.md) for details.

## Workflow Examples

### Monthly Review and Batch Publication

1. **Wait for monthly automation** - Entities are automatically stored during scheduled processing

2. **Review stored entities:**
   ```bash
   tsx scripts/manual-publish-wikidata.ts list
   ```

3. **Review entity JSON files** - Check the `.json` files in `.wikidata-manual-publish/` to verify entity quality

4. **Publish ready entities:**
   ```bash
   WIKIDATA_PUBLISH_MODE=real tsx scripts/manual-publish-wikidata.ts publish-ready
   ```

5. **Clean up after publishing:**
   ```bash
   # Delete each published entity
   tsx scripts/manual-publish-wikidata.ts delete <businessId>
   ```

### One-at-a-Time Publication

1. **List entities:**
   ```bash
   tsx scripts/manual-publish-wikidata.ts list
   ```

2. **Review specific entity JSON:**
   ```bash
   cat .wikidata-manual-publish/entity-123-*.json
   ```

3. **Publish if satisfied:**
   ```bash
   WIKIDATA_PUBLISH_MODE=real tsx scripts/manual-publish-wikidata.ts publish 123
   ```

4. **Delete after publishing:**
   ```bash
   tsx scripts/manual-publish-wikidata.ts delete 123
   ```

### Production Publication

To publish to production Wikidata (wikidata.org):

```bash
WIKIDATA_PUBLISH_TO_PRODUCTION=true \
WIKIDATA_PUBLISH_MODE=real \
WIKIDATA_ENABLE_PRODUCTION=true \
tsx scripts/manual-publish-wikidata.ts publish-ready
```

**⚠️ Warning:** Production publication is permanent. Ensure entities are correct before publishing.

## Benefits of Manual Publication

1. **Quality Control** - Review entity JSON before publishing
2. **Batch Processing** - Publish multiple entities efficiently
3. **Flexible Timing** - Publish when convenient, not tied to automation schedule
4. **Error Recovery** - Re-publish entities if automated publication fails
5. **Production Safety** - Review before publishing to production wikidata.org

## Storage Details

### File Naming Convention

- Entity files: `entity-{businessId}-{timestamp}.json`
- Metadata files: `entity-{businessId}-{timestamp}.metadata.json`

Timestamp format: ISO 8601 with colons/dots replaced by hyphens (filesystem-safe)

### Storage Persistence

- Entities are stored indefinitely until manually deleted
- Storage happens automatically - no user action required
- Storage failures are logged but don't break publication flow

### Storage Location Security

The `.wikidata-manual-publish/` directory should be:
- Added to `.gitignore` (contains business data)
- Protected from public access (if deployed)
- Backed up if needed (contains publication-ready entities)

## Integration Points

The storage system is integrated into:

1. **Scheduler Service** (`lib/services/scheduler-service.ts`)
   - `handleAutoPublish()` - Stores entities during monthly automation

2. **Publication API** (`app/api/wikidata/publish/route.ts`)
   - `POST /api/wikidata/publish` - Stores entities when user triggers publication

Both integration points call `storeEntityForManualPublish()` automatically when entities are assembled.

## Troubleshooting

### No Stored Entities

If `list` shows no entities:
- Check that entities have been assembled (business must be crawled)
- Verify storage directory exists: `.wikidata-manual-publish/`
- Check logs for storage errors (non-fatal, won't break flow)

### Publication Fails

If publication fails:
- Check `WIKIDATA_PUBLISH_MODE=real` is set
- Verify credentials are configured
- Review entity JSON for validation errors
- Check Wikidata API status

### Storage Directory Issues

If storage directory can't be created:
- Check filesystem permissions
- Verify project root is writable
- Check disk space

## Future Enhancements

Potential improvements:
- Interactive prompts for publication confirmation
- Force flag to publish entities that don't meet criteria
- Filter by date range, business name, etc.
- Export/import stored entities
- Web UI for reviewing and publishing entities

## Related Documentation

- [Wikidata Publishing Overview](./WIKIDATA_PUBLISHING.md)
- [Automated Publication](./AUTOMATION.md)
- [Wikidata Authentication](../wikidata/WIKIDATA_AUTH.md)
- [Entity Building](./ENTITY_BUILDING.md)

