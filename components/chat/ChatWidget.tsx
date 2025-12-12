/**
 * ChatWidget Component
 *
 * Floating chat button that opens a modal/sidebar chat panel
 * Supports keyboard shortcuts and context awareness
 */

'use client'

import { useState, useEffect } from 'react'
import { ChatPanel } from './ChatPanel'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { MessageCircle, X, Minimize2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'

export interface ChatWidgetProps {
  pageContext?: string
  pageTitle?: string
  defaultOpen?: boolean
  position?: 'bottom-right' | 'bottom-left'
}

export function ChatWidget({
  pageContext,
  pageTitle,
  defaultOpen = false,
  position = 'bottom-right',
}: ChatWidgetProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen)
  const [isMinimized, setIsMinimized] = useState(false)
  const [hasNewMessage, setHasNewMessage] = useState(false)
  const router = useRouter()

  // Keyboard shortcut: Cmd/Ctrl + J to toggle chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'j') {
        e.preventDefault()
        setIsOpen((prev) => !prev)
        setIsMinimized(false)
      }

      // ESC to close
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  // Reset new message indicator when chat is opened
  useEffect(() => {
    if (isOpen) {
      setHasNewMessage(false)
    }
  }, [isOpen])

  const handleClose = () => {
    setIsOpen(false)
    setIsMinimized(false)
  }

  const handleMinimize = () => {
    setIsMinimized(true)
    setIsOpen(false)
  }

  const handleCreateWikiPage = (content: string) => {
    // Navigate to wiki page creation with pre-filled content
    const params = new URLSearchParams({
      content,
      source: 'chat',
    })
    router.push(`/admin/wiki/new?${params.toString()}`)
  }

  // Desktop: Full sidebar
  const renderDesktopChat = () => (
    <div
      className={cn(
        'fixed top-0 bottom-0 w-[450px] z-50 transition-transform duration-300 ease-in-out',
        position === 'bottom-right' ? 'right-0' : 'left-0',
        isOpen ? 'translate-x-0' : position === 'bottom-right' ? 'translate-x-full' : '-translate-x-full'
      )}
    >
      <ChatPanel
        pageContext={pageContext}
        pageTitle={pageTitle}
        onClose={handleClose}
        onCreateWikiPage={handleCreateWikiPage}
        className="h-full"
      />
    </div>
  )

  // Mobile: Full screen modal
  const renderMobileChat = () => (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-full h-full p-0 gap-0">
        <ChatPanel
          pageContext={pageContext}
          pageTitle={pageTitle}
          onClose={handleClose}
          onCreateWikiPage={handleCreateWikiPage}
          className="h-full rounded-none border-0"
        />
      </DialogContent>
    </Dialog>
  )

  return (
    <>
      {/* Chat Panel - Desktop (hidden on mobile) */}
      <div className="hidden md:block">{renderDesktopChat()}</div>

      {/* Chat Panel - Mobile (hidden on desktop) */}
      <div className="md:hidden">{renderMobileChat()}</div>

      {/* Floating Button */}
      <div
        className={cn(
          'fixed bottom-6 z-40',
          position === 'bottom-right' ? 'right-6' : 'left-6'
        )}
      >
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className={cn(
            'h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200',
            'relative group',
            isOpen && 'hidden'
          )}
          aria-label="Open chat"
        >
          <MessageCircle className="w-6 h-6" />
          {hasNewMessage && (
            <span className="absolute top-0 right-0 w-3 h-3 bg-destructive rounded-full border-2 border-background" />
          )}

          {/* Tooltip */}
          <span className="absolute bottom-full mb-2 px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
            Ask the Almanac
            <span className="text-xs text-muted-foreground ml-2">
              (⌘J)
            </span>
          </span>
        </Button>

        {/* Minimized state indicator */}
        {isMinimized && !isOpen && (
          <Button
            onClick={() => {
              setIsOpen(true)
              setIsMinimized(false)
            }}
            size="lg"
            variant="secondary"
            className="h-14 px-4 rounded-full shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label="Restore chat"
          >
            <MessageCircle className="w-5 h-5 mr-2" />
            <span className="text-sm font-medium">Continue chat</span>
          </Button>
        )}
      </div>

      {/* Overlay for desktop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-40 hidden md:block transition-opacity"
          onClick={handleClose}
          aria-hidden="true"
        />
      )}
    </>
  )
}

/**
 * Inline Chat Component
 * For embedding chat directly in a page (not floating)
 */
export function InlineChat({
  pageContext,
  pageTitle,
  className,
}: {
  pageContext?: string
  pageTitle?: string
  className?: string
}) {
  const router = useRouter()

  const handleCreateWikiPage = (content: string) => {
    const params = new URLSearchParams({
      content,
      source: 'chat',
    })
    router.push(`/admin/wiki/new?${params.toString()}`)
  }

  return (
    <div className={cn('h-[600px] border rounded-lg overflow-hidden', className)}>
      <ChatPanel
        pageContext={pageContext}
        pageTitle={pageTitle}
        onCreateWikiPage={handleCreateWikiPage}
      />
    </div>
  )
}
