# Browser Debugging Setup for AI Assistant

This guide explains how to enable browser debugging so the AI assistant can troubleshoot and observe browser operations, console logs, and errors.

## Available Browser Tools

The AI assistant has access to MCP (Model Context Protocol) browser tools that can:
- Navigate to URLs
- Capture console messages
- View network requests
- Take snapshots (accessibility tree, not visual)
- Interact with elements
- Monitor browser operations

## Setup Options

### Option 1: Enable Browser Console Logging (Recommended)

Add comprehensive console logging that the AI can read from terminal output:

```typescript
// lib/utils/browser-logger.ts (create new file)
export class BrowserLogger {
  private static instance: BrowserLogger;
  private logs: Array<{ level: string; message: string; timestamp: Date }> = [];

  static getInstance(): BrowserLogger {
    if (!BrowserLogger.instance) {
      BrowserLogger.instance = new BrowserLogger();
    }
    return BrowserLogger.instance;
  }

  log(level: 'info' | 'warn' | 'error' | 'debug', message: string, data?: unknown) {
    const logEntry = {
      level,
      message,
      timestamp: new Date(),
      data: data ? JSON.stringify(data, null, 2) : undefined,
    };
    
    this.logs.push(logEntry);
    
    // Also log to console for terminal visibility
    const prefix = `[BROWSER ${level.toUpperCase()}]`;
    if (data) {
      console.log(`${prefix} ${message}`, data);
    } else {
      console.log(`${prefix} ${message}`);
    }
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
  }
}
```

### Option 2: Use MCP Browser Extension

If you have the MCP browser extension configured, the AI can:

1. **Navigate to your app:**
   ```
   Navigate to http://localhost:3000
   ```

2. **Capture console messages:**
   ```
   Get all console messages from the page
   ```

3. **Monitor network requests:**
   ```
   Get all network requests
   ```

4. **Take accessibility snapshot:**
   ```
   Get page structure (not visual, but element tree)
   ```

### Option 3: Add Debug Endpoint

Create an API endpoint that exposes browser console logs:

```typescript
// app/api/debug/browser-logs/route.ts
import { NextRequest, NextResponse } from 'next/server';

// Store logs in memory (or use Redis for production)
const browserLogs: Array<{ level: string; message: string; timestamp: string; data?: unknown }> = [];

export async function POST(request: NextRequest) {
  const body = await request.json();
  browserLogs.push({
    level: body.level || 'info',
    message: body.message || '',
    timestamp: new Date().toISOString(),
    data: body.data,
  });
  
  // Keep only last 1000 logs
  if (browserLogs.length > 1000) {
    browserLogs.shift();
  }
  
  return NextResponse.json({ success: true });
}

export async function GET() {
  return NextResponse.json({ logs: browserLogs });
}
```

Then in your client code:

```typescript
// Override console methods to send to API
if (process.env.NODE_ENV === 'development') {
  const originalLog = console.log;
  const originalError = console.error;
  const originalWarn = console.warn;

  console.log = (...args) => {
    originalLog(...args);
    fetch('/api/debug/browser-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'info', message: args.join(' ') }),
    }).catch(() => {}); // Ignore errors
  };

  console.error = (...args) => {
    originalError(...args);
    fetch('/api/debug/browser-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'error', message: args.join(' ') }),
    }).catch(() => {});
  };

  console.warn = (...args) => {
    originalWarn(...args);
    fetch('/api/debug/browser-logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: 'warn', message: args.join(' ') }),
    }).catch(() => {});
  };
}
```

### Option 4: Use Playwright for E2E Debugging

Since you already have Playwright for tests, you can create a debug script:

```typescript
// scripts/debug-browser.ts
import { chromium } from 'playwright';

async function debugBrowser() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console messages
  page.on('console', msg => {
    console.log(`[BROWSER CONSOLE ${msg.type()}]`, msg.text());
  });

  // Capture network requests
  page.on('request', request => {
    console.log(`[REQUEST] ${request.method()} ${request.url()}`);
  });

  // Capture responses
  page.on('response', response => {
    if (!response.ok()) {
      console.log(`[RESPONSE ERROR] ${response.status()} ${response.url()}`);
    }
  });

  // Navigate to your app
  await page.goto('http://localhost:3000');
  
  // Keep browser open for inspection
  console.log('Browser opened. Press Ctrl+C to close.');
  
  // Wait indefinitely (or until Ctrl+C)
  await new Promise(() => {});
}

debugBrowser().catch(console.error);
```

## Recommended Approach

**For AI Assistant Troubleshooting:**

1. **Use structured logging** (already implemented)
   - All server-side logs go to terminal
   - AI can read from `dev-terminal-output.log`

2. **Add browser console capture** (Option 3)
   - Create `/api/debug/browser-logs` endpoint
   - Client sends console messages to API
   - AI can query this endpoint

3. **Use MCP browser tools** (if available)
   - AI can navigate and inspect directly
   - No setup needed if MCP is configured

## Quick Start

To enable browser debugging right now:

1. **Check if MCP browser is available:**
   - Ask AI: "Can you navigate to http://localhost:3000 and check console messages?"

2. **If not available, add debug endpoint:**
   - I can create the `/api/debug/browser-logs` endpoint for you

3. **Monitor terminal output:**
   - All server logs are already visible
   - Browser console logs need to be captured separately

## Example: Using Browser Tools

Once enabled, you can ask the AI:

```
"Navigate to http://localhost:3000/dashboard and check for console errors"
"Get all network requests from the page"
"Check what console messages appear when I click the submit button"
"Monitor the browser for 10 seconds and report any errors"
```

The AI will use the browser tools to:
- Navigate to the URL
- Capture console messages
- Monitor network activity
- Report findings

