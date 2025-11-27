# Login Route Group (`app/(login)/`) - TDD Development Guide

**Purpose**: Authentication pages and server actions for user sign-in and sign-up  
**TDD Philosophy**: Tests ARE specifications - write tests first, then implement authentication flows to satisfy them  
**Status**: 🟢 Active Development

---

## 📚 Overview

The `(login)` route group contains all authentication-related pages and server actions. This route group uses Next.js route groups (parentheses don't affect URL structure) to organize authentication routes separately from protected dashboard routes. All authentication code should be developed using **Test-Driven Development (TDD)**, where tests serve as executable specifications.

### Architecture Principles

1. **Tests ARE Specifications**: Write tests first to define authentication behavior
2. **Public Routes**: All pages are accessible without authentication
3. **Server Actions**: Use Next.js server actions for form submissions
4. **Security First**: Password hashing, session management, validation
5. **Type Safety**: Full TypeScript coverage with Zod validation
6. **Error Handling**: User-friendly error messages

---

## 🏗️ Directory Structure

```
app/(login)/
├── login.tsx              # Shared login component (sign-in/sign-up)
├── actions.ts             # Server actions for authentication
├── sign-in/               # Sign-in page
│   └── page.tsx          # Sign-in route
└── sign-up/               # Sign-up page
    └── page.tsx          # Sign-up route
```

---

## 🎯 Module Responsibilities

### 1. Login Component (`login.tsx`)

**Responsibility**: Shared authentication UI component
- Handles both sign-in and sign-up modes
- Form validation and error display
- Loading states during authentication
- Redirect handling after successful authentication
- Support for checkout redirects (pricing flow)

**TDD Strategy**:
- Test component renders correctly in sign-in mode
- Test component renders correctly in sign-up mode
- Test form validation (email, password)
- Test error message display
- Test loading state during submission
- Test redirect after successful authentication
- Test checkout redirect flow

### 2. Server Actions (`actions.ts`)

**Responsibility**: Server-side authentication logic
- User sign-in (email/password validation)
- User sign-up (account creation, team creation)
- Password hashing and verification
- Session management
- Team creation and membership
- Invitation handling
- Activity logging

**TDD Strategy**:
- Test sign-in with valid credentials
- Test sign-in with invalid credentials
- Test sign-up creates user and team
- Test sign-up with existing email (error)
- Test password hashing
- Test session creation
- Test invitation acceptance flow
- Test activity logging

### 3. Sign-In Page (`sign-in/page.tsx`)

**Responsibility**: Sign-in route entry point
- Renders login component in sign-in mode
- Handles Suspense boundaries
- Supports redirect query parameters

**TDD Strategy**:
- Test page renders login component
- Test sign-in mode is set correctly
- Test redirect parameter handling

### 4. Sign-Up Page (`sign-up/page.tsx`)

**Responsibility**: Sign-up route entry point
- Renders login component in sign-up mode
- Handles Suspense boundaries
- Supports invitation flow

**TDD Strategy**:
- Test page renders login component
- Test sign-up mode is set correctly
- Test invitation ID parameter handling

---

## 🎯 TDD Workflow for Authentication

### Step 1: Write Specification (Test FIRST)

**Before writing any authentication code**, write a test that defines the behavior:

```typescript
/**
 * SPECIFICATION: User Sign-In
 * 
 * As a user
 * I want to sign in with my email and password
 * So that I can access my dashboard
 * 
 * Acceptance Criteria:
 * - Valid credentials sign in successfully
 * - Invalid credentials show error message
 * - Session is created on successful sign-in
 * - User is redirected to dashboard
 * - Activity is logged
 */
describe('Sign-In Action - Specification', () => {
  it('signs in user with valid credentials', async () => {
    // SPECIFICATION: Given a user with valid credentials
    const testUser = createTestUser({
      email: 'test@example.com',
      passwordHash: await hashPassword('password123'),
    });
    mockGetUserByEmail.mockResolvedValue(testUser);
    mockComparePasswords.mockResolvedValue(true);
    
    // SPECIFICATION: When sign-in action is called
    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'password123');
    
    const result = await signIn(null, formData);
    
    // SPECIFICATION: Then should redirect to dashboard
    expect(result).toHaveProperty('redirect', '/dashboard');
    
    // SPECIFICATION: And session should be created
    expect(mockSetSession).toHaveBeenCalledWith(testUser);
    
    // SPECIFICATION: And activity should be logged
    expect(mockLogActivity).toHaveBeenCalledWith(
      expect.any(Number),
      testUser.id,
      ActivityType.SIGN_IN
    );
  });
  
  it('returns error with invalid credentials', async () => {
    // SPECIFICATION: Given invalid credentials
    mockGetUserByEmail.mockResolvedValue(null);
    
    // SPECIFICATION: When sign-in action is called
    const formData = new FormData();
    formData.set('email', 'wrong@example.com');
    formData.set('password', 'wrongpassword');
    
    const result = await signIn(null, formData);
    
    // SPECIFICATION: Then should return error
    expect(result).toHaveProperty('error');
    expect(result.error).toContain('Invalid email or password');
    
    // SPECIFICATION: And session should not be created
    expect(mockSetSession).not.toHaveBeenCalled();
  });
  
  it('handles checkout redirect', async () => {
    // SPECIFICATION: Given valid credentials with checkout redirect
    mockGetUserByEmail.mockResolvedValue(createTestUser());
    mockComparePasswords.mockResolvedValue(true);
    
    // SPECIFICATION: When sign-in with redirect=checkout
    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'password123');
    formData.set('redirect', 'checkout');
    formData.set('priceId', 'price_123');
    
    const result = await signIn(null, formData);
    
    // SPECIFICATION: Then should create checkout session
    expect(mockCreateCheckoutSession).toHaveBeenCalledWith({
      team: expect.any(Object),
      priceId: 'price_123',
    });
  });
});
```

### Step 2: Run Test (RED - Expected Failure)

```bash
# Start TDD watch mode
pnpm tdd

# Or run specific test file
pnpm test app/\(login\)/__tests__/actions.test.ts
```

**Expected**: Test fails (RED) ✅  
**Why**: Server action doesn't exist yet or doesn't satisfy the specification.

### Step 3: Implement Action to Satisfy Specification (GREEN)

Write minimal server action code to make the test pass:

```typescript
// app/(login)/actions.ts
'use server';

import { z } from 'zod';
import { db } from '@/lib/db/drizzle';
import { users, teams, teamMembers } from '@/lib/db/schema';
import { comparePasswords, hashPassword, setSession } from '@/lib/auth/session';
import { redirect } from 'next/navigation';
import { createCheckoutSession } from '@/lib/payments/stripe';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export async function signIn(prevState: any, formData: FormData) {
  // SPECIFICATION: Validate input
  const data = signInSchema.parse({
    email: formData.get('email'),
    password: formData.get('password'),
  });
  
  // SPECIFICATION: Find user
  const [userWithTeam] = await db
    .select({
      user: users,
      team: teams,
    })
    .from(users)
    .leftJoin(teamMembers, eq(users.id, teamMembers.userId))
    .leftJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(users.email, data.email))
    .limit(1);
  
  if (!userWithTeam) {
    return { error: 'Invalid email or password.' };
  }
  
  // SPECIFICATION: Verify password
  const isValid = await comparePasswords(
    data.password,
    userWithTeam.user.passwordHash
  );
  
  if (!isValid) {
    return { error: 'Invalid email or password.' };
  }
  
  // SPECIFICATION: Create session
  await setSession(userWithTeam.user);
  
  // SPECIFICATION: Handle redirect
  const redirectTo = formData.get('redirect');
  if (redirectTo === 'checkout') {
    const priceId = formData.get('priceId') as string;
    return createCheckoutSession({
      team: userWithTeam.team,
      priceId,
    });
  }
  
  // SPECIFICATION: Redirect to dashboard
  redirect('/dashboard');
}
```

**Expected**: Test passes (GREEN) ✅

### Step 4: Refactor (Keep Specification Valid)

Improve action code while keeping tests passing:

```typescript
// Refactored action with better error handling
export async function signIn(prevState: any, formData: FormData) {
  try {
    const data = signInSchema.parse({
      email: formData.get('email'),
      password: formData.get('password'),
    });
    
    const userWithTeam = await findUserWithTeam(data.email);
    
    if (!userWithTeam) {
      return { error: 'Invalid email or password.' };
    }
    
    const isValid = await comparePasswords(
      data.password,
      userWithTeam.user.passwordHash
    );
    
    if (!isValid) {
      return { error: 'Invalid email or password.' };
    }
    
    await Promise.all([
      setSession(userWithTeam.user),
      logActivity(userWithTeam.team?.id, userWithTeam.user.id, ActivityType.SIGN_IN),
    ]);
    
    return handleRedirect(formData, userWithTeam.team);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { error: 'Invalid input. Please check your email and password.' };
    }
    throw error;
  }
}
```

**Expected**: Test still passes ✅

---

## 📋 Authentication Patterns

### Pattern 1: Server Action with Validation

**For form submissions:**

```typescript
// app/(login)/actions.ts
'use server';

import { z } from 'zod';
import { validatedAction } from '@/lib/auth/middleware';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const signIn = validatedAction(signInSchema, async (data, formData) => {
  const { email, password } = data;
  
  // Authentication logic
  const user = await findUserByEmail(email);
  if (!user) {
    return { error: 'Invalid email or password.' };
  }
  
  const isValid = await comparePasswords(password, user.passwordHash);
  if (!isValid) {
    return { error: 'Invalid email or password.' };
  }
  
  await setSession(user);
  redirect('/dashboard');
});
```

**TDD Strategy**:
- Test validation errors
- Test authentication success
- Test authentication failure
- Test session creation
- Test redirect behavior

### Pattern 2: Client Component with Server Action

**For interactive forms:**

```typescript
// app/(login)/login.tsx
'use client';

import { useActionState } from 'react';
import { signIn } from './actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export function Login({ mode = 'signin' }: { mode?: 'signin' | 'signup' }) {
  const [state, formAction, pending] = useActionState(
    mode === 'signin' ? signIn : signUp,
    { error: '' }
  );
  
  return (
    <form action={formAction}>
      <Input name="email" type="email" required />
      <Input name="password" type="password" required />
      {state?.error && <div className="text-red-500">{state.error}</div>}
      <Button type="submit" disabled={pending}>
        {pending ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
      </Button>
    </form>
  );
}
```

**TDD Strategy**:
- Test form renders correctly
- Test form submission
- Test loading state
- Test error display
- Test success redirect

### Pattern 3: Sign-Up with Team Creation

**For account creation:**

```typescript
// app/(login)/actions.ts
export const signUp = validatedAction(signUpSchema, async (data, formData) => {
  const { email, password, inviteId } = data;
  
  // Check for existing user
  const existingUser = await findUserByEmail(email);
  if (existingUser) {
    return { error: 'User already exists.' };
  }
  
  // Hash password
  const passwordHash = await hashPassword(password);
  
  // Create user
  const user = await createUser({ email, passwordHash });
  
  // Handle invitation or create team
  if (inviteId) {
    await acceptInvitation(inviteId, user.id);
  } else {
    await createTeamForUser(user.id);
  }
  
  // Create session
  await setSession(user);
  
  redirect('/dashboard');
});
```

**TDD Strategy**:
- Test user creation
- Test team creation
- Test invitation acceptance
- Test duplicate email handling
- Test password hashing

---

## 🧪 TDD Testing Patterns

### Testing Server Actions

```typescript
// app/(login)/__tests__/actions.test.ts
import { signIn, signUp } from '../actions';
import { comparePasswords, setSession } from '@/lib/auth/session';
import { findUserByEmail, createUser } from '@/lib/db/queries';

vi.mock('@/lib/auth/session');
vi.mock('@/lib/db/queries');

describe('Sign-In Action', () => {
  it('signs in user with valid credentials', async () => {
    const testUser = createTestUser();
    vi.mocked(findUserByEmail).mockResolvedValue(testUser);
    vi.mocked(comparePasswords).mockResolvedValue(true);
    
    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'password123');
    
    const result = await signIn(null, formData);
    
    expect(setSession).toHaveBeenCalledWith(testUser);
    expect(result).toHaveProperty('redirect', '/dashboard');
  });
  
  it('returns error with invalid password', async () => {
    const testUser = createTestUser();
    vi.mocked(findUserByEmail).mockResolvedValue(testUser);
    vi.mocked(comparePasswords).mockResolvedValue(false);
    
    const formData = new FormData();
    formData.set('email', 'test@example.com');
    formData.set('password', 'wrongpassword');
    
    const result = await signIn(null, formData);
    
    expect(result).toHaveProperty('error');
    expect(setSession).not.toHaveBeenCalled();
  });
});
```

### Testing Client Components

```typescript
// app/(login)/__tests__/login.test.tsx
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Login } from '../login';
import { signIn } from '../actions';

vi.mock('../actions');

describe('Login Component', () => {
  it('renders sign-in form', () => {
    render(<Login mode="signin" />);
    
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });
  
  it('submits form with email and password', async () => {
    vi.mocked(signIn).mockResolvedValue({ redirect: '/dashboard' });
    
    render(<Login mode="signin" />);
    
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: 'test@example.com' },
    });
    fireEvent.change(screen.getByLabelText(/password/i), {
      target: { value: 'password123' },
    });
    
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(signIn).toHaveBeenCalled();
    });
  });
  
  it('displays error message', async () => {
    vi.mocked(signIn).mockResolvedValue({ error: 'Invalid credentials' });
    
    render(<Login mode="signin" />);
    
    // Submit form
    fireEvent.click(screen.getByRole('button', { name: /sign in/i }));
    
    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
    });
  });
});
```

### Testing Password Security

```typescript
// app/(login)/__tests__/actions.security.test.ts
describe('Password Security', () => {
  it('hashes passwords before storage', async () => {
    const password = 'password123';
    const hashed = await hashPassword(password);
    
    expect(hashed).not.toBe(password);
    expect(hashed).toHaveLength(60); // bcrypt hash length
  });
  
  it('verifies passwords correctly', async () => {
    const password = 'password123';
    const hashed = await hashPassword(password);
    
    const isValid = await comparePasswords(password, hashed);
    expect(isValid).toBe(true);
    
    const isInvalid = await comparePasswords('wrongpassword', hashed);
    expect(isInvalid).toBe(false);
  });
});
```

---

## 🔒 Security Best Practices

### 1. Password Hashing

```typescript
// ✅ GOOD: Hash passwords before storage
const passwordHash = await hashPassword(password);
await createUser({ email, passwordHash });

// ❌ BAD: Store plain text passwords
await createUser({ email, password: password });
```

### 2. Input Validation

```typescript
// ✅ GOOD: Validate all inputs with Zod
const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ❌ BAD: No validation
const email = formData.get('email'); // Could be anything
```

### 3. Error Messages

```typescript
// ✅ GOOD: Generic error messages (don't reveal if email exists)
return { error: 'Invalid email or password.' };

// ❌ BAD: Specific error messages (reveals if email exists)
return { error: 'Email not found.' };
```

### 4. Session Management

```typescript
// ✅ GOOD: Secure session creation
await setSession(user);

// ❌ BAD: Store sensitive data in session
await setSession({ ...user, passwordHash: user.passwordHash });
```

---

## 🚀 Running Tests

### Watch Mode (Recommended for TDD)

```bash
# Start Vitest watch mode
pnpm tdd

# Or explicit watch command
pnpm test:watch
```

### Single Run

```bash
# Run all tests once
pnpm test:run

# Run specific file
pnpm test app/\(login\)/__tests__/actions.test.ts

# Run with pattern
pnpm test --grep "sign in"
```

### E2E Tests

```bash
# Run E2E tests for authentication flows
pnpm test:e2e login
```

---

## 📋 TDD Checklist for Authentication

When developing authentication features:

- [ ] **Write test FIRST** (authentication behavior before implementation)
- [ ] **Test defines behavior** (what authentication should do, not how)
- [ ] **Test success cases** (valid credentials sign in)
- [ ] **Test failure cases** (invalid credentials show error)
- [ ] **Test validation** (email format, password length)
- [ ] **Test security** (password hashing, session management)
- [ ] **Test redirects** (dashboard, checkout, etc.)
- [ ] **Test edge cases** (existing email, invitation flow)
- [ ] **Mock dependencies** (database, session, hashing)
- [ ] **Run test** (verify it fails - RED)
- [ ] **Write minimal action** (satisfy specification)
- [ ] **Run test** (verify it passes - GREEN)
- [ ] **Refactor action** (improve while keeping test passing)
- [ ] **Test still passes** (specification still satisfied)

---

## 🔗 Related Documentation

- **Main App README**: `app/README.md`
- **Dashboard Module**: `app/(dashboard)/README.md`
- **API Routes Guide**: `app/api/README.md`
- **Auth Module**: `lib/auth/README.md`
- **TDD Strategy**: `docs/development/TDD_STRATEGY.md`

---

## 🎓 Key Principles

1. **Tests ARE Specifications**: Tests define authentication behavior, actions satisfy them
2. **Write Tests First**: Before any authentication implementation
3. **Security First**: Password hashing, validation, secure sessions
4. **User Experience**: Clear error messages, smooth flows
5. **Mock Dependencies**: Don't make real database calls in tests
6. **Type Safety**: Full TypeScript coverage with Zod validation
7. **DRY**: Reuse validation schemas and authentication utilities

---

**Remember**: In TDD, tests are not verification—they are the specification that drives development. Write authentication behavior tests first, then implement actions to satisfy them.



