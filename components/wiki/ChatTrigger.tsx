'use client'

import { MessageCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface ChatTriggerProps {
  pageContext: string
  className?: string
}

export function ChatTrigger({ pageContext, className }: ChatTriggerProps) {
  const handleChatOpen = () => {
    // TODO: Integrate with chat system
    // This will open the chat interface with context of the current page
    console.log('Opening chat with context:', pageContext)
  }

  return (
    <Button
      variant="outline"
      className={cn(
        'w-full justify-start gap-2 border-[hsl(var(--color-almanac-sage-300))] hover:bg-[hsl(var(--color-almanac-sage-50))] hover:border-[hsl(var(--color-almanac-sage-400))] no-print',
        className
      )}
      onClick={handleChatOpen}
    >
      <MessageCircle className="h-4 w-4" />
      <span>Ask about this topic</span>
    </Button>
  )
}
