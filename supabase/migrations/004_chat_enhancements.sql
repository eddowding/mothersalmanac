-- Chat Enhancements Migration
-- Adds page context, sources tracking, and anonymous chat support

-- =====================================================
-- CHAT CONVERSATIONS TABLE (Enhanced)
-- =====================================================
-- Replace chat_sessions with more comprehensive chat_conversations
CREATE TABLE IF NOT EXISTS public.chat_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  page_context TEXT, -- Wiki page slug or URL for context-aware chat
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS chat_conversations_user_id_idx ON public.chat_conversations(user_id);
CREATE INDEX IF NOT EXISTS chat_conversations_created_at_idx ON public.chat_conversations(created_at DESC);
CREATE INDEX IF NOT EXISTS chat_conversations_page_context_idx ON public.chat_conversations(page_context);

-- RLS for chat conversations
ALTER TABLE public.chat_conversations ENABLE ROW LEVEL SECURITY;

-- Users can manage their own conversations
CREATE POLICY "users_manage_own_conversations" ON public.chat_conversations
  FOR ALL
  USING (user_id IS NULL OR auth.uid() = user_id)
  WITH CHECK (user_id IS NULL OR auth.uid() = user_id);

-- Admins can view all conversations
CREATE POLICY "admins_view_all_conversations" ON public.chat_conversations
  FOR SELECT
  USING ((SELECT is_admin()));

-- Updated_at trigger
CREATE TRIGGER chat_conversations_updated_at
  BEFORE UPDATE ON public.chat_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- =====================================================
-- CHAT MESSAGES TABLE (Enhanced)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.chat_messages_new (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL,
  sources JSONB, -- Array of sources used for RAG: [{chunk_id, title, relevance, content}]
  metadata JSONB, -- Additional metadata like tokens, model, etc.
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_messages_conversation_id_idx ON public.chat_messages_new(conversation_id);
CREATE INDEX IF NOT EXISTS chat_messages_created_at_idx ON public.chat_messages_new(created_at);
CREATE INDEX IF NOT EXISTS chat_messages_sources_idx ON public.chat_messages_new USING GIN(sources);

-- RLS for chat messages
ALTER TABLE public.chat_messages_new ENABLE ROW LEVEL SECURITY;

-- Users can manage messages in their conversations
CREATE POLICY "users_manage_own_chat_messages" ON public.chat_messages_new
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id
      AND (user_id IS NULL OR user_id = auth.uid())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id
      AND (user_id IS NULL OR user_id = auth.uid())
    )
  );

-- Admins can view all messages
CREATE POLICY "admins_view_all_chat_messages" ON public.chat_messages_new
  FOR SELECT
  USING ((SELECT is_admin()));

-- =====================================================
-- CHAT ANALYTICS TABLE
-- =====================================================
-- Track chat usage and quality
CREATE TABLE IF NOT EXISTS public.chat_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.chat_conversations(id) ON DELETE CASCADE,
  message_id UUID REFERENCES public.chat_messages_new(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('message_sent', 'feedback_positive', 'feedback_negative', 'wiki_page_created')),
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS chat_analytics_conversation_id_idx ON public.chat_analytics(conversation_id);
CREATE INDEX IF NOT EXISTS chat_analytics_event_type_idx ON public.chat_analytics(event_type);
CREATE INDEX IF NOT EXISTS chat_analytics_created_at_idx ON public.chat_analytics(created_at);

-- RLS for analytics
ALTER TABLE public.chat_analytics ENABLE ROW LEVEL SECURITY;

-- Users can view analytics for their conversations
CREATE POLICY "users_view_own_analytics" ON public.chat_analytics
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chat_conversations
      WHERE id = conversation_id AND (user_id IS NULL OR user_id = auth.uid())
    )
  );

-- Admins can view all analytics
CREATE POLICY "admins_view_all_analytics" ON public.chat_analytics
  FOR SELECT
  USING ((SELECT is_admin()));

-- System can insert analytics
CREATE POLICY "system_insert_analytics" ON public.chat_analytics
  FOR INSERT
  WITH CHECK (true);

-- =====================================================
-- GRANT PERMISSIONS
-- =====================================================
GRANT ALL ON public.chat_conversations TO authenticated;
GRANT ALL ON public.chat_messages_new TO authenticated;
GRANT ALL ON public.chat_analytics TO authenticated;

-- Allow anonymous users to use chat (for unauthenticated access)
GRANT ALL ON public.chat_conversations TO anon;
GRANT ALL ON public.chat_messages_new TO anon;
GRANT INSERT ON public.chat_analytics TO anon;

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- Function to auto-generate conversation title from first message
CREATE OR REPLACE FUNCTION public.generate_conversation_title()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.role = 'user' THEN
    UPDATE public.chat_conversations
    SET title = LEFT(NEW.content, 50) || CASE WHEN LENGTH(NEW.content) > 50 THEN '...' ELSE '' END
    WHERE id = NEW.conversation_id
    AND title = 'New Conversation';
  END IF;
  RETURN NEW;
END;
$$;

-- Trigger to auto-generate title
DROP TRIGGER IF EXISTS auto_generate_conversation_title ON public.chat_messages_new;
CREATE TRIGGER auto_generate_conversation_title
  AFTER INSERT ON public.chat_messages_new
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_conversation_title();

-- =====================================================
-- MIGRATION FROM OLD TABLES (if they exist)
-- =====================================================
DO $$
BEGIN
  -- Migrate chat_sessions to chat_conversations if old table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_sessions') THEN
    INSERT INTO public.chat_conversations (id, user_id, title, created_at, updated_at)
    SELECT id, user_id, title, created_at, updated_at
    FROM public.chat_sessions
    ON CONFLICT (id) DO NOTHING;
  END IF;

  -- Migrate chat_messages to chat_messages_new if old table exists
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'chat_messages') THEN
    INSERT INTO public.chat_messages_new (id, conversation_id, role, content, created_at)
    SELECT id, session_id, role, content, created_at
    FROM public.chat_messages
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- =====================================================
-- CLEANUP (Optional - uncomment to drop old tables)
-- =====================================================
-- DROP TABLE IF EXISTS public.chat_messages CASCADE;
-- DROP TABLE IF EXISTS public.chat_sessions CASCADE;
