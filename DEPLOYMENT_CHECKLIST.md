# Mother's Almanac - Final Deployment Checklist

**Last Updated**: 2025-12-11
**Version**: 1.0.0

## Pre-Deployment

### Code & Build
- [x] All features implemented
- [x] TypeScript strict mode enabled
- [ ] Build passes without errors (`npm run build`)
- [ ] No lint errors (`npm run lint`)
- [ ] All tests passing (if applicable)

### Documentation
- [x] README.md complete with setup instructions
- [x] DEPLOYMENT.md guide created
- [x] API.md documentation written
- [x] Environment variables documented in .env.local.example
- [x] All code comments added

### Configuration Files
- [x] vercel.json configured with:
  - [x] Function timeouts (60s)
  - [x] Cron jobs (regenerate-stale, cleanup, stats)
  - [x] Security headers
  - [x] Rewrites for health endpoint
- [x] robots.ts created
- [x] sitemap.ts implemented
- [x] Error boundaries (error.tsx, global-error.tsx)

### Features Implemented
- [x] SEO & Metadata
  - [x] Dynamic generateMetadata for all pages
  - [x] Open Graph image generation
  - [x] Twitter cards
  - [x] JSON-LD structured data
  - [x] Sitemap generation
  - [x] Robots.txt

- [x] Performance Optimization
  - [x] ISR configuration
  - [x] Edge caching headers
  - [x] Performance monitoring utilities
  - [x] Cache headers for different content types

- [x] Error Handling
  - [x] Global error boundary
  - [x] API error responses
  - [x] Retry logic with backoff
  - [x] User-friendly error pages
  - [x] Centralized error handler

- [x] Analytics
  - [x] Page view tracking
  - [x] Search query analytics
  - [x] Generation metrics
  - [x] Cost tracking functions
  - [x] Analytics summary API

- [x] Admin Enhancements
  - [x] Real-time stats dashboard
  - [x] Cost monitoring
  - [x] System health display
  - [x] Top pages and searches

- [x] Cron Jobs
  - [x] /api/cron/regenerate-stale (every 6 hours)
  - [x] /api/cron/cleanup (daily at 2 AM)
  - [x] /api/cron/stats (daily at midnight)

- [x] Health Check
  - [x] /api/health endpoint
  - [x] Database connectivity check
  - [x] API availability check
  - [x] System metrics

## Supabase Setup

### Database
- [ ] Supabase project created
- [ ] All migrations applied
- [ ] RLS policies verified
- [ ] Functions created (if any)
- [ ] Storage buckets configured

### Tables Required
- [ ] wiki_cache
- [ ] user_profiles
- [ ] analytics_page_views
- [ ] analytics_searches
- [ ] analytics_generations
- [ ] analytics_costs
- [ ] analytics_daily_stats
- [ ] analytics_costs_daily
- [ ] chat_conversations (optional)
- [ ] chat_messages (optional)
- [ ] documents (optional)
- [ ] document_chunks (optional)

### Authentication
- [ ] Email provider enabled
- [ ] Redirect URLs configured:
  - [ ] http://localhost:3000/auth/callback
  - [ ] https://yourdomain.com/auth/callback
  - [ ] https://yourapp.vercel.app/auth/callback

### API Keys Obtained
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY

## Anthropic Setup

- [ ] Anthropic account created
- [ ] API key generated
- [ ] API key tested
- [ ] Model access verified (claude-3-5-sonnet-20241022)

## Vercel Setup

### Project Configuration
- [ ] Repository connected to Vercel
- [ ] Framework preset: Next.js
- [ ] Build settings correct
- [ ] Domain configured (optional)

### Environment Variables
Required variables added to Vercel:

- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] ANTHROPIC_API_KEY
- [ ] NEXT_PUBLIC_SITE_URL
- [ ] CRON_SECRET (generated with: openssl rand -base64 32)
- [ ] CLAUDE_MODEL=claude-3-5-sonnet-20241022
- [ ] CLAUDE_MAX_TOKENS=4000

Optional variables:
- [ ] WIKI_CACHE_TTL_HOURS
- [ ] WIKI_MAX_CACHED_PAGES
- [ ] WIKI_REGEN_BATCH_SIZE
- [ ] WIKI_POPULAR_THRESHOLD
- [ ] NEXT_PUBLIC_APP_VERSION

### Cron Jobs
- [ ] Cron jobs visible in Vercel dashboard
- [ ] CRON_SECRET environment variable set
- [ ] Test endpoints manually with Bearer token

## Post-Deployment Verification

### Immediate Checks (within 5 minutes)
- [ ] Deployment succeeded
- [ ] Site loads at production URL
- [ ] Health check returns 200 OK
  ```bash
  curl https://yourdomain.com/api/health
  ```
- [ ] No console errors on homepage
- [ ] SSL certificate active

### Authentication Tests (within 15 minutes)
- [ ] Sign up flow works
- [ ] Email confirmation received
- [ ] Login works
- [ ] Logout works
- [ ] Protected routes redirect to login

### Feature Tests (within 30 minutes)
- [ ] Wiki page generation works
- [ ] Search functionality works
- [ ] Admin dashboard accessible (after setting admin role)
- [ ] Analytics tracking (check database)
- [ ] Error pages display correctly (test 404)

### Admin Setup (within 1 hour)
- [ ] Create first admin user
- [ ] Set role to 'admin' in user_profiles table
- [ ] Access admin dashboard at /admin/dashboard
- [ ] Verify all admin features work

### Cron Job Verification (within 24 hours)
- [ ] Check Vercel logs for cron executions
- [ ] Verify regenerate-stale ran
- [ ] Verify cleanup ran
- [ ] Verify stats generation ran
- [ ] Check database for generated stats

### Performance Tests
- [ ] Run Lighthouse audit
  - [ ] Performance score > 90
  - [ ] Accessibility score > 95
  - [ ] Best Practices score > 90
  - [ ] SEO score > 90
- [ ] Test Core Web Vitals
  - [ ] LCP < 2.5s
  - [ ] FID < 100ms
  - [ ] CLS < 0.1
- [ ] Verify ISR works (check cache headers)
- [ ] Test page load times

### SEO Verification
- [ ] robots.txt accessible at /robots.txt
- [ ] Sitemap accessible at /sitemap.xml
- [ ] Open Graph meta tags present
- [ ] Twitter card meta tags present
- [ ] Structured data valid (test with Google Rich Results)
- [ ] Dynamic OG images generating

### Analytics Verification
- [ ] Page views being tracked
- [ ] Searches being tracked
- [ ] Generations being tracked
- [ ] Costs being tracked
- [ ] Daily stats generating

## Monitoring Setup

### Alerts
- [ ] Set up deployment failure alerts
- [ ] Set up error rate alerts
- [ ] Set up function timeout alerts
- [ ] Set up cost alerts (if applicable)

### Regular Checks
- [ ] Dashboard monitoring plan established
- [ ] Weekly analytics review scheduled
- [ ] Monthly cost review scheduled
- [ ] Quarterly performance audit scheduled

## Documentation Updates

- [ ] Update README.md with production URLs
- [ ] Document any deployment-specific configurations
- [ ] Update API documentation with actual endpoints
- [ ] Create runbook for common issues

## Security Checks

- [ ] All secrets properly set in environment variables
- [ ] No secrets committed to git
- [ ] RLS policies tested
- [ ] CORS configured correctly
- [ ] Rate limiting in place (if implemented)
- [ ] Security headers verified

## Rollback Plan

- [ ] Previous deployment tagged in git
- [ ] Rollback procedure documented
- [ ] Database backup created
- [ ] Know how to quickly rollback in Vercel

## Communication

- [ ] Team notified of deployment
- [ ] Users notified (if applicable)
- [ ] Support team briefed on new features
- [ ] Known issues documented

## Success Criteria

The deployment is successful when:

1. Health check returns "healthy" status
2. Users can successfully:
   - Generate wiki pages
   - Search content
   - Sign up and log in
   - Access their appropriate pages
3. Admin can:
   - Access dashboard
   - View analytics
   - Manage content
4. Cron jobs execute successfully
5. Analytics are being tracked
6. No critical errors in logs
7. Performance scores meet targets

## Issues to Fix Before Production

### Critical (Must Fix)
- [ ] Build errors resolved
- [ ] TypeScript errors fixed
- [ ] Authentication fully working
- [ ] All environment variables set

### High Priority (Should Fix)
- [ ] Any lint warnings
- [ ] Performance optimizations
- [ ] SEO improvements
- [ ] Accessibility issues

### Medium Priority (Nice to Have)
- [ ] Additional test coverage
- [ ] Enhanced error messages
- [ ] UI polish
- [ ] Additional documentation

## Notes

Add any deployment-specific notes here:

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Production URL**: _____________
**Deployment ID**: _____________

## Sign-off

- [ ] Developer approval
- [ ] QA approval (if applicable)
- [ ] Product owner approval (if applicable)

---

**Next Steps After Deployment**:
1. Monitor logs for first 24 hours
2. Watch analytics for user behavior
3. Review costs after first week
4. Gather user feedback
5. Plan next iteration
