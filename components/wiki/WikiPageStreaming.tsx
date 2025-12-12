"use client"

import { useEffect, useState, useRef, useMemo } from "react"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { WikiNav } from "@/components/WikiNav"
import { WikiGenerating } from "./WikiGenerating"
import { WikiTableOfContents } from "./WikiTableOfContents"
import { Sparkles } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { slugify } from "@/lib/wiki/slugs"

/**
 * Convert [[wiki links]] to standard markdown links
 * [[Topic Name]] -> [Topic Name](/wiki/topic-name)
 */
function preprocessWikiLinks(content: string): string {
  return content.replace(/\[\[([^\]]+)\]\]/g, (_, topic) => {
    const slug = slugify(topic)
    return `[${topic}](/wiki/${slug})`
  })
}

/**
 * Generate a slug-style ID from heading text
 */
function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

interface WikiPageStreamingProps {
  slug: string
  initialContent?: string | null
}

type StreamStatus = "idle" | "searching" | "generating" | "finishing" | "done" | "error"

export function WikiPageStreaming({ slug, initialContent }: WikiPageStreamingProps) {
  const [status, setStatus] = useState<StreamStatus>(initialContent ? "done" : "idle")
  const [statusMessage, setStatusMessage] = useState("")
  const [content, setContent] = useState(initialContent || "")
  const [error, setError] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const contentRef = useRef<HTMLDivElement>(null)
  const hasStarted = useRef(false)

  // Extract title from streaming content
  useEffect(() => {
    const match = content.match(/^#\s+(.+?)(\n|$)/)
    if (match) {
      setTitle(match[1])
    }
  }, [content])

  // Start streaming when component mounts (only if no initial content)
  useEffect(() => {
    if (initialContent || hasStarted.current) return
    hasStarted.current = true

    async function startStream() {
      setStatus("searching")
      setStatusMessage("Searching the almanac...")

      try {
        const response = await fetch("/api/wiki/generate-stream", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug }),
        })

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`)
        }

        const reader = response.body?.getReader()
        if (!reader) {
          throw new Error("No response body")
        }

        const decoder = new TextDecoder()
        let buffer = ""

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          buffer += decoder.decode(value, { stream: true })

          // Process complete SSE messages
          const lines = buffer.split("\n\n")
          buffer = lines.pop() || ""

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6))

                switch (data.type) {
                  case "status":
                    setStatusMessage(data.message)
                    if (data.message.includes("Searching")) {
                      setStatus("searching")
                    } else if (data.message.includes("Crafting") || data.message.includes("Using AI")) {
                      setStatus("generating")
                    } else if (data.message.includes("finishing") || data.message.includes("Saving")) {
                      setStatus("finishing")
                    }
                    break

                  case "content":
                    setStatus("generating")
                    setContent((prev) => prev + data.text)
                    break

                  case "done":
                    setStatus("done")
                    // Final content with links injected
                    if (data.page?.content) {
                      setContent(data.page.content)
                    }
                    break

                  case "error":
                    setStatus("error")
                    setError(data.message)
                    break
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e)
              }
            }
          }
        }
      } catch (err) {
        console.error("Stream error:", err)
        setStatus("error")
        setError(err instanceof Error ? err.message : "Failed to generate page")
      }
    }

    startStream()
  }, [slug, initialContent])

  // Show generating UI if we haven't started receiving content yet
  if (status === "idle" || (status === "searching" && !content)) {
    return (
      <div className="min-h-screen flex flex-col">
        <WikiNav />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto">
            <WikiGenerating topic={formatSlugAsTitle(slug)} />
          </div>
        </main>
      </div>
    )
  }

  // Show error state
  if (status === "error") {
    return (
      <div className="min-h-screen flex flex-col">
        <WikiNav />
        <main className="flex-1 container mx-auto px-4 py-8">
          <div className="max-w-4xl mx-auto text-center py-16">
            <h1 className="text-2xl font-serif font-semibold text-red-600 mb-4">
              Generation Failed
            </h1>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Link
              href="/"
              className="text-almanac-sage-600 hover:text-almanac-sage-700 underline"
            >
              Return to Home
            </Link>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <WikiNav />

      <main className="flex-1 container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Status indicator while generating */}
          {status !== "done" && (
            <div className="mb-6 flex items-center gap-3 p-3 rounded-lg bg-almanac-sage-50 border border-almanac-sage-200 animate-pulse">
              <Sparkles className="h-5 w-5 text-almanac-sage-600" />
              <span className="text-sm text-almanac-sage-700">{statusMessage}</span>
            </div>
          )}

          {/* Page Header */}
          {title && (
            <header className="mb-8">
              <h1 className="font-serif text-4xl md:text-5xl font-bold text-almanac-earth-700">
                {title}
              </h1>
            </header>
          )}

          {/* Table of Contents - updates live as content streams */}
          <WikiTableOfContents content={content} />

          {/* Streaming Content */}
          <article
            ref={contentRef}
            className={cn(
              "prose prose-lg max-w-none prose-headings:font-serif prose-headings:text-almanac-earth-700 prose-p:text-foreground prose-strong:text-foreground",
              status !== "done" && "animate-in fade-in duration-300"
            )}
          >
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                // Hide the H1 since we render it separately
                h1: () => null,
                h2: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateHeadingId(text)
                  return (
                    <h2 id={id} className="scroll-mt-24" {...props}>
                      {children}
                    </h2>
                  )
                },
                h3: ({ children, ...props }) => {
                  const text = String(children)
                  const id = generateHeadingId(text)
                  return (
                    <h3 id={id} className="scroll-mt-24" {...props}>
                      {children}
                    </h3>
                  )
                },
                a: ({ href, children, ...props }) => {
                  if (href?.startsWith("/wiki/")) {
                    return (
                      <Link
                        href={href}
                        className="text-almanac-sage-700 underline decoration-almanac-sage-300 decoration-2 underline-offset-2 hover:decoration-almanac-sage-600 hover:text-almanac-sage-800 transition-colors"
                        {...props}
                      >
                        {children}
                      </Link>
                    )
                  }
                  return (
                    <a
                      href={href}
                      className="text-almanac-sage-700 no-underline hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      {...props}
                    >
                      {children}
                    </a>
                  )
                },
              }}
            >
              {preprocessWikiLinks(content)}
            </ReactMarkdown>
          </article>

          {/* Typing cursor while generating */}
          {status === "generating" && (
            <span className="inline-block w-2 h-5 bg-almanac-sage-500 animate-pulse ml-1" />
          )}
        </div>
      </main>
    </div>
  )
}

function formatSlugAsTitle(slug: string): string {
  return decodeURIComponent(slug)
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
