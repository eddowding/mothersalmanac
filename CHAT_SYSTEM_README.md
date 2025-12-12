# Mother's Almanac Chat System

Complete chat interface implementation with Claude AI, RAG integration, and streaming responses.

## Features

### Core Functionality
- **Streaming Responses**: Real-time streaming from Claude Sonnet 4.5
- **RAG Integration**: Automatic context retrieval from knowledge base
- **Source Citations**: Displays sources used in AI responses
- **Context Awareness**: Understands current wiki page for relevant answers
- **Anonymous Chat**: Works without authentication for quick questions
- **Conversation History**: Logged-in users can view and continue conversations
- **Mobile Responsive**: Full-screen on mobile, sidebar on desktop
- **Dark Mode**: Automatic dark mode support
- **Keyboard Shortcuts**: `⌘J` to open chat from anywhere

### User Experience
- Smooth animations and transitions
- Typing indicator during AI thinking
- Message feedback (thumbs up/down)
- Quick action buttons for common questions
- Conversation starters for empty state
- Error handling with retry functionality
- Auto-scroll to latest messages

## Architecture

### Components

```
components/chat/
├── ChatWidget.tsx          # Floating button and modal wrapper
├── ChatPanel.tsx           # Main chat interface
├── MessageBubble.tsx       # Individual message display
├── TypingIndicator.tsx     # "..." animation
├── SourcesPreview.tsx      # Source citations display
└── index.ts                # Barrel export
```

### API Routes

```
app/api/chat/route.ts       # POST: Send message with streaming
                           # GET: Fetch conversation history
```

### Libraries

```
lib/chat/
├── index.ts                # Core helper functions
├── prompts.ts              # System prompts and starters
├── types.ts                # TypeScript definitions
└── useChat.ts              # React hook for chat
```

### Database Schema

```sql
-- Conversations table
chat_conversations (
  id, user_id, title, page_context,
  created_at, updated_at
)

-- Messages table
chat_messages_new (
  id, conversation_id, role, content,
  sources, metadata, created_at
)

-- Analytics table
chat_analytics (
  id, conversation_id, message_id,
  event_type, metadata, created_at
)
```

## Setup

### 1. Apply Database Migration

The migration file is located at:
```
supabase/migrations/004_chat_enhancements.sql
```

Apply it to your Supabase project:

```bash
# Using Supabase CLI (if you have local setup)
supabase db push

# Or manually via Supabase Dashboard:
# 1. Go to SQL Editor
# 2. Copy contents of 004_chat_enhancements.sql
# 3. Execute the SQL
```

### 2. Environment Variables

Ensure these are set in `.env.local`:

```bash
# Anthropic API (required)
ANTHROPIC_API_KEY=your-anthropic-api-key

# Supabase (required)
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 3. Dependencies

Already installed:
```bash
npm install ai @ai-sdk/anthropic
```

## Usage

### 1. Floating Chat Widget

Add to any page layout:

```tsx
import { ChatWidget } from '@/components/chat'

export default function Layout({ children }) {
  return (
    <>
      {children}
      <ChatWidget />
    </>
  )
}
```

With page context:

```tsx
<ChatWidget
  pageContext="/wiki/sleep-training"
  pageTitle="Sleep Training for Toddlers"
/>
```

### 2. Inline Chat

Embed chat directly in a page:

```tsx
import { InlineChat } from '@/components/chat'

export default function ChatPage() {
  return (
    <div className="h-screen">
      <InlineChat
        pageContext="/wiki/sleep-training"
        pageTitle="Sleep Training"
        className="h-full"
      />
    </div>
  )
}
```

### 3. Custom Integration

Use the hook directly:

```tsx
'use client'

import { useAlmanacChat } from '@/lib/chat/useChat'

export function CustomChat() {
  const {
    messages,
    input,
    handleInputChange,
    handleSubmit,
    isLoading,
  } = useAlmanacChat({
    pageContext: '/wiki/sleep-training',
    pageTitle: 'Sleep Training',
  })

  return (
    <div>
      {/* Your custom UI */}
    </div>
  )
}
```

## API Reference

### POST /api/chat

Send a message and receive streaming response.

**Request Body:**
```json
{
  "conversationId": "optional-uuid",
  "message": "How do I sleep train my toddler?",
  "pageContext": "/wiki/sleep-training",
  "pageTitle": "Sleep Training"
}
```

**Response:**
- Streaming text response
- Headers:
  - `X-Conversation-Id`: UUID of conversation
  - `X-Sources-Count`: Number of sources used

### GET /api/chat?conversationId=xxx

Fetch conversation history.

**Response:**
```json
{
  "id": "conversation-uuid",
  "userId": "user-uuid",
  "title": "Sleep training questions",
  "pageContext": "/wiki/sleep-training",
  "createdAt": "2025-01-01T00:00:00Z",
  "updatedAt": "2025-01-01T00:00:00Z",
  "messages": [
    {
      "id": "message-uuid",
      "role": "user",
      "content": "How do I sleep train?",
      "createdAt": "2025-01-01T00:00:00Z"
    },
    {
      "id": "message-uuid",
      "role": "assistant",
      "content": "Sleep training involves...",
      "sources": [...],
      "metadata": {...},
      "createdAt": "2025-01-01T00:00:00Z"
    }
  ]
}
```

## Helper Functions

### Chat Management

```typescript
import {
  getOrCreateConversation,
  getConversationHistory,
  getUserConversations,
  saveMessage,
  deleteConversation,
} from '@/lib/chat'

// Create or get conversation
const convId = await getOrCreateConversation(
  conversationId,
  pageContext,
  userId
)

// Get conversation with messages
const conversation = await getConversationHistory(convId)

// Get user's conversations
const conversations = await getUserConversations(userId, 50)

// Save a message
const message = await saveMessage(
  convId,
  'user',
  'Hello!',
  sources,
  metadata
)

// Delete conversation
await deleteConversation(convId)
```

### RAG Integration

```typescript
import { getRAGContext } from '@/lib/chat'

const { context, sources } = await getRAGContext(
  'How do I sleep train?',
  '/wiki/sleep-training'
)
```

### Analytics

```typescript
import { trackChatEvent } from '@/lib/chat'

await trackChatEvent({
  conversationId: 'conv-id',
  messageId: 'msg-id',
  eventType: 'feedback_positive',
  metadata: { helpful: true }
})
```

## Customization

### System Prompt

Edit `/lib/chat/prompts.ts` to customize the AI's personality and behavior.

### Conversation Starters

Modify `CONVERSATION_STARTERS` in `/lib/chat/prompts.ts`:

```typescript
export const CONVERSATION_STARTERS = [
  "How can I help with sleep training?",
  "What are typical developmental milestones?",
  // Add your own...
]
```

### Quick Actions

Modify `QUICK_ACTIONS` in `/lib/chat/prompts.ts`:

```typescript
export const QUICK_ACTIONS = [
  {
    id: 'sleep',
    label: 'Sleep Help',
    prompt: "I need help with my child's sleep routine",
  },
  // Add your own...
]
```

### Styling

All components use Tailwind CSS and support dark mode automatically.

Customize colors in `tailwind.config.ts` or override component classes:

```tsx
<ChatWidget className="custom-widget-class" />
<ChatPanel className="custom-panel-class" />
```

## Pages

### Chat Demo
- **URL**: `/chat-demo`
- **Purpose**: Interactive demo with examples

### Chat History
- **URL**: `/chat/history`
- **Purpose**: View all conversations
- **Auth**: Required

### Single Conversation
- **URL**: `/chat/[id]`
- **Purpose**: Continue a specific conversation
- **Auth**: Required

## Keyboard Shortcuts

- `⌘J` (Mac) / `Ctrl+J` (Windows): Toggle chat
- `ESC`: Close chat panel

## Analytics Events

The system tracks the following events:

- `message_sent`: User or assistant message sent
- `feedback_positive`: User gave positive feedback
- `feedback_negative`: User gave negative feedback
- `wiki_page_created`: Wiki page created from chat

Access analytics data:

```sql
SELECT * FROM chat_analytics
WHERE event_type = 'message_sent'
ORDER BY created_at DESC;
```

## Performance

### Caching
- Vector search results are cached per query
- Conversation history is fetched on-demand

### Optimization
- Streaming reduces perceived latency
- Messages are paginated (default 50 per conversation)
- Lazy loading of conversation list

## Security

### RLS Policies
- Users can only access their own conversations
- Anonymous users can create conversations
- Admins can view all conversations (read-only)

### API Security
- Rate limiting via Vercel Edge
- User authentication optional
- Input sanitization for queries

## Troubleshooting

### Chat not responding
1. Check `ANTHROPIC_API_KEY` is set
2. Verify Supabase connection
3. Check browser console for errors

### No sources shown
1. Ensure documents are uploaded
2. Check vector search is working
3. Verify embeddings are generated

### Migration errors
1. Check Supabase permissions
2. Ensure old tables don't conflict
3. Review migration logs

## Examples

See working examples:
- Demo page: `/chat-demo`
- History page: `/chat/history`
- Wiki integration: Look at any wiki page with ChatWidget

## Next Steps

1. **Apply the migration** to create database tables
2. **Test the chat** at `/chat-demo`
3. **Add ChatWidget** to your layouts
4. **Customize prompts** for your use case
5. **Upload documents** to enable RAG

## Support

For issues or questions:
- Check the implementation in `/components/chat/`
- Review API routes in `/app/api/chat/`
- Test with the demo at `/chat-demo`
