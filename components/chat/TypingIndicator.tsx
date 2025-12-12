/**
 * TypingIndicator Component
 *
 * Animated "..." indicator to show AI is thinking
 */

'use client'

import { Bot } from 'lucide-react'

export function TypingIndicator() {
  return (
    <div className="flex w-full gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
        <Bot className="w-4 h-4 text-primary" />
      </div>

      <div className="flex flex-col gap-2">
        <div className="bg-muted rounded-2xl px-4 py-3 shadow-sm">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.3s]" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:-0.15s]" />
            <div className="w-2 h-2 rounded-full bg-muted-foreground/40 animate-bounce" />
          </div>
        </div>
        <span className="text-xs text-muted-foreground px-1">
          Mother's Almanac is thinking...
        </span>
      </div>
    </div>
  )
}
