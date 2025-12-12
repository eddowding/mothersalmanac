# Mother's Almanac - Authentication Setup Guide

Complete guide for setting up and testing Supabase authentication with magic link email and OAuth support.

## Table of Contents

1. [Overview](#overview)
2. [File Structure](#file-structure)
3. [Installation](#installation)
4. [Configuration](#configuration)
5. [Database Setup](#database-setup)
6. [Auth Flow](#auth-flow)
7. [Testing](#testing)
8. [Security Notes](#security-notes)
9. [Troubleshooting](#troubleshooting)

---

## Overview

This authentication system provides:

- Magic link email authentication
- OAuth authentication (Google and GitHub)
- Protected routes with middleware
- Role-based access control (user/admin)
- Automatic session refresh
- Type-safe database operations
- Server-side and client-side auth utilities

## File Structure

```
/Users/eddowding/Sites/mothersalmanac/
├── lib/
│   ├── supabase/
│   │   ├── client.ts          # Browser Supabase client
│   │   ├── server.ts          # Server Supabase client
│   │   ├── admin.ts           # Service role client (admin ops)
│   │   └── types.ts           # Database TypeScript types
│   ├── auth/
│   │   ├── actions.ts         # Auth server actions
│   │   └── session.ts         # Session refresh utilities
│   └── utils/
│       └── cn.ts              # Tailwind class merger
├── components/
│   ├── auth/
│   │   ├── LoginModal.tsx     # Auth modal UI
│   │   └── UserMenu.tsx       # User dropdown menu
│   └── ui/                    # shadcn/ui components
├── app/
│   ├── auth/
│   │   └── callback/
│   │       └── route.ts       # OAuth callback handler
│   └── admin/
│       └── page.tsx           # Protected admin page
├── middleware.ts              # Auth & route protection
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Database schema
└── .env.local.example         # Environment variables template
```

## Installation

Dependencies are already installed via npm:

- `@supabase/ssr` - Supabase SSR integration for Next.js App Router
- `@supabase/supabase-js` - Supabase JavaScript client
- Radix UI components for UI elements
- `lucide-react` for icons

## Configuration

### 1. Environment Variables

Copy `.env.local.example` to `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in your Supabase credentials:

```env
# Get these from Supabase Dashboard > Settings > API
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Your site URL for auth redirects
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

### 2. Supabase Dashboard Configuration

#### Email Provider Setup

1. Go to **Authentication > Providers** in Supabase dashboard
2. Enable **Email** provider
3. Configure email templates (optional but recommended)
4. Enable "Confirm email" if you want email verification

#### OAuth Provider Setup (Optional)

For Google OAuth:
1. Go to **Authentication > Providers**
2. Enable **Google** provider
3. Follow the instructions to create Google OAuth credentials
4. Add authorized redirect URI: `https://your-project.supabase.co/auth/v1/callback`

For GitHub OAuth:
1. Go to **Authentication > Providers**
2. Enable **GitHub** provider
3. Follow the instructions to create GitHub OAuth app
4. Add callback URL: `https://your-project.supabase.co/auth/v1/callback`

#### Redirect URLs Configuration

IMPORTANT: Add these redirect URLs in **Authentication > URL Configuration**:

Development:
- `http://localhost:3000/auth/callback`

Production:
- `https://yourdomain.com/auth/callback`

Site URL should be:
- Development: `http://localhost:3000`
- Production: `https://yourdomain.com`

## Database Setup

### Running the Migration

You have two options to set up the database:

#### Option 1: Using Supabase MCP (Recommended per your instructions)

```bash
# Use the Supabase MCP tool to run the migration
# The migration file is at: /Users/eddowding/Sites/mothersalmanac/supabase/migrations/001_initial_schema.sql
```

#### Option 2: Using Supabase Dashboard

1. Go to **SQL Editor** in Supabase dashboard
2. Copy the contents of `supabase/migrations/001_initial_schema.sql`
3. Paste and run the SQL

### What the Migration Creates

The migration creates:

1. **user_profiles** table
   - Links to auth.users
   - Stores name, email, role (user/admin)
   - Automatically created on signup via trigger

2. **chat_sessions** table
   - Stores user chat sessions
   - Protected by RLS policies

3. **chat_messages** table
   - Stores individual messages
   - Linked to chat sessions

4. **wiki_pages** table
   - Stores wiki content
   - Public read access when published
   - Admin-only write access

5. **is_admin()** function
   - Security definer function for checking admin role
   - Used in RLS policies

6. **RLS Policies**
   - User profiles: Users can read/update their own
   - Admins can read/update all profiles
   - Chat data: Users can only access their own
   - Wiki: Public read, admin write

7. **Triggers**
   - Auto-create user_profile on signup
   - Auto-update updated_at timestamps

### Creating Your First Admin User

After signing up, run this SQL to make yourself admin:

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

## Auth Flow

### Magic Link Email Flow

1. User enters email in LoginModal
2. `signInWithEmail()` called (server action)
3. Supabase sends magic link email
4. User clicks link in email
5. Redirected to `/auth/callback` with code
6. Code exchanged for session
7. Session stored in HTTP-only cookies
8. User redirected to app

### OAuth Flow

1. User clicks OAuth button (Google/GitHub)
2. `signInWithOAuth()` called (server action)
3. Redirected to OAuth provider
4. User authenticates with provider
5. Provider redirects to Supabase
6. Supabase redirects to `/auth/callback` with code
7. Code exchanged for session
8. Session stored in HTTP-only cookies
9. User redirected to app

### Session Management

- Sessions stored in HTTP-only cookies (secure)
- Middleware refreshes session on every request
- Client-side auto-refresh every 55 minutes
- Sessions expire after 60 minutes of inactivity

### Route Protection

Middleware protects routes:
- `/admin/*` - Requires authentication + admin role
- `/chat/history` - Requires authentication
- `/wiki/*` - Public access
- `/` - Public access

## Testing

### Test Plan

#### 1. Magic Link Email Authentication

Test Steps:
```bash
# Start the dev server
npm run dev

# Open http://localhost:3000
# Click "Sign In" button
# Enter your email
# Click "Send magic link"
# Check your email
# Click the magic link
# Should be redirected back to app and signed in
```

Expected Results:
- Magic link sent successfully
- Success message shown in modal
- Email received within 1 minute
- Click redirects to app
- User is authenticated
- UserMenu appears with initials

#### 2. OAuth Authentication

Test Google OAuth:
```bash
# Click "Continue with Google" in LoginModal
# Redirected to Google sign in
# Authenticate with Google
# Redirected back to app
# User is authenticated
```

Test GitHub OAuth:
```bash
# Click "Continue with GitHub" in LoginModal
# Redirected to GitHub sign in
# Authenticate with GitHub
# Redirected back to app
# User is authenticated
```

Expected Results:
- Smooth redirect to provider
- Successful authentication
- Redirect back to app
- User profile created automatically
- UserMenu appears

#### 3. Protected Routes

Test admin route without auth:
```bash
# While logged out, navigate to http://localhost:3000/admin
# Should redirect to home with message
```

Test admin route with non-admin user:
```bash
# Sign in as regular user
# Navigate to /admin
# Should redirect to home with "Unauthorized" message
```

Test admin route with admin user:
```bash
# Sign in as admin user
# Navigate to /admin
# Should see admin dashboard
```

Expected Results:
- Unauthenticated users redirected
- Non-admin users blocked from admin routes
- Admin users can access admin dashboard
- Middleware messages displayed

#### 4. Session Refresh

Test automatic refresh:
```bash
# Sign in
# Leave tab open for 60+ minutes
# Session should refresh automatically
# User stays authenticated
```

Expected Results:
- No sign-out after 60 minutes
- Smooth background refresh
- No user interruption

#### 5. Sign Out

Test sign out:
```bash
# Sign in
# Click UserMenu
# Click "Sign out"
# Should redirect to home
# UserMenu should disappear
```

Expected Results:
- Immediate sign out
- Redirect to home
- Session cleared
- Cannot access protected routes

### Verification Commands

Check if migration ran:
```sql
-- Run in Supabase SQL Editor
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public';
```

Check if user profile created:
```sql
-- Run in Supabase SQL Editor
SELECT * FROM public.user_profiles;
```

Check if admin function exists:
```sql
-- Run in Supabase SQL Editor
SELECT proname FROM pg_proc WHERE proname = 'is_admin';
```

## Security Notes

### Critical Security Rules

1. **NEVER expose service role key to client**
   - Only use in server-side code
   - Never import admin client in Client Components
   - Service role bypasses ALL RLS policies

2. **Always use RLS policies**
   - Never disable RLS on tables with user data
   - Test policies thoroughly
   - Use `is_admin()` function in policies for caching

3. **HTTP-only cookies**
   - Sessions stored in HTTP-only cookies
   - Not accessible via JavaScript
   - Protected from XSS attacks

4. **CSRF protection**
   - Built into Supabase Auth
   - No additional configuration needed

5. **Rate limiting**
   - Supabase provides built-in rate limiting
   - Configure in Supabase dashboard if needed

6. **Environment variables**
   - Never commit `.env.local`
   - Use different keys for development and production
   - Rotate keys if compromised

### Best Practices

1. Use `requireAuth()` in Server Components that need authentication
2. Use `requireAdmin()` in Server Components that need admin access
3. Use `getCurrentUser()` to get current user without redirecting
4. Always validate user input on the server side
5. Use parameterized queries (Supabase handles this automatically)
6. Log authentication events for security monitoring

## Troubleshooting

### Issue: "Invalid login credentials"

**Cause:** Wrong email or magic link expired

**Solution:**
- Magic links expire after 60 minutes
- Request a new magic link
- Check spam folder for email

### Issue: "No redirect URL returned" on OAuth

**Cause:** OAuth provider not configured in Supabase

**Solution:**
1. Go to Supabase dashboard > Authentication > Providers
2. Enable Google or GitHub
3. Follow setup instructions
4. Add redirect URLs

### Issue: Redirected to home after clicking magic link

**Cause:** Redirect URL not in Supabase allowed list

**Solution:**
1. Go to Authentication > URL Configuration
2. Add `http://localhost:3000/auth/callback`
3. Save changes
4. Request new magic link

### Issue: "Unauthorized" when accessing admin

**Cause:** User role is not 'admin'

**Solution:**
```sql
-- Run in Supabase SQL Editor
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

### Issue: Session expires too quickly

**Cause:** Default session timeout

**Solution:**
1. Go to Supabase dashboard > Authentication > Settings
2. Adjust "JWT Expiry" (default 3600 seconds)
3. Update `SESSION_REFRESH_INTERVAL` in `lib/auth/session.ts`

### Issue: TypeScript errors about missing types

**Cause:** Supabase types out of sync

**Solution:**
```bash
# Generate types from your Supabase schema
npx supabase gen types typescript --project-id your-project-id > lib/supabase/types.ts
```

### Issue: Middleware not protecting routes

**Cause:** Middleware matcher not configured correctly

**Solution:**
- Check `middleware.ts` config.matcher
- Ensure matcher includes the route
- Clear `.next` cache: `rm -rf .next && npm run dev`

### Issue: Cannot read user profile after signup

**Cause:** Trigger didn't fire or RLS blocking read

**Solution:**
1. Check trigger exists: `SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';`
2. Check RLS policy: `SELECT * FROM pg_policies WHERE tablename = 'user_profiles';`
3. Manually create profile if needed:
```sql
INSERT INTO public.user_profiles (id, email, role)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'your-email@example.com'),
  'your-email@example.com',
  'user'
);
```

---

## Summary

You now have a complete authentication system with:

- Magic link email authentication
- OAuth (Google and GitHub)
- Protected routes with middleware
- Role-based access control
- Automatic session management
- Type-safe database operations
- Comprehensive security measures

All files are in place and documented. Follow the configuration steps above to connect to your Supabase project and start testing.

For questions or issues, refer to the troubleshooting section or check:
- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Next.js App Router docs: https://nextjs.org/docs/app
