# 📧 GEMflush Email Service

Email infrastructure using [Resend](https://resend.com) with branded templates.

## 🚀 Quick Start

### 1. Get Your Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to `.env`:
   ```bash
   RESEND_API_KEY=re_your_actual_key_here
   EMAIL_FROM=GEMflush <noreply@yourdomain.com>
   ```

### 2. Verify Your Domain (Production)

For production, verify your sending domain in Resend:
- Add DNS records (SPF, DKIM)
- Verify in Resend dashboard
- Update `EMAIL_FROM` to use your domain

For development, use `onboarding@resend.dev` (no verification needed).

## 📨 Available Email Templates

### Welcome Email
Sent when users sign up:
```typescript
import { sendWelcomeEmail } from '@/lib/email/send';

await sendWelcomeEmail(
  'user@example.com',
  'John Doe' // optional
);
```

### Password Reset
Sent for password reset requests:
```typescript
import { sendPasswordResetEmail } from '@/lib/email/send';

await sendPasswordResetEmail(
  'user@example.com',
  'reset_token_abc123',
  'John Doe' // optional
);
```

### Subscription Updated
Sent when plan changes:
```typescript
import { sendSubscriptionEmail } from '@/lib/email/send';

await sendSubscriptionEmail(
  'user@example.com',
  'Pro', // plan name
  '$49/month', // plan price
  [
    'Wikidata Publishing',
    '5 businesses',
    'Weekly fingerprints'
  ],
  true, // isUpgrade (true for upgrade, false for downgrade)
  'John Doe' // optional
);
```

### Visibility Report
Sent when AI fingerprint completes:
```typescript
import { sendVisibilityReportEmail } from '@/lib/email/send';

await sendVisibilityReportEmail(
  'user@example.com',
  'Acme Corp', // business name
  78, // score out of 100
  [
    'ChatGPT mentions you 8 times',
    'Claude ranks you #2 in your category',
    'Perplexity shows 6 citations'
  ]
);
```

## 🎨 Email Templates

All templates follow GEMflush branding:
- 💎 Gem gradient header (violet to purple)
- Responsive design
- Mobile-optimized
- Clear CTAs with gem-gradient buttons
- Professional footer

### Template Files
- `templates/welcome.tsx` - Welcome new users
- `templates/password-reset.tsx` - Password reset flow
- `templates/subscription-updated.tsx` - Plan changes

## 🔧 Custom Emails

Send custom emails:
```typescript
import { sendEmail } from '@/lib/email/send';

await sendEmail({
  to: 'user@example.com',
  subject: 'Your Custom Subject',
  react: (
    <html>
      <body>
        <h1>Custom Email</h1>
        <p>Your content here</p>
      </body>
    </html>
  ),
});
```

## 🧪 Testing

### Development
In development, emails go to Resend's test inbox (no real delivery).

### Testing in Code
Mock the email service in tests:
```typescript
import { sendWelcomeEmail } from '@/lib/email/send';

// Mock for testing
jest.mock('@/lib/email/send', () => ({
  sendWelcomeEmail: jest.fn(),
}));

// In test
await sendWelcomeEmail('test@example.com');
expect(sendWelcomeEmail).toHaveBeenCalledWith('test@example.com');
```

## 📊 Monitoring

Check email delivery in:
- [Resend Dashboard](https://resend.com/emails) - See sent emails, opens, clicks
- Server logs - All sends are logged with `console.log`

## 🚨 Error Handling

Email sends are logged but won't block user actions:
```typescript
try {
  await sendWelcomeEmail(email, name);
} catch (error) {
  // Email failed but user signup succeeded
  console.error('Failed to send welcome email:', error);
  // Continue with user flow
}
```

## 🎯 Integration Points

### Signup Flow
Add to `app/(login)/actions.ts`:
```typescript
import { sendWelcomeEmail } from '@/lib/email/send';

// After user created
await sendWelcomeEmail(user.email, user.name);
```

### Password Reset
Add to password reset action.

### Stripe Webhooks
Add to `app/api/stripe/webhook/route.ts`:
```typescript
import { sendSubscriptionEmail } from '@/lib/email/send';

// On subscription created/updated
await sendSubscriptionEmail(
  user.email,
  planName,
  planPrice,
  features,
  isUpgrade
);
```

## 💰 Pricing

Resend free tier includes:
- ✅ 3,000 emails/month
- ✅ 100 emails/day
- ✅ Perfect for getting started

[View full pricing](https://resend.com/pricing)

## 🔐 Security

- API keys stored in environment variables (never committed)
- Email validation before sending
- Rate limiting via Resend
- SPF/DKIM verification in production

## 📚 Resources

- [Resend Documentation](https://resend.com/docs)
- [React Email Components](https://react.email/docs/introduction)
- [Email Best Practices](https://resend.com/docs/send-with-nextjs)

