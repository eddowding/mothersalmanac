"use client"

import { useEffect, useState } from "react"
import { Sparkles, BookOpen, Search, Lightbulb, PenTool } from "lucide-react"
import { cn } from "@/lib/utils"

const THINKING_MESSAGES = [
  { icon: Search, text: "Searching the almanac..." },
  { icon: BookOpen, text: "Gathering wisdom from our sources..." },
  { icon: Lightbulb, text: "Connecting the dots..." },
  { icon: PenTool, text: "Crafting your article..." },
  { icon: Sparkles, text: "Adding the finishing touches..." },
]

interface WikiGeneratingProps {
  topic?: string
  className?: string
}

export function WikiGenerating({ topic, className }: WikiGeneratingProps) {
  const [messageIndex, setMessageIndex] = useState(0)
  const [dots, setDots] = useState("")

  // Cycle through messages
  useEffect(() => {
    const messageInterval = setInterval(() => {
      setMessageIndex((prev) => (prev + 1) % THINKING_MESSAGES.length)
    }, 3000)

    return () => clearInterval(messageInterval)
  }, [])

  // Animate dots
  useEffect(() => {
    const dotsInterval = setInterval(() => {
      setDots((prev) => (prev.length >= 3 ? "" : prev + "."))
    }, 400)

    return () => clearInterval(dotsInterval)
  }, [])

  const currentMessage = THINKING_MESSAGES[messageIndex]
  const Icon = currentMessage.icon

  return (
    <div className={cn("flex flex-col items-center justify-center py-16 px-4", className)}>
      {/* Animated icon */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-almanac-sage-400/20 rounded-full blur-xl animate-pulse" />
        <div className="relative bg-gradient-to-br from-almanac-sage-100 to-almanac-cream-100 rounded-full p-6 shadow-lg">
          <Icon className="h-12 w-12 text-almanac-sage-600 animate-pulse" />
        </div>
      </div>

      {/* Topic being generated */}
      {topic && (
        <h2 className="text-2xl font-serif font-semibold text-almanac-earth-800 dark:text-foreground mb-4 text-center">
          {topic}
        </h2>
      )}

      {/* Status message */}
      <div className="flex items-center gap-2 text-lg text-almanac-earth-600 dark:text-muted-foreground min-h-[28px]">
        <span className="transition-opacity duration-300">{currentMessage.text}</span>
        <span className="w-6 text-left">{dots}</span>
      </div>

      {/* Progress indicator */}
      <div className="mt-8 flex gap-2">
        {THINKING_MESSAGES.map((_, idx) => (
          <div
            key={idx}
            className={cn(
              "h-2 w-2 rounded-full transition-all duration-300",
              idx === messageIndex
                ? "bg-almanac-sage-500 scale-125"
                : idx < messageIndex
                ? "bg-almanac-sage-300"
                : "bg-almanac-cream-300"
            )}
          />
        ))}
      </div>

      {/* Helpful message */}
      <p className="mt-8 text-sm text-muted-foreground text-center max-w-md">
        We&apos;re creating a personalized article just for you. This usually takes 30-60 seconds.
      </p>
    </div>
  )
}
