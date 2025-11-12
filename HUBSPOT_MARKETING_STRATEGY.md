# HubSpot Marketing Strategy: Multi-Channel Customer Acquisition
## GEMflush - Vertical-Specific Marketing Automation

**Version:** 1.0.0  
**Last Updated:** November 2024  
**Platform:** HubSpot Marketing Hub Starter ($20/month)  
**Target Verticals:** Medical Clinics, Legal Firms, Real Estate Agencies, Cannabis Dispensaries

---

## Executive Summary

This document outlines a comprehensive, multi-channel automated marketing strategy designed to minimize Customer Acquisition Cost (CAC) and maximize Lifetime Value (LTV) for GEMflush's beachhead markets. The strategy leverages HubSpot Marketing Hub Starter's $20/month tier to create industry-specific funnels, automated nurture sequences, and conversion-optimized workflows.

### Key Objectives
- **Minimize CAC:** Target <$50 per customer acquisition
- **Maximize LTV:** Focus on Pro tier conversions ($49/month = $588/year)
- **Automate Everything:** Reduce manual marketing work by 80%
- **Vertical Focus:** Hyper-targeted messaging for 4 specific industries

---

## LTV Analysis & Financial Model

### Revenue Tiers

| Tier | Monthly Price | Annual LTV | Target CAC | LTV:CAC Ratio |
|------|---------------|------------|-----------|---------------|
| **Free** | $0 | $0 | N/A | N/A |
| **Pro** | $49 | $588 | $45 | 13:1 |
| **Agency** | $149 | $1,788 | $100 | 18:1 |

### Target Metrics

- **Target CAC:** $45 (10:1 LTV:CAC ratio minimum)
- **Conversion Rate:** 10-15% (lead → customer)
- **Monthly Churn:** <5% (target)
- **Average Customer Lifetime:** 12 months
- **Payback Period:** <2 months

---

## Industry-Specific Pain Points & Messaging

### 1. Medical Clinics

#### Pain Points
- **AI-Powered Patient Queries:** 72% of patients now ask ChatGPT/Claude for healthcare recommendations
- **Competitive Visibility:** Competitors appear in AI responses, you don't
- **HIPAA Compliance:** Need compliant visibility solutions
- **Patient Acquisition Cost:** Traditional marketing is expensive ($200-500 per patient)
- **Trust Building:** Need authoritative presence in knowledge graphs

#### Core Messaging
- **Primary:** "When patients ask AI 'best [specialty] near me,' will you be recommended?"
- **Secondary:** "HIPAA-compliant AI visibility that builds trust and drives patient acquisition"
- **Tertiary:** "Get found by patients using ChatGPT for healthcare recommendations"

#### Value Propositions
1. **Patient Acquisition:** Reduce patient acquisition costs by appearing in AI recommendations
2. **Trust & Authority:** Build verified presence in knowledge graphs that power AI systems
3. **Competitive Advantage:** Outrank competitors in AI-powered search results
4. **Compliance:** HIPAA-compliant visibility solutions

#### Use Cases
- New patient acquisition
- Specialty practice visibility
- Multi-location clinic management
- Telehealth practice marketing

---

### 2. Legal Firms

#### Pain Points
- **Reputation Management:** Critical for law firm success
- **Referral-Based Business:** Most clients come from referrals
- **Local Competition:** Intense competition in local markets
- **Authority Building:** Need to appear authoritative and trustworthy
- **Client Education:** Clients increasingly use AI for legal questions

#### Core Messaging
- **Primary:** "Control how AI systems describe your firm's expertise and reputation"
- **Secondary:** "Appear in ChatGPT when potential clients ask for legal help"
- **Tertiary:** "Build authority in knowledge graphs that power AI assistants"

#### Value Propositions
1. **Reputation Control:** Ensure AI systems accurately represent your firm
2. **Client Acquisition:** Get recommended when potential clients ask AI for legal help
3. **Authority Building:** Establish verified presence in knowledge graphs
4. **Competitive Positioning:** Outrank competitors in AI-powered recommendations

#### Use Cases
- Personal injury law firms
- Family law practices
- Corporate law firms
- Estate planning attorneys

---

### 3. Real Estate Agencies

#### Pain Points
- **Local SEO Competition:** Fierce competition for local search visibility
- **Agent Visibility:** Individual agent visibility matters more than agency
- **Listing Discoverability:** Listings need to be found by AI assistants
- **Mobile-First Searches:** Buyers use voice assistants and AI for property searches
- **Market Saturation:** Many agents competing for same leads

#### Core Messaging
- **Primary:** "Get your listings recommended by AI assistants when buyers search"
- **Secondary:** "When buyers ask 'best real estate agent in [city],' be the answer"
- **Tertiary:** "Structured data that makes you visible to AI-powered search"

#### Value Propositions
1. **Listing Visibility:** Get properties recommended by AI assistants
2. **Agent Authority:** Build individual agent presence in knowledge graphs
3. **Buyer Acquisition:** Appear when buyers ask AI for agent recommendations
4. **Competitive Edge:** Stand out in AI-powered real estate searches

#### Use Cases
- Individual real estate agents
- Real estate agencies
- Property management companies
- Real estate investment firms

---

### 4. Cannabis Dispensaries

#### Pain Points
- **Regulatory Compliance:** Must comply with strict regulations
- **Local Restrictions:** Varying local laws and restrictions
- **Trust & Legitimacy:** Building trust in a regulated industry
- **Customer Education:** Customers need education about products
- **Marketing Restrictions:** Limited traditional marketing options

#### Core Messaging
- **Primary:** "Compliant AI visibility for regulated cannabis businesses"
- **Secondary:** "Get recommended when customers ask AI about dispensaries"
- **Tertiary:** "Build trust through verified knowledge graph presence"

#### Value Propositions
1. **Compliance:** Regulatory-compliant visibility solutions
2. **Customer Acquisition:** Get recommended when customers ask AI about dispensaries
3. **Trust Building:** Establish legitimate presence in knowledge graphs
4. **Education:** Help customers find accurate information about your business

#### Use Cases
- Recreational dispensaries
- Medical cannabis dispensaries
- Cannabis delivery services
- Cannabis cultivation facilities

---

## Multi-Channel Acquisition Strategy

### Channel 1: Industry-Specific Landing Pages (HubSpot)

#### Landing Page Structure

**4 Dedicated Landing Pages:**

1. `/medical-clinics-ai-visibility`
2. `/legal-firms-ai-visibility`
3. `/real-estate-agents-ai-visibility`
4. `/cannabis-dispensaries-ai-visibility`

#### Each Landing Page Includes:

**Hero Section:**
- Industry-specific headline addressing main pain point
- Subheadline with value proposition
- Primary CTA: "Get Your Free AI Visibility Score"
- Trust indicators (HIPAA, compliance badges, etc.)

**Problem Agitation:**
- Industry-specific problem statement
- Statistics relevant to the vertical
- Visual comparison (with/without GEMflush)

**Solution Overview:**
- How GEMflush solves industry-specific problems
- Step-by-step process
- Visual workflow diagram

**Case Study/Testimonial:**
- Real example from the same vertical
- Before/after metrics
- Customer quote

**Features Section:**
- Industry-specific features
- Compliance/regulatory mentions
- Integration capabilities

**FAQ Section:**
- Industry-specific questions
- Compliance questions
- Pricing questions

**Form:**
- "Get Your Free AI Visibility Score"
- Fields: Email, First Name, Company Name, Phone (optional)
- Industry pre-selected based on landing page
- Privacy policy link

#### API Integration

```typescript
// lib/integrations/hubspot-vertical-funnels.ts

export type Vertical = 'medical' | 'legal' | 'real_estate' | 'cannabis';

interface VerticalLeadData {
  email: string;
  firstName: string;
  companyName: string;
  vertical: Vertical;
  source: string;
  location?: string;
  phone?: string;
}

/**
 * Capture lead from vertical-specific landing page
 */
export async function captureVerticalLead(data: VerticalLeadData) {
  // 1. Create contact with vertical segmentation
  const contact = await createOrUpdateHubSpotContact({
    email: data.email,
    firstname: data.firstName,
    company: data.companyName,
    phone: data.phone,
    industry_vertical: data.vertical,
    lead_source: `landing_page_${data.vertical}`,
    lifecyclestage: 'lead',
    funnel_stage: 'awareness',
    location: data.location,
  });

  // 2. Track conversion
  await trackHubSpotEvent(data.email, 'vertical_lead_captured', {
    vertical: data.vertical,
    source: data.source,
    timestamp: new Date().toISOString(),
  });

  // 3. Enroll in vertical-specific nurture sequence
  await updateHubSpotContact(data.email, {
    [`${data.vertical}_nurture_enrolled`]: 'true',
  });

  return contact;
}
```

---

### Channel 2: Content Marketing (SEO + HubSpot)

#### Content Strategy by Vertical

**Medical Clinics:**
- "How Medical Practices Can Get Found by AI Health Assistants"
- "HIPAA-Compliant AI Visibility for Healthcare Providers"
- "Patient Acquisition in the Age of ChatGPT: A Medical Practice Guide"
- "The Future of Healthcare Marketing: AI-Powered Patient Discovery"
- "Case Study: How [Clinic Name] Increased Patient Referrals by 340%"

**Legal Firms:**
- "How Law Firms Can Control Their AI-Generated Reputation"
- "Getting Recommended by AI When Clients Need Legal Help"
- "Knowledge Graph Authority for Law Firms: A Complete Guide"
- "The New Referral Source: AI-Powered Legal Recommendations"
- "Case Study: [Law Firm] Dominates ChatGPT Legal Recommendations"

**Real Estate:**
- "How Real Estate Agents Get Recommended by AI Assistants"
- "Local SEO vs AI Visibility: The Future of Real Estate Marketing"
- "Getting Your Listings Found by AI-Powered Search"
- "Voice Search Optimization for Real Estate Agents"
- "Case Study: [Agent Name] Gets 50% More Leads from AI"

**Cannabis:**
- "Compliant AI Visibility for Cannabis Businesses"
- "Building Trust Through Knowledge Graph Presence"
- "Getting Recommended When Customers Ask AI About Dispensaries"
- "Regulatory-Compliant Marketing for Cannabis Dispensaries"
- "Case Study: [Dispensary] Increases Foot Traffic by 200%"

#### Content Distribution

1. **HubSpot Blog:** Primary content hub
2. **Gated Content:** Premium guides behind forms
3. **Email Sequences:** Content in nurture emails
4. **Social Media:** LinkedIn, Facebook, Twitter
5. **SEO Optimization:** Target industry-specific keywords

#### Content Download Workflow

```
User Downloads Content
    ↓
HubSpot Form Submission
    ↓
API: captureVerticalLead()
    ↓
Enroll in Content Nurture Sequence
    ↓
Track Content Engagement
    ↓
Lead Scoring Based on Engagement
```

---

### Channel 3: LinkedIn Ads → HubSpot Landing Pages

#### Targeting Strategy

**Medical Clinics:**
- Job Titles: Practice Manager, Clinic Owner, Healthcare Administrator, Medical Director
- Industries: Healthcare, Medical Practice, Hospital
- Company Size: 1-50 employees
- Geographic: Target specific cities/states
- Interests: Healthcare Marketing, Patient Acquisition

**Legal Firms:**
- Job Titles: Law Firm Partner, Marketing Director, Managing Partner, Attorney
- Industries: Legal Services, Law Firm
- Company Size: 1-50 employees
- Geographic: Target specific cities/states
- Interests: Legal Marketing, Client Acquisition

**Real Estate:**
- Job Titles: Real Estate Broker, Agency Owner, Real Estate Agent, Broker
- Industries: Real Estate, Property Management
- Company Size: 1-50 employees
- Geographic: Target specific cities/states
- Interests: Real Estate Marketing, Lead Generation

**Cannabis:**
- Job Titles: Dispensary Owner, Operations Manager, Compliance Officer
- Industries: Cannabis, Retail
- Company Size: 1-50 employees
- Geographic: States where cannabis is legal
- Interests: Cannabis Business, Retail Marketing

#### Ad Creative Strategy

**Ad Format:** Single Image or Carousel

**Ad Copy Template:**
```
Headline: "[Industry] AI Visibility: Get Found by ChatGPT"
Description: "When [target audience] ask AI for [service], will you be recommended? Get your free AI visibility score."
CTA: "Get Free Score"
```

**Landing Page:** Same HubSpot landing pages as Channel 1

#### Conversion Tracking

- Track LinkedIn ad clicks → Landing page views
- Track form submissions → HubSpot contacts
- Track conversions → Customer signups
- Calculate CAC per campaign

---

### Channel 4: Google Search Ads (Industry Keywords)

#### Keyword Strategy by Vertical

**Medical Clinics:**
- "medical practice AI visibility"
- "healthcare ChatGPT recommendations"
- "clinic patient acquisition AI"
- "medical practice knowledge graph"
- "HIPAA compliant AI marketing"

**Legal Firms:**
- "law firm AI reputation"
- "legal practice ChatGPT visibility"
- "lawyer knowledge graph"
- "law firm AI marketing"
- "attorney AI visibility"

**Real Estate:**
- "real estate agent AI visibility"
- "agent ChatGPT recommendations"
- "real estate knowledge graph"
- "agent AI marketing"
- "real estate listings AI"

**Cannabis:**
- "cannabis dispensary AI visibility"
- "compliant dispensary marketing"
- "cannabis business knowledge graph"
- "dispensary AI marketing"
- "cannabis retail AI visibility"

#### Ad Groups

Create separate ad groups for each vertical with:
- 5-10 keywords per group
- Match types: Broad, Phrase, Exact
- Negative keywords to exclude irrelevant traffic

#### Landing Pages

Same HubSpot landing pages as Channel 1

#### Bid Strategy

- Start with manual CPC
- Target $2-5 per click
- Adjust based on conversion data
- Move to Target CPA when enough data

---

### Channel 5: Retargeting (Facebook/LinkedIn)

#### Retargeting Strategy

**Audience Segments:**
1. Website visitors (all pages)
2. Landing page visitors (didn't convert)
3. Pricing page visitors (high intent)
4. Blog/content readers (engaged)

#### Ad Creative

**Format:** Carousel or Single Image

**Creative Types:**
1. **Case Study:** Industry-specific success story
2. **Problem/Solution:** Address pain point
3. **Social Proof:** Testimonials, reviews
4. **Urgency:** Limited-time offers

#### Retargeting Sequences

**Sequence 1: General Visitors**
- Ad 1: "You Visited GEMflush - Here's What You Missed"
- Ad 2: "See How [Competitor] Gets Recommended by AI"
- Ad 3: "Get Your Free AI Visibility Score"

**Sequence 2: Pricing Page Visitors (High Intent)**
- Ad 1: "You Checked Out Our Pricing - Here's a Special Offer"
- Ad 2: "20% Off Your First Month - Limited Time"
- Ad 3: "Last Chance: Your Discount Expires Today"

**Sequence 3: Content Readers**
- Ad 1: "You Read About AI Visibility - Here's Your Next Step"
- Ad 2: "Get Your Free Score Based on What You Learned"
- Ad 3: "See How It Works for [Your Industry]"

---

## Automated Nurture Sequences (HubSpot Workflows)

### Medical Clinics Sequence (5 Emails)

**Workflow Trigger:** Contact property "medical_nurture_enrolled" = true

**Email 1 (Immediate):**
- **Subject:** "Your Free AI Visibility Score for Medical Practices"
- **Content:**
  - Welcome message
  - Link to sign up for free account
  - Key statistic: "72% of patients now ask AI for healthcare recommendations"
  - Value proposition: HIPAA-compliant visibility
- **CTA:** "Get Your Free Score"

**Email 2 (Day 2):**
- **Subject:** "How [Competitor Clinic] Gets Recommended by ChatGPT"
- **Content:**
  - Case study from medical practice
  - Before/after metrics
  - Problem agitation: "Are you losing patients to competitors?"
- **CTA:** "See Your Score"

**Email 3 (Day 5):**
- **Subject:** "HIPAA-Compliant AI Visibility: What It Means for Your Practice"
- **Content:**
  - Compliance angle
  - Trust building
  - Security and privacy
- **CTA:** "Learn More"

**Email 4 (Day 8):**
- **Subject:** "See Your Actual AI Visibility Score (Free)"
- **Content:**
  - Direct CTA
  - Social proof
  - Easy sign-up process
- **CTA:** "Get Started Free"

**Email 5 (Day 12):**
- **Subject:** "Last Chance: Your Free Score Expires Soon"
- **Content:**
  - Urgency
  - Final value proposition
  - Clear next steps
- **CTA:** "Claim Your Free Score"

---

### Legal Firms Sequence (5 Emails)

**Workflow Trigger:** Contact property "legal_nurture_enrolled" = true

**Email 1 (Immediate):**
- **Subject:** "Control How AI Describes Your Law Firm"
- **Content:**
  - Reputation control angle
  - Link to sign up
  - Authority building value
- **CTA:** "Get Your Free Score"

**Email 2 (Day 2):**
- **Subject:** "When Clients Ask ChatGPT for Legal Help, Will You Appear?"
- **Content:**
  - Problem statement
  - Case study from law firm
  - Competitive angle
- **CTA:** "See Your Visibility"

**Email 3 (Day 5):**
- **Subject:** "Building Authority in Knowledge Graphs"
- **Content:**
  - Educational content
  - Authority building
  - Trust establishment
- **CTA:** "Learn More"

**Email 4 (Day 8):**
- **Subject:** "Get Your Free AI Visibility Score"
- **Content:**
  - Direct CTA
  - Social proof
  - Easy process
- **CTA:** "Start Free"

**Email 5 (Day 12):**
- **Subject:** "Your Competitors Are Already There"
- **Content:**
  - FOMO angle
  - Urgency
  - Competitive pressure
- **CTA:** "Don't Get Left Behind"

---

### Real Estate Sequence (5 Emails)

**Workflow Trigger:** Contact property "real_estate_nurture_enrolled" = true

**Email 1 (Immediate):**
- **Subject:** "Get Your Listings Recommended by AI Assistants"
- **Content:**
  - Listings angle
  - Link to sign up
  - Buyer behavior statistics
- **CTA:** "Get Your Free Score"

**Email 2 (Day 2):**
- **Subject:** "When Buyers Ask 'Best Agent in [City],' Be the Answer"
- **Content:**
  - Local SEO + AI angle
  - Case study from real estate agent
  - Competitive advantage
- **CTA:** "See How It Works"

**Email 3 (Day 5):**
- **Subject:** "How Top Agents Use Knowledge Graphs"
- **Content:**
  - Educational content
  - Examples from successful agents
  - Best practices
- **CTA:** "Learn More"

**Email 4 (Day 8):**
- **Subject:** "See Your AI Visibility Score (Free)"
- **Content:**
  - Direct CTA
  - Social proof
  - Easy sign-up
- **CTA:** "Start Free"

**Email 5 (Day 12):**
- **Subject:** "Don't Let Competitors Get There First"
- **Content:**
  - Urgency
  - Competitive pressure
  - Final value prop
- **CTA:** "Claim Your Score"

---

### Cannabis Dispensaries Sequence (5 Emails)

**Workflow Trigger:** Contact property "cannabis_nurture_enrolled" = true

**Email 1 (Immediate):**
- **Subject:** "Compliant AI Visibility for Cannabis Businesses"
- **Content:**
  - Compliance angle
  - Link to sign up
  - Regulatory focus
- **CTA:** "Get Your Free Score"

**Email 2 (Day 2):**
- **Subject:** "Building Trust Through Verified Knowledge Graph Presence"
- **Content:**
  - Trust building
  - Legitimacy angle
  - Case study from dispensary
- **CTA:** "See Your Visibility"

**Email 3 (Day 5):**
- **Subject:** "When Customers Ask AI About Dispensaries, Get Recommended"
- **Content:**
  - Customer acquisition angle
  - Educational content
  - Value proposition
- **CTA:** "Learn More"

**Email 4 (Day 8):**
- **Subject:** "Get Your Free AI Visibility Score"
- **Content:**
  - Direct CTA
  - Social proof
  - Easy process
- **CTA:** "Start Free"

**Email 5 (Day 12):**
- **Subject:** "Regulatory-Compliant Marketing That Works"
- **Content:**
  - Compliance + results
  - Urgency
  - Final CTA
- **CTA:** "Get Started"

---

## High-Intent Retargeting Sequences

### Trigger: Pricing Page Visitors (2+ Views)

**Workflow Trigger:** Contact property "pricing_page_views" >= 2

**Email 1 (Immediate):**
- **Subject:** "You've Been Checking Out GEMflush Pro..."
- **Content:**
  - Acknowledge their interest
  - Industry-specific benefits
  - Special offer (if applicable)
- **CTA:** "Upgrade to Pro"

**Email 2 (Day 1):**
- **Subject:** "[Industry] Special: 20% Off First Month"
- **Content:**
  - Discount code
  - Value proposition
  - Checkout link
- **CTA:** "Claim Your Discount"

**Email 3 (Day 3):**
- **Subject:** "Last Chance: Your Discount Expires Today"
- **Content:**
  - Final urgency
  - Clear value
  - Easy checkout
- **CTA:** "Upgrade Now"

---

## Conversion Optimization

### Lead Scoring System

#### Vertical-Specific Scoring Weights

**Medical Clinics:**
- Pricing page views: 15 points each
- Content views: 8 points each
- Email clicks: 10 points each
- Form submissions: 20 points
- Free trial started: 40 points

**Legal Firms:**
- Pricing page views: 12 points each
- Content views: 10 points each
- Email clicks: 8 points each
- Form submissions: 20 points
- Free trial started: 40 points

**Real Estate:**
- Pricing page views: 10 points each
- Content views: 12 points each
- Email clicks: 10 points each
- Form submissions: 20 points
- Free trial started: 40 points

**Cannabis:**
- Pricing page views: 18 points each
- Content views: 6 points each
- Email clicks: 12 points each
- Form submissions: 20 points
- Free trial started: 40 points

#### High-Intent Signals

- 3+ pricing page views: +30 points
- Free trial started: +40 points
- Fingerprint completed: +25 points
- Business added: +15 points
- Multiple email opens: +10 points

#### Lead Score Thresholds

- **Hot Leads (70-100):** Enroll in high-intent retargeting, personal outreach
- **Warm Leads (40-69):** Continue nurture sequence, additional content
- **Cold Leads (0-39):** Long-term nurture, monthly re-engagement

---

### Smart Segmentation

#### Segments by Engagement

**Hot Leads:**
- Score: 70+
- Actions: High-intent retargeting, special offers, personal outreach
- Goal: Convert within 7 days

**Warm Leads:**
- Score: 40-69
- Actions: Continue nurture, additional content, case studies
- Goal: Convert within 30 days

**Cold Leads:**
- Score: <40
- Actions: Long-term nurture, monthly re-engagement, educational content
- Goal: Convert within 90 days

#### Segments by Vertical

- Medical Clinics
- Legal Firms
- Real Estate
- Cannabis Dispensaries

#### Segments by Lifecycle Stage

- Leads (not yet customers)
- Customers (free tier)
- Customers (pro tier)
- Customers (agency tier)

---

## LTV Maximization Strategy

### 1. Onboarding Sequence (Post-Signup)

**All Verticals (5 Emails):**

**Email 1 (Immediate):**
- Welcome message
- First steps guide
- Link to add first business
- Video tutorial link

**Email 2 (Day 1):**
- How to run first fingerprint
- Step-by-step guide
- Best practices
- Support resources

**Email 3 (Day 3):**
- Understanding your score
- What the numbers mean
- How to interpret results
- Next steps

**Email 4 (Day 7):**
- Pro features preview
- Upgrade benefits
- Soft upgrade CTA
- Success stories

**Email 5 (Day 14):**
- Success stories from your vertical
- Stronger upgrade CTA
- Special offer (if applicable)
- Support contact

---

### 2. Usage-Based Upsell Triggers

**Trigger Conditions:**
- Free tier user
- 3+ fingerprints completed OR
- 2+ businesses added

**Upsell Sequence:**
1. Acknowledge high usage
2. Show Pro features they're missing
3. Industry-specific benefits
4. Special upgrade offer
5. Final CTA

---

### 3. Churn Prevention

**Trigger:** No activity for 30 days

**Re-engagement Sequence:**
1. "We Miss You - Here's What's New"
2. "Your AI Visibility Might Have Changed"
3. "Last Chance: Don't Lose Your Data"

---

### 4. Agency Upsell (High-Value Accounts)

**Trigger:** Pro user with 5 businesses (at limit)

**Agency Upsell Sequence:**
1. "Ready to Scale? Upgrade to Agency"
2. "Manage 25 Businesses from One Dashboard"
3. "Perfect for [Industry] Agencies"
4. Special agency pricing

---

## Complete API Service Implementation

### File: `lib/integrations/hubspot-vertical-marketing.ts`

```typescript
import { 
  createOrUpdateHubSpotContact, 
  trackHubSpotEvent, 
  updateHubSpotContact, 
  getHubSpotContact 
} from './hubspot-funnels';

export type Vertical = 'medical' | 'legal' | 'real_estate' | 'cannabis';

interface VerticalLeadData {
  email: string;
  firstName: string;
  companyName: string;
  vertical: Vertical;
  source: string;
  location?: string;
  phone?: string;
}

/**
 * Industry-specific lead capture
 */
export async function captureVerticalLead(data: VerticalLeadData) {
  const contact = await createOrUpdateHubSpotContact({
    email: data.email,
    firstname: data.firstName,
    company: data.companyName,
    phone: data.phone,
    industry_vertical: data.vertical,
    lead_source: `landing_page_${data.vertical}`,
    lifecyclestage: 'lead',
    funnel_stage: 'awareness',
    location: data.location,
    [`${data.vertical}_lead`]: 'true',
    [`${data.vertical}_nurture_enrolled`]: 'true',
  });

  await trackHubSpotEvent(data.email, 'vertical_lead_captured', {
    vertical: data.vertical,
    source: data.source,
    timestamp: new Date().toISOString(),
  });

  return contact;
}

/**
 * Track vertical-specific engagement
 */
export async function trackVerticalEngagement(
  email: string,
  vertical: Vertical,
  action: string
) {
  await trackHubSpotEvent(email, `${vertical}_${action}`, {
    vertical,
    timestamp: new Date().toISOString(),
  });

  const score = await calculateVerticalLeadScore(email, vertical);
  await updateHubSpotContact(email, {
    engagement_score: score.toString(),
    [`${vertical}_engagement_score`]: score.toString(),
    last_activity_date: new Date().toISOString(),
  });

  if (score >= 70) {
    await updateHubSpotContact(email, {
      hot_lead: 'true',
      funnel_stage: 'high_intent',
    });
  }
}

/**
 * Convert vertical lead to customer
 */
export async function convertVerticalLeadToCustomer(
  email: string,
  vertical: Vertical,
  planTier: string
) {
  await updateHubSpotContact(email, {
    lifecyclestage: 'customer',
    plan_tier: planTier,
    customer_since: new Date().toISOString(),
    industry_vertical: vertical,
    funnel_stage: 'converted',
    [`${vertical}_customer`]: 'true',
  });

  await trackHubSpotEvent(email, 'vertical_customer_converted', {
    vertical,
    plan_tier: planTier,
    conversion_source: `landing_page_${vertical}`,
  });

  await updateHubSpotContact(email, {
    onboarding_sequence_enrolled: 'true',
    [`${vertical}_onboarding_enrolled`]: 'true',
  });

  if (planTier === 'pro') {
    await createHubSpotDeal({
      contactEmail: email,
      dealName: `GEMflush Pro - ${vertical}`,
      amount: 49,
      stage: 'closed-won',
    });
  }
}

/**
 * Calculate vertical-specific lead score
 */
export async function calculateVerticalLeadScore(
  email: string,
  vertical: Vertical
): Promise<number> {
  const contact = await getHubSpotContact(email);
  if (!contact) return 0;

  const props = contact.properties || {};
  let score = 0;

  const verticalWeights = {
    medical: { pricing_views: 15, content_views: 8, email_clicks: 10 },
    legal: { pricing_views: 12, content_views: 10, email_clicks: 8 },
    real_estate: { pricing_views: 10, content_views: 12, email_clicks: 10 },
    cannabis: { pricing_views: 18, content_views: 6, email_clicks: 12 },
  };

  const weights = verticalWeights[vertical];

  if (props.pricing_page_views) {
    score += parseInt(props.pricing_page_views) * weights.pricing_views;
  }
  if (props.content_engagement_count) {
    score += parseInt(props.content_engagement_count) * weights.content_views;
  }
  if (props.email_clicks) {
    score += parseInt(props.email_clicks) * weights.email_clicks;
  }

  if (parseInt(props.pricing_page_views || '0') >= 3) score += 30;
  if (props.free_trial_started === 'true') score += 40;
  if (props.fingerprint_completed) score += 25;

  return Math.min(score, 100);
}

/**
 * Track usage for upsell triggers
 */
export async function trackUsageForUpsell(email: string, action: string) {
  await trackHubSpotEvent(email, `usage_${action}`, {
    timestamp: new Date().toISOString(),
  });

  const contact = await getHubSpotContact(email);
  const props = contact?.properties || {};

  if (props.plan_tier === 'free') {
    const fingerprints = parseInt(props.fingerprints_completed || '0');
    const businesses = parseInt(props.businesses_added || '0');

    if (fingerprints >= 3 || businesses >= 2) {
      await updateHubSpotContact(email, {
        upgrade_candidate: 'true',
        high_usage_user: 'true',
      });
    }
  }
}

/**
 * Create deal in HubSpot
 */
async function createHubSpotDeal(data: {
  contactEmail: string;
  dealName: string;
  amount: number;
  stage: string;
}) {
  // Implementation from hubspot-funnels.ts
  // ...
}
```

---

## Expected Results & Metrics

### CAC Targets by Vertical

| Vertical | Target CAC | Expected LTV | LTV:CAC Ratio |
|----------|-----------|--------------|---------------|
| Medical | $45 | $588 | 13:1 |
| Legal | $50 | $588 | 12:1 |
| Real Estate | $40 | $588 | 15:1 |
| Cannabis | $55 | $588 | 11:1 |

### Channel Performance Expectations

| Channel | Expected CAC | Conversion Rate | Monthly Leads |
|---------|--------------|-----------------|---------------|
| Content/SEO | $20-30 | 2-3% | 50-75 |
| LinkedIn Ads | $40-60 | 1-2% | 30-50 |
| Google Ads | $50-80 | 1.5-2.5% | 40-60 |
| Retargeting | $25-40 | 3-5% | 20-30 |
| **Total** | **$35-50** | **10-15%** | **140-215** |

### Monthly Targets (First 3 Months)

**Month 1:**
- Leads: 100/month across all verticals
- Conversion Rate: 10%
- Customers: 10
- Average CAC: $45
- Total CAC: $450
- Revenue: $490 (10 × $49)
- Net: +$40

**Month 2:**
- Leads: 150/month
- Conversion Rate: 12%
- Customers: 18
- Average CAC: $40
- Total CAC: $720
- Revenue: $882
- Net: +$162

**Month 3:**
- Leads: 200/month
- Conversion Rate: 15%
- Customers: 30
- Average CAC: $35
- Total CAC: $1,050
- Revenue: $1,470
- Net: +$420

### 12-Month Projection

**Assumptions:**
- 5% monthly churn rate
- 10% monthly growth in leads
- 1% monthly improvement in conversion rate
- Average customer lifetime: 12 months

**Year 1 Totals:**
- Total Leads: 2,400
- Total Customers: 300
- Average CAC: $40
- Total CAC: $12,000
- Total Revenue: $147,000
- Net Profit: $135,000
- ROI: 1,125%

---

## Implementation Checklist

### Week 1: HubSpot Setup

- [ ] Create HubSpot Marketing Hub Starter account
- [ ] Set up custom properties:
  - `industry_vertical` (dropdown: medical, legal, real_estate, cannabis)
  - `funnel_stage` (dropdown: awareness, consideration, high_intent, converted)
  - `engagement_score` (number)
  - `hot_lead` (checkbox)
  - `upgrade_candidate` (checkbox)
  - `pricing_page_views` (number)
  - `content_engagement_count` (number)
  - `email_clicks` (number)
  - `fingerprints_completed` (number)
  - `businesses_added` (number)
- [ ] Create 4 landing pages (one per vertical)
- [ ] Create 4 forms (one per landing page)
- [ ] Install HubSpot tracking code in Next.js app
- [ ] Set up HubSpot API credentials

### Week 2: Email Sequences

- [ ] Create Medical Clinics nurture sequence (5 emails)
- [ ] Create Legal Firms nurture sequence (5 emails)
- [ ] Create Real Estate nurture sequence (5 emails)
- [ ] Create Cannabis nurture sequence (5 emails)
- [ ] Create onboarding sequence (5 emails)
- [ ] Create high-intent retargeting sequence (3 emails)
- [ ] Create upsell sequence (3 emails)
- [ ] Create churn prevention sequence (3 emails)
- [ ] Test all email sequences

### Week 3: Content Creation

- [ ] Create 4 blog posts (one per vertical)
- [ ] Create 4 case studies (one per vertical)
- [ ] Create 4 premium guides (gated content)
- [ ] Set up content download forms
- [ ] Create content download workflows
- [ ] Optimize content for SEO

### Week 4: API Integration

- [ ] Create `lib/integrations/hubspot-funnels.ts`
- [ ] Create `lib/integrations/hubspot-vertical-marketing.ts`
- [ ] Integrate with signup flow (`app/(login)/actions.ts`)
- [ ] Add page view tracking to pricing page
- [ ] Add event tracking to key user actions
- [ ] Set up lead scoring calculation
- [ ] Test API integration end-to-end

### Week 5: Paid Advertising

- [ ] Set up LinkedIn ad campaigns (4 campaigns, one per vertical)
- [ ] Set up Google Ads campaigns (4 campaigns, one per vertical)
- [ ] Set up Facebook retargeting pixels
- [ ] Create ad creatives for each vertical
- [ ] Set up conversion tracking
- [ ] Launch test campaigns

### Week 6: Testing & Optimization

- [ ] Test full funnel end-to-end for each vertical
- [ ] Verify email delivery and tracking
- [ ] Check API responses and error handling
- [ ] Test conversion tracking
- [ ] Optimize landing pages based on initial data
- [ ] A/B test email subject lines
- [ ] Review and adjust lead scoring weights

### Ongoing: Monitoring & Optimization

- [ ] Weekly review of CAC by channel
- [ ] Weekly review of conversion rates by vertical
- [ ] Monthly review of email performance
- [ ] Monthly optimization of ad campaigns
- [ ] Quarterly review of LTV by vertical
- [ ] Quarterly strategy adjustments

---

## Key Performance Indicators (KPIs)

### Acquisition Metrics

- **Leads per Month:** Target 200+
- **CAC by Channel:** Target <$50
- **CAC by Vertical:** Track and optimize
- **Conversion Rate:** Target 10-15%
- **Cost per Lead:** Target <$5

### Engagement Metrics

- **Email Open Rate:** Target 25-30%
- **Email Click Rate:** Target 5-10%
- **Content Engagement:** Track downloads, views
- **Website Engagement:** Track time on site, pages per session

### Conversion Metrics

- **Lead to Customer Rate:** Target 10-15%
- **Free to Pro Upgrade Rate:** Target 20-30%
- **Trial to Paid Rate:** Track if applicable
- **Time to Conversion:** Target <30 days

### Retention Metrics

- **Monthly Churn Rate:** Target <5%
- **Customer Lifetime:** Target 12+ months
- **LTV by Vertical:** Track and optimize
- **LTV:CAC Ratio:** Target 10:1 minimum

### Revenue Metrics

- **Monthly Recurring Revenue (MRR):** Track growth
- **Average Revenue Per User (ARPU):** Target $49+
- **Customer Acquisition Cost (CAC):** Target <$50
- **Lifetime Value (LTV):** Target $588+

---

## Success Criteria

### Month 1 Success Criteria

- [ ] 100+ leads captured
- [ ] 10+ customers converted
- [ ] Average CAC <$50
- [ ] All email sequences active
- [ ] All landing pages live
- [ ] API integration working

### Month 3 Success Criteria

- [ ] 200+ leads per month
- [ ] 30+ customers per month
- [ ] Average CAC <$40
- [ ] Conversion rate >12%
- [ ] Positive ROI
- [ ] All channels active

### Month 6 Success Criteria

- [ ] 300+ leads per month
- [ ] 45+ customers per month
- [ ] Average CAC <$35
- [ ] Conversion rate >15%
- [ ] Strong ROI (500%+)
- [ ] Optimized funnels

### Year 1 Success Criteria

- [ ] 2,400+ total leads
- [ ] 300+ total customers
- [ ] Average CAC <$40
- [ ] LTV:CAC ratio >10:1
- [ ] $100K+ ARR
- [ ] Profitable growth

---

## Risk Mitigation

### Potential Risks

1. **Low Conversion Rates**
   - Mitigation: A/B test landing pages, optimize email sequences
   - Action: Weekly review and optimization

2. **High CAC**
   - Mitigation: Focus on organic channels, optimize paid campaigns
   - Action: Monthly CAC review by channel

3. **Low Email Engagement**
   - Mitigation: Improve subject lines, segment better, personalize
   - Action: Weekly email performance review

4. **Ad Platform Changes**
   - Mitigation: Diversify channels, build organic presence
   - Action: Monitor platform updates, adjust strategy

5. **Competition**
   - Mitigation: Focus on vertical-specific messaging, unique value prop
   - Action: Quarterly competitive analysis

---

## Next Steps

1. **Review this strategy** with team
2. **Approve budget** for HubSpot and ad spend
3. **Assign responsibilities** for implementation
4. **Set up HubSpot account** and configure
5. **Begin Week 1 tasks** from implementation checklist
6. **Launch test campaigns** in Week 5
7. **Monitor and optimize** continuously

---

**Document Version:** 1.0.0  
**Last Updated:** November 2024  
**Status:** Ready for Implementation  
**Owner:** Marketing Team

