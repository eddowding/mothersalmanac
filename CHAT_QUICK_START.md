# Chat System Quick Start Guide

Get the Mother's Almanac chat interface up and running in 5 minutes.

## Step 1: Apply Database Migration

### Option A: Manual (Recommended)

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Create a new query
4. Copy the contents of `supabase/migrations/004_chat_enhancements.sql`
5. Paste and execute

### Option B: Via Supabase MCP (if configured)

The migration will create:
- `chat_conversations` table
- `chat_messages_new` table
- `chat_analytics` table
- RLS policies for secure access
- Helper functions for auto-titling

## Step 2: Verify Environment Variables

Ensure your `.env.local` has:

```bash
# Required
ANTHROPIC_API_KEY=sk-ant-...
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJh...
SUPABASE_SERVICE_ROLE_KEY=eyJh...
```

## Step 3: Test the Chat Interface

### Quick Test via Demo Page

1. Start your dev server:
   ```bash
   npm run dev
   ```

2. Visit the demo page:
   ```
   http://localhost:3000/chat-demo
   ```

3. Try asking a question:
   - "How can I help with sleep training?"
   - "What are typical milestones for a 2-year-old?"
   - "Tips for picky eaters?"

### Verify Functionality

✅ **Message sends successfully**
- Type a message and press Send
- Should see typing indicator
- Response streams in real-time

✅ **Sources display (if you have documents)**
- AI responses show source badges
- Click on sources to see preview

✅ **Conversation saves**
- Check Supabase dashboard
- Should see entry in `chat_conversations`
- Messages in `chat_messages_new`

## Step 4: Add to Your App

### Add Floating Widget to Layout

Edit `/app/layout.tsx`:

```tsx
import { ChatWidget } from '@/components/chat'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <ChatWidget />
      </body>
    </html>
  )
}
```

### Test the Widget

1. Visit any page on your site
2. Look for floating chat button in bottom-right
3. Press `⌘J` (Mac) or `Ctrl+J` (Windows) to toggle
4. Click the button to open chat

## Step 5: Test with Context

### Add to Wiki Pages

Edit a wiki page template to include context:

```tsx
import { ChatWidget } from '@/components/chat'

export default function WikiPage({ params }) {
  return (
    <>
      {/* Your wiki content */}
      <ChatWidget
        pageContext={`/wiki/${params.slug}`}
        pageTitle="Sleep Training"
      />
    </>
  )
}
```

### Test Context-Aware Chat

1. Visit the wiki page
2. Open chat
3. Should see badge showing "Context: /wiki/..."
4. Ask questions related to the page
5. AI should reference the page context

## Step 6: Verify Features

### Keyboard Shortcuts
- [ ] `⌘J` opens/closes chat
- [ ] `ESC` closes chat panel

### Message Display
- [ ] User messages right-aligned, blue background
- [ ] AI messages left-aligned, gray background
- [ ] Timestamps show on hover
- [ ] Markdown formatting works

### Feedback
- [ ] Thumbs up/down buttons appear on hover
- [ ] Clicking feedback disables both buttons
- [ ] Feedback saved to `chat_analytics`

### Mobile Responsiveness
- [ ] Chat button visible on mobile
- [ ] Chat opens full-screen on mobile
- [ ] Chat opens as sidebar on desktop (>768px)

### Conversation Management
- [ ] Visit `/chat/history` (requires login)
- [ ] See list of conversations
- [ ] Click conversation to continue
- [ ] Delete conversation works

## Troubleshooting

### "Failed to send message"

**Check:**
1. `ANTHROPIC_API_KEY` is valid
2. API key has credits remaining
3. Browser console for errors

**Fix:**
```bash
# Verify env variable is loaded
echo $ANTHROPIC_API_KEY

# Restart dev server
npm run dev
```

### No sources showing

**Reason:** No documents in knowledge base

**Fix:**
1. Upload documents via admin panel
2. Ensure embeddings are generated
3. Test vector search is working

### Migration errors

**Common issues:**

1. **Table already exists**
   - Check if old `chat_sessions`/`chat_messages` exist
   - Migration handles this automatically
   - Uncomment cleanup section to drop old tables

2. **Permission denied**
   - Run migration as Supabase admin
   - Check RLS policies are correct

3. **Function conflicts**
   - Drop existing `generate_conversation_title` function
   - Re-run migration

### Chat not saving

**Check database permissions:**

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE 'chat%';

-- Should return 'true' for all chat tables
```

## Performance Testing

### Load Test

1. Send 10 rapid messages
2. Verify all save to database
3. Check streaming doesn't break
4. Confirm no duplicate messages

### RAG Performance

With documents loaded:

1. Ask question requiring knowledge base
2. Should return sources within 2-3 seconds
3. Check `X-Sources-Count` header in Network tab
4. Verify sources are relevant

### Concurrent Users

1. Open chat in two browser windows
2. Send messages from both
3. Verify no message cross-over
4. Check conversations are separate

## Next Steps

### Customize for Your Use Case

1. **Edit system prompt** (`/lib/chat/prompts.ts`)
   - Adjust personality
   - Add domain-specific knowledge
   - Modify response guidelines

2. **Update conversation starters**
   - Make them relevant to your content
   - Add common questions

3. **Style the interface**
   - Match your brand colors
   - Adjust component styling
   - Customize animations

### Production Checklist

- [ ] API key stored in production environment
- [ ] Database migration applied to production
- [ ] Rate limiting configured on API routes
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Analytics tracking implemented
- [ ] User feedback monitored
- [ ] Performance monitoring enabled

### Monitor Usage

Query analytics:

```sql
-- Messages per day
SELECT
  DATE(created_at) as date,
  COUNT(*) as message_count
FROM chat_messages_new
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Average messages per conversation
SELECT
  AVG(msg_count) as avg_messages
FROM (
  SELECT
    conversation_id,
    COUNT(*) as msg_count
  FROM chat_messages_new
  GROUP BY conversation_id
) as counts;

-- Feedback ratio
SELECT
  event_type,
  COUNT(*) as count
FROM chat_analytics
WHERE event_type IN ('feedback_positive', 'feedback_negative')
GROUP BY event_type;
```

## Support

If you encounter issues:

1. Check browser console for errors
2. Review Supabase logs in dashboard
3. Test with `/chat-demo` to isolate issue
4. Verify all environment variables are set

## Success Criteria

Your chat system is working when:

✅ Messages send and stream in real-time
✅ Conversations save to database
✅ Sources display on AI responses (with documents)
✅ Keyboard shortcuts work
✅ Mobile and desktop layouts render correctly
✅ Error states show helpful messages
✅ Conversation history accessible at `/chat/history`

## Demo Video Script

To record a demo:

1. **Open chat** - Press ⌘J or click button
2. **Ask question** - "How do I sleep train my toddler?"
3. **Watch stream** - Response appears in real-time
4. **View sources** - Click source badges to see citations
5. **Give feedback** - Thumbs up on helpful response
6. **Continue chat** - Ask follow-up question
7. **Create wiki** - Click "Create Wiki Page" button
8. **View history** - Navigate to `/chat/history`
9. **Context test** - Open chat on wiki page, see context badge
10. **Mobile test** - Resize browser, see full-screen modal

Congratulations! Your chat system is ready to use! 🎉
