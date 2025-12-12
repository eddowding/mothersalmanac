# Mother's Almanac - Deployment Guide

Comprehensive guide to deploying Mother's Almanac to production.

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Supabase Setup](#supabase-setup)
3. [Vercel Deployment](#vercel-deployment)
4. [Environment Configuration](#environment-configuration)
5. [Post-Deployment](#post-deployment)
6. [Monitoring & Maintenance](#monitoring--maintenance)
7. [Troubleshooting](#troubleshooting)

## Pre-Deployment Checklist

Before deploying, ensure you have:

- [ ] Supabase project created
- [ ] Anthropic API key obtained
- [ ] Vercel account set up
- [ ] Domain name (optional)
- [ ] All code committed to Git
- [ ] Environment variables documented
- [ ] Database migrations tested locally

## Supabase Setup

### 1. Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: mothersalmanac
   - **Database Password**: Generate a strong password (save it!)
   - **Region**: Choose closest to your users
   - **Pricing Plan**: Start with Free tier

### 2. Run Database Migrations

Using Supabase MCP (recommended):

```bash
# All migrations are in /supabase/migrations/
# Use Supabase MCP to execute them in order
```

Or using Supabase CLI:

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Push migrations
supabase db push
```

### 3. Set Up Storage Buckets

1. Go to Storage in Supabase dashboard
2. Create bucket: `documents`
   - Public: No
   - File size limit: 50MB
   - Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

### 4. Configure RLS Policies

RLS policies are included in migrations, but verify:

```sql
-- Verify wiki_cache is publicly readable
SELECT * FROM pg_policies WHERE tablename = 'wiki_cache';

-- Should show policies for:
-- - Public read access
-- - Admin write access
```

### 5. Set Up Auth Providers

1. Go to Authentication > Providers
2. Enable Email provider
3. Configure email templates (optional)
4. Add redirect URLs (you'll update this after Vercel deployment)

### 6. Get API Keys

1. Go to Settings > API
2. Copy:
   - **Project URL** (NEXT_PUBLIC_SUPABASE_URL)
   - **anon/public key** (NEXT_PUBLIC_SUPABASE_ANON_KEY)
   - **service_role key** (SUPABASE_SERVICE_ROLE_KEY)

## Vercel Deployment

### 1. Connect GitHub Repository

1. Go to [https://vercel.com](https://vercel.com)
2. Click "Add New Project"
3. Import your Git repository
4. Select the repository

### 2. Configure Project Settings

- **Framework Preset**: Next.js
- **Root Directory**: ./
- **Build Command**: `npm run build`
- **Output Directory**: .next
- **Install Command**: `npm install`

### 3. Add Environment Variables

In Vercel dashboard, go to Settings > Environment Variables:

**Required Variables:**

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Site
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Anthropic
ANTHROPIC_API_KEY=sk-ant-api03-...

# Cron Security (generate with: openssl rand -base64 32)
CRON_SECRET=your-secure-random-string

# Claude Model
CLAUDE_MODEL=claude-3-5-sonnet-20241022
CLAUDE_MAX_TOKENS=4000
```

**Optional Variables:**

```bash
# Wiki Configuration
WIKI_CACHE_TTL_HOURS=48
WIKI_MAX_CACHED_PAGES=1000
WIKI_REGEN_BATCH_SIZE=10
WIKI_POPULAR_THRESHOLD=10
WIKI_LOW_CONFIDENCE_THRESHOLD=0.4
WIKI_MIN_PUBLISH_CONFIDENCE=0.3

# Analytics
WIKI_ENABLE_ANALYTICS=true

# App Version
NEXT_PUBLIC_APP_VERSION=1.0.0
```

### 4. Deploy

Click "Deploy" and wait for build to complete (2-3 minutes).

### 5. Configure Custom Domain (Optional)

1. Go to Settings > Domains
2. Add your custom domain
3. Follow DNS configuration instructions
4. Wait for SSL certificate provisioning

## Environment Configuration

### Update Supabase Redirect URLs

1. Go to Supabase Dashboard > Authentication > URL Configuration
2. Add to "Redirect URLs":
   ```
   http://localhost:3000/auth/callback
   https://yourdomain.com/auth/callback
   https://yourapp.vercel.app/auth/callback
   ```

### Configure Vercel Cron Jobs

Cron jobs are defined in `vercel.json`. Verify they're active:

1. Go to Vercel Dashboard > Crons
2. You should see:
   - `/api/cron/regenerate-stale` - Every 6 hours
   - `/api/cron/cleanup` - Daily at 2 AM
   - `/api/cron/stats` - Daily at midnight

### Set Up Cron Authentication

The cron endpoints are protected with `CRON_SECRET`. Vercel automatically adds the secret to cron requests.

To manually test a cron endpoint:

```bash
curl -X GET https://yourdomain.com/api/cron/regenerate-stale \
  -H "Authorization: Bearer your-cron-secret"
```

## Post-Deployment

### 1. Verify Health Check

```bash
curl https://yourdomain.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2025-12-11T00:00:00.000Z",
  "checks": {
    "database": { "status": "healthy", "latency": 45 },
    "anthropic": { "status": "configured" },
    "supabase": { "status": "configured" }
  },
  "metrics": {
    "totalPages": 0,
    "pagesGeneratedToday": 0
  }
}
```

### 2. Create Admin User

1. Go to `https://yourdomain.com/auth/signup`
2. Sign up with your email
3. Check email for confirmation link
4. Go to Supabase Dashboard > Table Editor > `user_profiles`
5. Find your user and update `role` to `'admin'`

### 3. Test Wiki Generation

1. Go to homepage
2. Enter a test topic (e.g., "artificial intelligence")
3. Wait for generation (15-30 seconds)
4. Verify page displays correctly
5. Check `/admin/dashboard` for analytics

### 4. Test Document Upload

1. Go to `/admin/documents`
2. Upload a test PDF
3. Verify processing completes
4. Test RAG query with document content

### 5. Verify Cron Jobs

Wait for first cron execution or trigger manually:

```bash
# Trigger regenerate-stale
curl -X GET https://yourdomain.com/api/cron/regenerate-stale \
  -H "Authorization: Bearer your-cron-secret"

# Check Vercel logs
vercel logs --follow
```

### 6. Set Up Analytics Tables

The first cron run will create analytics tables. Verify:

```sql
-- Check tables exist
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'analytics_%';

-- Should return:
-- analytics_page_views
-- analytics_searches
-- analytics_generations
-- analytics_costs
-- analytics_daily_stats
-- analytics_costs_daily
```

## Monitoring & Maintenance

### Daily Monitoring

**Check Dashboard:**
- Visit `/admin/dashboard` daily
- Review key metrics:
  - Page views trend
  - Generation success rate
  - Cost per day
  - System health

**Review Logs:**
```bash
# View Vercel logs
vercel logs --follow

# Filter for errors
vercel logs --follow | grep ERROR
```

### Weekly Tasks

1. **Review Analytics:**
   - Top pages performance
   - Popular searches
   - Cost trends

2. **Check Cache Health:**
   - Number of cached pages
   - Low confidence pages
   - Cache hit rate

3. **Database Maintenance:**
   - Review database size
   - Check query performance
   - Vacuum if needed

### Monthly Tasks

1. **Cost Review:**
   - Analyze monthly costs
   - Optimize high-cost operations
   - Review Anthropic usage

2. **Performance Audit:**
   - Run Lighthouse tests
   - Check Core Web Vitals
   - Optimize slow pages

3. **Security Review:**
   - Rotate `CRON_SECRET`
   - Review RLS policies
   - Check for vulnerabilities

### Automated Alerts

Set up alerts in Vercel:

1. Go to Settings > Alerts
2. Configure:
   - Deployment failures
   - Error rate threshold
   - Function timeout
   - Bandwidth limit

## Scaling Considerations

### When to Scale

Consider upgrading when:

- Page views > 10,000/day
- Wiki pages > 1,000 cached
- API costs > $50/month
- Database size > 1GB

### Scaling Database

Upgrade Supabase plan:
- Free: Up to 500MB, 2GB bandwidth
- Pro: Up to 8GB, 250GB bandwidth
- Team: Custom limits

### Scaling Compute

Upgrade Vercel plan:
- Hobby: Free, community support
- Pro: $20/month, priority support
- Enterprise: Custom pricing

### Optimizations

**Reduce API Costs:**
```typescript
// Increase cache TTL
WIKI_CACHE_TTL_HOURS=72  // 3 days instead of 2

// Reduce regeneration frequency
WIKI_REGEN_BATCH_SIZE=5  // 5 instead of 10

// Increase confidence threshold
WIKI_MIN_PUBLISH_CONFIDENCE=0.4  // Higher quality
```

**Improve Performance:**
```typescript
// Enable more aggressive caching
// In vercel.json, add:
{
  "headers": [
    {
      "source": "/wiki/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, s-maxage=3600, stale-while-revalidate=86400"
        }
      ]
    }
  ]
}
```

## Troubleshooting

### Build Failures

**TypeScript errors:**
```bash
# Run locally first
npm run build

# Check for type errors
npx tsc --noEmit
```

**Dependency issues:**
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Runtime Errors

**Database connection fails:**
- Verify Supabase credentials
- Check RLS policies
- Review database logs in Supabase

**Anthropic API errors:**
- Verify API key is valid
- Check API quota/limits
- Review error messages

**Cron jobs not running:**
- Verify `CRON_SECRET` is set
- Check Vercel cron logs
- Ensure functions don't timeout

### Performance Issues

**Slow page generation:**
- Monitor Anthropic API latency
- Check database query performance
- Review function execution time

**High costs:**
- Analyze generation patterns
- Reduce unnecessary regenerations
- Optimize prompt tokens

## Rollback Procedure

If deployment fails:

1. **Immediate rollback:**
   ```bash
   # In Vercel dashboard, click "Redeploy" on previous deployment
   # Or via CLI:
   vercel rollback
   ```

2. **Revert code:**
   ```bash
   git revert HEAD
   git push origin main
   ```

3. **Database rollback:**
   ```bash
   # Revert last migration
   supabase db reset
   ```

## Support

If you encounter issues:

1. Check logs: `vercel logs`
2. Review health endpoint: `/api/health`
3. Check Supabase logs
4. Consult documentation
5. Open GitHub issue

## Checklist

Use this checklist for each deployment:

- [ ] All tests passing locally
- [ ] Environment variables updated
- [ ] Database migrations tested
- [ ] Supabase redirect URLs configured
- [ ] Vercel deployment successful
- [ ] Health check passing
- [ ] Admin user created
- [ ] Test wiki page generated
- [ ] Cron jobs configured
- [ ] Analytics tracking verified
- [ ] Domain configured (if applicable)
- [ ] SSL certificate active
- [ ] Monitoring alerts set up
- [ ] Documentation updated

---

**Last Updated**: 2025-12-11
**Version**: 1.0.0
