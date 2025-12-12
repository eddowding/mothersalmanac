-- Mother's Almanac Initial Database Schema
-- This migration creates the core tables and RLS policies for authentication and data management

-- =====================================================
-- USER PROFILES TABLE
-- =====================================================
-- Stores additional user information beyond what's in auth.users
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for faster role lookups (used in is_admin function)
CREATE INDEX IF NOT EXISTS user_profiles_role_idx ON public.user_profiles(role);
CREATE INDEX IF NOT EXISTS user_profiles_email_idx ON public.user_profiles(email);

-- =====================================================
-- ADMIN HELPER FUNCTION
-- =====================================================
-- Security definer function to check if current user is admin
-- Used in RLS policies with SELECT wrapper for caching
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = (SELECT auth.uid()) AND role = 'admin'
  );
END;
$$;

-- =====================================================
-- RLS POLICIES FOR USER PROFILES
-- =====================================================
-- Enable RLS on user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "users_select_own_profile" ON public.user_profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Admins can read all profiles
CREATE POLICY "admins_select_all_profiles" ON public.user_profiles
  FOR SELECT
  USING ((SELECT is_admin()));

-- Users can update their own name (but not role)
CREATE POLICY "users_update_own_name" ON public.user_profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.user_profiles WHERE id = auth.uid())
  );

-- Admins can update any profile including roles
CREATE POLICY "admins_update_all_profiles" ON public.user_profiles
  FOR UPDATE
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- Only system can insert (via trigger on auth.users)
CREATE POLICY "system_insert_profiles" ON public.user_profiles
  FOR INSERT
  WITH CHECK (false); -- Explicitly block direct inserts

-- =====================================================
-- AUTO-CREATE PROFILE TRIGGER
-- =====================================================
-- Automatically create user_profile when a new user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.raw_user_meta_data->>'full_name'),
    'user'
  );
  RETURN NEW;
END;
$$;

-- Trigger on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- UPDATED_AT TRIGGER
-- =====================================================
-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- Apply to user_profiles
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- CHAT SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON public.chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_created_at_idx ON public.chat_sessions(created_at DESC);

-- RLS for chat sessions
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_sessions" ON public.chat_sessions
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admins_view_all_sessions" ON public.chat_sessions
  FOR SELECT
  USING ((SELECT is_admin()));

-- Updated_at trigger for chat sessions
CREATE TRIGGER chat_sessions_updated_at
  BEFORE UPDATE ON public.chat_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- CHAT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx ON public.chat_messages(session_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages(created_at);

-- RLS for chat messages (inherit from session permissions)
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_manage_own_messages" ON public.chat_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_sessions
      WHERE id = session_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "admins_view_all_messages" ON public.chat_messages
  FOR SELECT
  USING ((SELECT is_admin()));

-- =====================================================
-- WIKI PAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS public.wiki_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  published BOOLEAN NOT NULL DEFAULT false,
  view_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS wiki_pages_slug_idx ON public.wiki_pages(slug);
CREATE INDEX IF NOT EXISTS wiki_pages_published_idx ON public.wiki_pages(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS wiki_pages_created_at_idx ON public.wiki_pages(created_at DESC);

-- RLS for wiki pages
ALTER TABLE public.wiki_pages ENABLE ROW LEVEL SECURITY;

-- Anyone can read published wiki pages (even anonymous)
CREATE POLICY "public_read_published_wiki" ON public.wiki_pages
  FOR SELECT
  USING (published = true);

-- Admins can do everything with wiki pages
CREATE POLICY "admins_manage_wiki" ON public.wiki_pages
  FOR ALL
  USING ((SELECT is_admin()))
  WITH CHECK ((SELECT is_admin()));

-- Updated_at trigger for wiki pages
CREATE TRIGGER wiki_pages_updated_at
  BEFORE UPDATE ON public.wiki_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
-- Grant authenticated users access to tables
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.chat_sessions TO authenticated;
GRANT ALL ON public.chat_messages TO authenticated;
GRANT ALL ON public.wiki_pages TO authenticated;

-- Grant anonymous users read access to published wiki pages
GRANT SELECT ON public.wiki_pages TO anon;

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.handle_updated_at() TO authenticated;

-- =====================================================
-- SEED ADMIN USER (OPTIONAL)
-- =====================================================
-- Uncomment and update this with your email to make yourself admin
-- UPDATE public.user_profiles SET role = 'admin' WHERE email = 'your-email@example.com';
