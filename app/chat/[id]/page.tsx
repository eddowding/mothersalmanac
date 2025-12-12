/**
 * Single Conversation Page
 *
 * View and continue a specific conversation
 */

import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { getConversationHistory } from '@/lib/chat'
import { InlineChat } from '@/components/chat/ChatWidget'

export const metadata = {
  title: 'Conversation | Mother\'s Almanac',
}

export default async function ConversationPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect(`/auth/login?redirectTo=/chat/${params.id}`)
  }

  // Fetch conversation
  const conversation = await getConversationHistory(params.id)

  if (!conversation) {
    notFound()
  }

  // Verify user has access to this conversation
  if (conversation.userId !== user.id) {
    notFound()
  }

  return (
    <div className="container max-w-5xl py-8">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">{conversation.title}</h1>
        <p className="text-sm text-muted-foreground">
          Started {conversation.createdAt.toLocaleDateString()}
          {conversation.pageContext && ` • Context: ${conversation.pageContext}`}
        </p>
      </div>

      <InlineChat
        pageContext={conversation.pageContext}
        pageTitle={conversation.title}
        className="h-[calc(100vh-200px)]"
      />
    </div>
  )
}
