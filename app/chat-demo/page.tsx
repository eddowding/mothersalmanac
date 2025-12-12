/**
 * Chat Demo Page
 *
 * Demonstrates the chat interface functionality
 */

import { InlineChat } from '@/components/chat/ChatWidget'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export const metadata = {
  title: 'Chat Demo | Mother\'s Almanac',
  description: 'Interactive demo of the Mother\'s Almanac chat interface',
}

export default function ChatDemoPage() {
  return (
    <div className="container max-w-6xl py-8">
      <div className="mb-8">
        <h1 className="text-4xl font-bold mb-2">Chat Interface Demo</h1>
        <p className="text-lg text-muted-foreground">
          Try out the Mother's Almanac AI assistant with different contexts
        </p>
      </div>

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="general">General Chat</TabsTrigger>
          <TabsTrigger value="context">With Context</TabsTrigger>
          <TabsTrigger value="features">Features</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">General Parenting Questions</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Ask any question about parenting, child development, health, nutrition, or education.
            </p>
            <InlineChat className="h-[600px]" />
          </Card>
        </TabsContent>

        <TabsContent value="context" className="space-y-4">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-2">Context-Aware Chat</h2>
            <p className="text-sm text-muted-foreground mb-2">
              This chat knows you're viewing information about sleep training.
            </p>
            <Badge variant="secondary" className="mb-4">
              Current Context: Sleep Training for Toddlers
            </Badge>
            <InlineChat
              pageContext="/wiki/sleep-training"
              pageTitle="Sleep Training for Toddlers"
              className="h-[600px]"
            />
          </Card>
        </TabsContent>

        <TabsContent value="features" className="space-y-6">
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Chat Features</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    1
                  </span>
                  Streaming Responses
                </h3>
                <p className="text-sm text-muted-foreground">
                  Responses stream in real-time for a natural conversation experience
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    2
                  </span>
                  RAG Integration
                </h3>
                <p className="text-sm text-muted-foreground">
                  Answers are enhanced with relevant information from your knowledge base
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    3
                  </span>
                  Source Citations
                </h3>
                <p className="text-sm text-muted-foreground">
                  AI responses include clickable source citations showing where information came from
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    4
                  </span>
                  Context Awareness
                </h3>
                <p className="text-sm text-muted-foreground">
                  Chat understands what wiki page you're viewing for more relevant answers
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    5
                  </span>
                  Anonymous Chat
                </h3>
                <p className="text-sm text-muted-foreground">
                  Users can chat without logging in, perfect for quick questions
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    6
                  </span>
                  Conversation History
                </h3>
                <p className="text-sm text-muted-foreground">
                  Logged-in users can view and continue past conversations
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    7
                  </span>
                  Wiki Page Creation
                </h3>
                <p className="text-sm text-muted-foreground">
                  Convert AI responses into wiki pages with one click
                </p>
              </div>

              <div className="space-y-3">
                <h3 className="font-semibold flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm">
                    8
                  </span>
                  Keyboard Shortcuts
                </h3>
                <p className="text-sm text-muted-foreground">
                  Press <kbd className="px-2 py-1 bg-muted rounded text-xs">⌘J</kbd> to open chat from anywhere
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-6 bg-primary/5 border-primary/20">
            <h3 className="font-semibold mb-2">Usage Tips</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Be specific in your questions for more targeted responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Include your child's age for age-appropriate advice</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Use thumbs up/down to help improve responses</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>Click on source badges to see where information came from</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary">•</span>
                <span>For medical concerns, always consult with a healthcare provider</span>
              </li>
            </ul>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
