'use client'

/**
 * Client component for displaying and managing conversations
 */

import { useState } from 'react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { MessageSquare, Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

import type { ChatConversation } from '@/lib/chat/types'

interface ConversationListProps {
  initialConversations: ChatConversation[]
}

export function ConversationList({ initialConversations }: ConversationListProps) {
  const [conversations] = useState(initialConversations)

  if (conversations.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <MessageSquare className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">No conversations yet</h3>
          <p className="text-muted-foreground mb-4">
            Start a conversation to see your chat history here
          </p>
          <Button asChild>
            <Link href="/chat">Start Chatting</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {conversations.map((conversation) => (
        <Card key={conversation.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <Link href={`/chat?id=${conversation.id}`} className="block">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold mb-1 truncate">
                    {conversation.title || 'Untitled Conversation'}
                  </h3>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      {formatDistanceToNow(new Date(conversation.updatedAt), {
                        addSuffix: true,
                      })}
                    </span>
                    {conversation.messages && conversation.messages.length > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {conversation.messages.length} messages
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault()
                    // TODO: Implement delete functionality
                    console.log('Delete conversation', conversation.id)
                  }}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
