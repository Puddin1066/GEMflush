# Vitest Watch Mode - Test Failure Alerts

**Yes, Vitest watch mode will alert you when tests break!**

---

## ✅ How Vitest Watch Alerts You

### 1. **Automatic Re-Run on File Changes**
When you save a file, Vitest automatically:
- Detects the change
- Re-runs affected tests
- Shows results immediately in the terminal

### 2. **Clear Failure Indicators**

When a test fails, you'll see:

```
❌ FAIL  app/api/business/__tests__/route.test.ts > creates business
AssertionError: expected "201" to be "200"
  Expected: 200
  Received: 201
```

**Visual Indicators:**
- ❌ Red `FAIL` markers
- ⚠️ Error messages with stack traces
- 📊 Summary showing passed/failed counts

### 3. **Real-Time Status**

Watch mode shows:
```
✓ 3 passed
× 1 failed

Test Files  1 failed | 2 passed (3)
Tests       1 failed | 5 passed (6)
```

---

## 🎯 What You'll See

### When Tests Pass ✅
```
✓ app/api/business/__tests__/route.test.ts (4 tests) 31ms
✓ components/onboarding/__tests__/url-only-form.test.tsx (6 tests) 136ms

Test Files  2 passed (2)
Tests       10 passed (10)
```

### When Tests Fail ❌
```
× app/api/business/__tests__/route.test.ts > creates business 230ms
✓ app/api/business/__tests__/route.test.ts > returns 401 when not authenticated 1ms

FAIL  app/api/business/__tests__/route.test.ts > creates business
AssertionError: expected "201" to be "200"
  Expected: 200
  Received: 201

Test Files  1 failed | 1 passed (2)
Tests       1 failed | 9 passed (10)
```

---

## 🔔 Alert Features

### 1. **Immediate Feedback**
- Tests run within seconds of saving
- No need to manually run tests
- Instant failure detection

### 2. **Detailed Error Messages**
- Full stack traces
- Expected vs. received values
- File and line numbers

### 3. **Summary Statistics**
- Total tests passed/failed
- Test files passed/failed
- Duration for each test

### 4. **Color Coding**
- ✅ Green for passing tests
- ❌ Red for failing tests
- ⚠️ Yellow for warnings

---

## 🛠️ Watch Mode Commands

While watch mode is running, you can:

| Key | Action |
|-----|--------|
| `a` | Run all tests |
| `f` | Run only failed tests |
| `p` | Filter by filename pattern |
| `t` | Filter by test name pattern |
| `q` | Quit watch mode |
| `r` | Rerun tests |

---

## 📊 Example: Breaking a Test

### Step 1: Test is Passing
```bash
$ pnpm tdd
✓ app/api/business/__tests__/route.test.ts (4 tests) 31ms
```

### Step 2: Break the Code
```typescript
// app/api/business/route.ts
export async function POST(request: NextRequest) {
  return NextResponse.json({ error: 'Broken' }, { status: 500 }); // ❌ Broke it!
}
```

### Step 3: Watch Mode Alerts You
```bash
# Vitest automatically detects change and runs tests

× app/api/business/__tests__/route.test.ts > creates business 12ms

FAIL  app/api/business/__tests__/route.test.ts > creates business
AssertionError: expected 500 to be 201
  Expected: 201
  Received: 500

Test Files  1 failed (1)
Tests       1 failed | 3 passed (4)
```

**You're immediately alerted!** ✅

---

## 🎯 Best Practices

### 1. **Keep Watch Mode Running**
```bash
# Start once, keep it running
pnpm tdd
```

### 2. **Watch the Terminal**
- Keep terminal visible
- Watch for ❌ failures
- Check error messages

### 3. **Use Failed Test Filter**
When tests fail, press `f` to re-run only failed tests:
```bash
# Press 'f' in watch mode
# Only failed tests run (faster feedback)
```

### 4. **Check Summary**
Always check the summary at the bottom:
```bash
Test Files  1 failed | 9 passed (10)
Tests       2 failed | 28 passed (30)
```

---

## 🚨 What to Look For

### Red Flags in Watch Mode:
1. ❌ `FAIL` markers
2. `AssertionError` messages
3. `Test Files X failed` in summary
4. `Tests X failed` in summary

### Good Signs:
1. ✅ All tests passing
2. `Test Files X passed`
3. `Tests X passed`
4. No error messages

---

## 💡 Pro Tips

### 1. **Use Verbose Mode for More Details**
```bash
pnpm tdd --reporter=verbose
```

### 2. **Use UI Mode for Visual Feedback**
```bash
pnpm test:ui
# Opens browser with visual test runner
```

### 3. **Filter to Focus on Specific Tests**
```bash
pnpm tdd --grep "business"
# Only runs tests matching "business"
```

---

## ✅ Summary

**Yes, Vitest watch mode will alert you when tests break!**

- ✅ Automatic re-runs on file changes
- ✅ Clear failure indicators (❌, error messages)
- ✅ Real-time status updates
- ✅ Detailed error information
- ✅ Summary statistics

**Just keep `pnpm tdd` running and watch the terminal!** 🎯






