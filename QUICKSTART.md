# Mother's Almanac - Authentication Quick Start

Fast setup guide to get authentication working in 5 minutes.

## Prerequisites

- Supabase account with a project created
- Node.js and npm installed

## Step 1: Environment Variables

Create `.env.local`:

```bash
cp .env.local.example .env.local
```

Fill in from your Supabase dashboard (Settings > API):

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx...
SUPABASE_SERVICE_ROLE_KEY=eyJxxx...
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

## Step 2: Run Database Migration

Using Supabase MCP (as per your setup):

The migration file is at: `/Users/eddowding/Sites/mothersalmanac/supabase/migrations/001_initial_schema.sql`

Or manually in Supabase SQL Editor:

1. Copy contents of `supabase/migrations/001_initial_schema.sql`
2. Paste into SQL Editor
3. Run

## Step 3: Configure Supabase Auth

In Supabase dashboard:

1. **Authentication > Providers**
   - Enable "Email"
   - (Optional) Enable "Google" and/or "GitHub"

2. **Authentication > URL Configuration**
   - Site URL: `http://localhost:3000`
   - Redirect URLs: Add `http://localhost:3000/auth/callback`

## Step 4: Start Development Server

```bash
npm run dev
```

Open http://localhost:3000

## Step 5: Test Authentication

1. Click "Sign In" (you'll need to add this to your UI)
2. Enter your email
3. Click "Send magic link"
4. Check your email
5. Click the link
6. You're signed in!

## Step 6: Make Yourself Admin

After signing in, run this in Supabase SQL Editor:

```sql
UPDATE public.user_profiles
SET role = 'admin'
WHERE email = 'your-email@example.com';
```

Now visit http://localhost:3000/admin to see the admin dashboard.

## Using Auth in Your Components

### Server Component Example

```tsx
// app/protected/page.tsx
import { requireAuth } from '@/lib/auth/actions'

export default async function ProtectedPage() {
  const user = await requireAuth() // Redirects if not authenticated

  return <div>Hello {user.email}</div>
}
```

### Client Component Example

```tsx
'use client'
import { useState } from 'react'
import { LoginModal } from '@/components/auth/LoginModal'
import { UserMenu } from '@/components/auth/UserMenu'

export function Header({ user, isAdmin }) {
  const [showLogin, setShowLogin] = useState(false)

  if (!user) {
    return (
      <>
        <button onClick={() => setShowLogin(true)}>Sign In</button>
        <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      </>
    )
  }

  return <UserMenu user={user} isAdmin={isAdmin} />
}
```

### Get Current User

```tsx
// Server Component
import { getCurrentUser, isAdmin } from '@/lib/auth/actions'

export default async function MyPage() {
  const user = await getCurrentUser() // Returns null if not authenticated
  const admin = await isAdmin() // Returns boolean

  if (!user) return <div>Please sign in</div>
  return <div>Welcome {user.email}</div>
}
```

## Folder Structure Reference

```
lib/
├── supabase/
│   ├── client.ts     # Use in Client Components
│   ├── server.ts     # Use in Server Components
│   ├── admin.ts      # Admin operations only
│   └── types.ts      # TypeScript types
└── auth/
    ├── actions.ts    # Server actions (signIn, signOut, etc.)
    └── session.ts    # Client session utilities

components/auth/
├── LoginModal.tsx    # Authentication modal
└── UserMenu.tsx      # User dropdown menu

app/
├── auth/callback/    # OAuth callback route
└── admin/            # Protected admin routes

middleware.ts         # Route protection
```

## Common Issues

### Magic link not arriving

- Check spam folder
- Verify email provider is enabled in Supabase
- Check Supabase logs in dashboard

### Redirect loop on OAuth

- Add `http://localhost:3000/auth/callback` to Redirect URLs in Supabase
- Check Site URL is set to `http://localhost:3000`

### Cannot access /admin

- Make sure you ran the admin SQL update query
- Check your email matches the one you used to sign in
- Clear cookies and sign in again

## Next Steps

- Read full documentation: `AUTH_SETUP.md`
- Customize LoginModal styling
- Add auth to your existing pages
- Set up OAuth providers (optional)
- Deploy to production with proper environment variables

## Production Deployment

Before deploying:

1. Update environment variables in Vercel/hosting platform
2. Add production URL to Supabase Redirect URLs
3. Update `NEXT_PUBLIC_SITE_URL` to production URL
4. Test auth flow on production
5. Set up OAuth with production credentials

That's it! You now have a fully functional authentication system.
