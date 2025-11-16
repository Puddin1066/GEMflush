# Troubleshooting Next.js Build Artifacts

## Problem: Missing Build Artifact Files

If you see errors like:
```
Error: ENOENT: no such file or directory, open '.next/static/development/_buildManifest.js.tmp.*'
Error: Cannot find module '../chunks/ssr/[turbopack]_runtime.js'
```

These are Next.js build cache issues, typically caused by:
- Stale build artifacts
- Interrupted builds
- Cache corruption
- Turbopack cache issues

## Quick Fix

### Option 1: Clean and Rebuild (Recommended)

```bash
# Clean build artifacts
pnpm clean

# Rebuild
pnpm build
```

### Option 2: Full Clean Script

```bash
# Run comprehensive clean script
pnpm clean:build

# Or manually
./scripts/clean-build.sh
```

### Option 3: Manual Clean

```bash
# Remove build directories
rm -rf .next .turbo node_modules/.cache

# Rebuild
pnpm build
```

## Development Server Issues

If the error occurs during `pnpm dev`:

1. **Stop the dev server** (Ctrl+C)
2. **Clean the build cache:**
   ```bash
   pnpm clean
   ```
3. **Restart the dev server:**
   ```bash
   pnpm dev
   ```

## Prevention

### 1. Don't Interrupt Builds

Avoid killing build processes mid-execution. Let them complete or use Ctrl+C gracefully.

### 2. Clean Before Major Changes

When switching branches or updating dependencies:

```bash
pnpm clean
pnpm install
pnpm build
```

### 3. Check for Conflicting Processes

If builds keep failing, check for:
- Multiple dev servers running
- Build processes still running in background
- File watchers holding locks

```bash
# Check for Node processes
ps aux | grep node

# Kill all Node processes (be careful!)
pkill -f node
```

## Advanced Troubleshooting

### Clear All Caches

```bash
# Remove all caches
rm -rf .next .turbo node_modules/.cache node_modules/.vite

# Clear pnpm store (optional, slow)
pnpm store prune

# Reinstall dependencies
rm -rf node_modules
pnpm install
```

### Check Next.js Version

Ensure Next.js version is consistent:

```bash
# Check version
pnpm list next

# Update if needed
pnpm add next@latest
```

### Turbopack Issues

If using Turbopack (default in dev mode), try:

1. **Disable Turbopack temporarily:**
   ```bash
   # Remove --turbopack from package.json dev script
   pnpm dev
   ```

2. **Clear Turbopack cache:**
   ```bash
   rm -rf .turbo
   ```

### Node.js Memory Issues

If builds fail with memory errors:

```bash
# Increase Node memory limit
NODE_OPTIONS=--max-old-space-size=4096 pnpm build
```

(Already set in package.json)

## When to Clean

Clean build cache when:
- ✅ After switching branches
- ✅ After updating dependencies
- ✅ After build errors
- ✅ After merging pull requests
- ✅ When seeing "Cannot find module" errors
- ✅ When build artifacts seem corrupted

## Verification

After cleaning, verify the build works:

```bash
# Clean
pnpm clean

# Build
pnpm build

# Should complete without errors
# Check for: "✓ Compiled successfully"
```

## Related Files

- `scripts/clean-build.sh` - Comprehensive clean script
- `.gitignore` - Ensures `.next` and `.turbo` are ignored
- `next.config.ts` - Next.js configuration
- `package.json` - Build scripts and dependencies

## Still Having Issues?

1. **Check Next.js documentation:** https://nextjs.org/docs
2. **Check for known issues:** https://github.com/vercel/next.js/issues
3. **Verify Node.js version:** Should be 18.x or 20.x
4. **Check disk space:** Low disk space can cause build failures
5. **Check file permissions:** Ensure write permissions in project directory




