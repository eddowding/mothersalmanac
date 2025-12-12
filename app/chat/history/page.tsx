/**
 * Chat History Page
 *
 * Displays list of user's conversations with search and management
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getUserConversations } from '@/lib/chat'
import { ConversationList } from './ConversationList'
import { Sparkles } from 'lucide-react'

export const metadata = {
  title: 'Chat History | Mother\'s Almanac',
  description: 'View and manage your chat conversations',
}

export default async function ChatHistoryPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login?redirectTo=/chat/history')
  }

  // Fetch user's conversations
  const conversations = await getUserConversations(user.id, 50)

  return (
    <div className="container max-w-4xl py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">Chat History</h1>
            <p className="text-muted-foreground">
              View and manage your conversations with Mother's Almanac
            </p>
          </div>
        </div>
      </div>

      <ConversationList initialConversations={conversations} />
    </div>
  )
}
