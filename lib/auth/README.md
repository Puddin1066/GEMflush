# Authentication Module (`lib/auth/`)

**Purpose**: Authentication, session management, and authorization middleware  
**Status**: 🟢 Active  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement to satisfy them

---

## 📚 Overview

The `auth/` module provides secure authentication and session management using JWT tokens and bcrypt password hashing. It handles user authentication, session validation, and provides middleware for protected routes.

### Architecture Principles

1. **Security First**: Uses industry-standard JWT tokens and bcrypt hashing
2. **Type Safety**: Full TypeScript coverage with strict types
3. **Server-Only**: All authentication logic runs server-side
4. **Cookie-Based Sessions**: Secure HTTP-only cookies for session storage

---

## 🏗️ Module Structure

```
lib/auth/
├── session.ts        # Session management (JWT, cookies)
├── middleware.ts     # Authorization middleware and validated actions
└── __tests__/        # TDD test specifications
```

---

## 🔑 Core Components

### 1. Session Management (`session.ts`)

**Purpose**: JWT token creation, verification, and cookie management

**Key Functions:**

```typescript
// Password hashing
export async function hashPassword(password: string): Promise<string>
export async function comparePasswords(
  plainTextPassword: string,
  hashedPassword: string
): Promise<boolean>

// JWT token management
export async function signToken(payload: SessionData): Promise<string>
export async function verifyToken(input: string): Promise<SessionData>

// Session operations
export async function getSession(): Promise<SessionData | null>
export async function createSession(userId: number): Promise<void>
export async function deleteSession(): Promise<void>
```

**Usage:**

```typescript
import { createSession, getSession, deleteSession } from '@/lib/auth/session';

// Create session after login
await createSession(user.id);

// Get current session
const session = await getSession();
if (session) {
  console.log(`User ID: ${session.user.id}`);
}

// Delete session on logout
await deleteSession();
```

**Security Features:**
- JWT tokens signed with `AUTH_SECRET` (HS256 algorithm)
- Tokens expire after 1 day
- HTTP-only cookies prevent XSS attacks
- Password hashing with bcrypt (10 salt rounds)

---

### 2. Authorization Middleware (`middleware.ts`)

**Purpose**: Form action validation and user authorization helpers

**Key Functions:**

```typescript
// Validated form actions
export function validatedAction<S, T>(
  schema: S,
  action: ValidatedActionFunction<S, T>
): (prevState: ActionState, formData: FormData) => Promise<T>

// Validated actions with user context
export function validatedActionWithUser<S, T>(
  schema: S,
  action: ValidatedActionWithUserFunction<S, T>
): (prevState: ActionState, formData: FormData) => Promise<T>

// Team authorization
export async function requireTeamAccess(
  teamId: number
): Promise<TeamDataWithMembers>

// User authorization
export async function requireUser(): Promise<User>
```

**Usage:**

```typescript
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { z } from 'zod';

const createBusinessSchema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

export const createBusinessAction = validatedActionWithUser(
  createBusinessSchema,
  async (data, formData, user) => {
    // User is guaranteed to be authenticated
    // Data is validated against schema
    const business = await createBusiness({
      ...data,
      teamId: user.teamId,
    });
    return { success: true, business };
  }
);
```

**Features:**
- Automatic schema validation with Zod
- User authentication check
- Team access verification
- Type-safe form actions

---

## 🔄 Authentication Flow

```
1. User Login
   ↓
2. Verify Password (comparePasswords)
   ↓
3. Create Session (createSession)
   - Generate JWT token
   - Set HTTP-only cookie
   ↓
4. Protected Route Access
   - Read session cookie
   - Verify JWT token (verifyToken)
   - Get user from database (getUser)
   ↓
5. User Logout
   - Delete session cookie (deleteSession)
```

---

## 🧪 TDD Development

### Writing Tests First (Specification)

```typescript
/**
 * SPECIFICATION: Session Management
 * 
 * As a user
 * I want to create a session after login
 * So that I can access protected routes
 * 
 * Acceptance Criteria:
 * - Session token is created with user ID
 * - Token expires after 1 day
 * - Cookie is set as HTTP-only
 */
describe('Session Management - Specification', () => {
  it('creates session with user ID and expiration', async () => {
    // SPECIFICATION: Given a user ID
    const userId = 1;
    
    // SPECIFICATION: When session is created
    await createSession(userId);
    
    // SPECIFICATION: Then session should exist
    const session = await getSession();
    expect(session).toBeDefined();
    expect(session?.user.id).toBe(userId);
    expect(new Date(session?.expires || '')).toBeInstanceOf(Date);
  });
});
```

### Running Tests

```bash
# Watch mode (recommended for TDD)
pnpm tdd

# Run specific test file
pnpm test lib/auth/__tests__/session.test.ts

# With coverage
pnpm test:coverage lib/auth/
```

---

## 🔒 Security Considerations

### Environment Variables

**Required:**
- `AUTH_SECRET`: Secret key for JWT signing (generate with `openssl rand -base64 32`)

**Security Best Practices:**
1. **Never expose `AUTH_SECRET`** in client-side code
2. **Use strong secrets** (minimum 32 characters)
3. **Rotate secrets** periodically in production
4. **Use HTTPS** in production to protect cookies
5. **Set secure cookie flags** (HttpOnly, Secure, SameSite)

### Password Security

- Passwords are hashed with bcrypt (10 salt rounds)
- Never store plain text passwords
- Use `comparePasswords` for verification (timing-safe comparison)

### Session Security

- JWT tokens include expiration time
- Tokens are signed with HMAC-SHA256
- Cookies are HTTP-only (prevents XSS)
- Sessions validated on every request

---

## 📋 Usage Examples

### Login Flow

```typescript
// app/api/auth/login/route.ts
import { comparePasswords, createSession } from '@/lib/auth/session';
import { getUserByEmail } from '@/lib/db/queries';

export async function POST(request: Request) {
  const { email, password } = await request.json();
  
  const user = await getUserByEmail(email);
  if (!user) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  
  const isValid = await comparePasswords(password, user.passwordHash);
  if (!isValid) {
    return Response.json({ error: 'Invalid credentials' }, { status: 401 });
  }
  
  await createSession(user.id);
  return Response.json({ success: true });
}
```

### Protected Route

```typescript
// app/api/business/route.ts
import { getSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';

export async function GET() {
  const session = await getSession();
  if (!session) {
    redirect('/login');
  }
  
  // User is authenticated
  const businesses = await getBusinessesByTeam(session.user.id);
  return Response.json(businesses);
}
```

### Form Action with Validation

```typescript
// app/actions/business.ts
import { validatedActionWithUser } from '@/lib/auth/middleware';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1),
  url: z.string().url(),
});

export const createBusiness = validatedActionWithUser(
  schema,
  async (data, formData, user) => {
    // User is authenticated and data is validated
    const business = await createBusiness({
      ...data,
      teamId: user.teamId,
    });
    return { success: true, business };
  }
);
```

---

## 🔗 Related Documentation

- **Main Library README**: `lib/README.md`
- **Database Queries**: `lib/db/queries.ts` (getUser, getUserByEmail)
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Server-Only**: All auth logic runs server-side (never expose secrets)
2. **Type Safety**: Full TypeScript coverage with strict types
3. **Security First**: Industry-standard encryption and hashing
4. **TDD Development**: Write tests first as specifications
5. **SOLID Principles**: Single responsibility, clear separation of concerns

---

**Remember**: Authentication is critical security infrastructure. Always write tests first, validate all inputs, and never trust client-side data.



