# Vercel Environment Variables Setup

## Required Variables for Production

Copy these into Vercel Dashboard → Settings → Environment Variables

### Database
```
POSTGRES_URL=postgresql://postgres.anzrhtachjvsrtulfntg:jayr%40und4SUPA@aws-1-us-east-1.pooler.supabase.com:6543/postgres
```

### Stripe Payment
```
STRIPE_SECRET_KEY=sk_test_51RAANsKVjsXNguSD8N3pxbUlRutlu5pVidpwzqPkXxCC5ruY2zh8ShHkUcQl1SwWMXIGgwSICQ0KfK2peyCMGnOd00V9HZDKCS
STRIPE_WEBHOOK_SECRET=whsec_691dd5d1dc1e2cacd237f2bca2f319d3713afb210062661713465c0a49e4901e
```

### App Configuration
```
BASE_URL=https://your-project-name.vercel.app
AUTH_SECRET=0c79312a65a2adf67aa329ef8f5dba07aa6c5a668b06ce8806ba1ea4d09799fd
```

### Email (Resend)
```
RESEND_API_KEY=re_Rdbn5HKC_4LtE1NLyhoeuXcTDCkmiSH3R
EMAIL_FROM=GEMflush <noreply@gemflush.com>
SUPPORT_EMAIL=support@gemflush.com
```

### External APIs
```
GOOGLE_SEARCH_API_KEY=AIzaSyBsEXNDk6n05faaJXbA6dq4oIMQ8Mzt190
```

### Optional (Add when ready)
```
GOOGLE_SEARCH_ENGINE_ID=your-cx-id-here
OPENROUTER_API_KEY=sk-or-v1-your-key-here
```

---

## Setup Instructions

### Option 1: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/dashboard
2. Select your project
3. Click **Settings** (top navigation)
4. Click **Environment Variables** (left sidebar)
5. For each variable above:
   - Click "Add New"
   - Name: `POSTGRES_URL`
   - Value: (paste value)
   - Environments: Check **Production** and **Preview**
   - Click "Save"

### Option 2: Vercel CLI (Faster)

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Link to project
vercel link

# Add variables interactively
vercel env add POSTGRES_URL production
# Paste: postgresql://postgres.anzrhtachjvsrtulfntg:...

vercel env add STRIPE_SECRET_KEY production
# Paste: sk_test_51RAANsKVjsXNguSD...

# ... repeat for each variable
```

---

## Important Notes

### 1. Never Commit `.env` to Git
- `.env` should stay in `.gitignore` ✅
- Vercel reads from its own secure vault
- Each environment (Production/Preview/Dev) can have different values

### 2. Update `BASE_URL` After First Deploy
```bash
# After your first Vercel deploy, update:
BASE_URL=https://your-actual-domain.vercel.app
```

### 3. Stripe Webhook URL
After deploying, update your Stripe webhook endpoint:
- Old: `http://localhost:3000/api/stripe/webhook`
- New: `https://your-app.vercel.app/api/stripe/webhook`

### 4. Database Migrations
Run migrations after first deploy:
```bash
# From local terminal (connected to production DB)
DATABASE_URL=postgresql://postgres.anzrhtachjvsrtulfntg... pnpm drizzle-kit push
```

---

## Verification

### Check Variables Are Set
```bash
# Via CLI
vercel env ls

# Or in dashboard:
Settings → Environment Variables → should see all variables
```

### Test in Production
1. Deploy to Vercel: `git push`
2. Visit your app: `https://your-app.vercel.app`
3. Check console for errors
4. Try logging in
5. Try creating a business

---

## Troubleshooting

### "Can't connect to database"
- Check `POSTGRES_URL` is set correctly
- Verify Supabase connection pooler is enabled
- Check Supabase allows connections from Vercel IPs

### "Stripe webhook signature invalid"
- Update webhook URL in Stripe dashboard
- Verify `STRIPE_WEBHOOK_SECRET` matches Stripe

### "Email sending failed"
- Verify `RESEND_API_KEY` is correct
- Check Resend dashboard for errors
- Verify `EMAIL_FROM` domain is verified in Resend

### "OpenRouter not working"
- This is expected if `OPENROUTER_API_KEY` not set
- App will use mock responses (limited functionality)
- Add key when ready to enable LLM features

---

## Security Best Practices

1. **Rotate secrets regularly** (every 90 days)
2. **Use different keys for staging vs production**
3. **Never log environment variables** in production
4. **Review access logs** in Vercel dashboard
5. **Enable Vercel's Secret Scanning** (auto-enabled)

---

## Quick Copy-Paste for CLI

```bash
# Add all required variables at once
vercel env add POSTGRES_URL production
vercel env add STRIPE_SECRET_KEY production
vercel env add STRIPE_WEBHOOK_SECRET production
vercel env add BASE_URL production
vercel env add AUTH_SECRET production
vercel env add RESEND_API_KEY production
vercel env add EMAIL_FROM production
vercel env add SUPPORT_EMAIL production
vercel env add GOOGLE_SEARCH_API_KEY production

# Redeploy to pick up changes
vercel --prod
```

---

## After Setup Checklist

- [ ] All environment variables added to Vercel
- [ ] `BASE_URL` updated to production domain
- [ ] Database migrations run on production
- [ ] Stripe webhook URL updated
- [ ] Test login functionality
- [ ] Test payment flow
- [ ] Test email sending
- [ ] Verify dashboard loads
- [ ] Check business creation works

---

## Need Help?

- **Vercel Docs:** https://vercel.com/docs/environment-variables
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Check Deployment Logs:** Project → Deployments → Click deployment → View logs

