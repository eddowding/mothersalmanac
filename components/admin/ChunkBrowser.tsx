'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Search, ChevronDown, ChevronUp, Edit, Trash2 } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'

/**
 * Chunk Browser Component
 *
 * Client-side component for browsing and managing document chunks
 */

interface Chunk {
  id: string
  content: string
  chunk_index: number
  section_title: string | null
  page_number: number | null
  char_count: number
  token_count: number | null
  embedding: number[] | null
  document_id: string
  created_at: string
  documents: {
    title: string
    file_name: string
  }
}

export function ChunkBrowser() {
  const [chunks, setChunks] = useState<Chunk[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedChunks, setExpandedChunks] = useState<Set<string>>(new Set())
  const [similarityTest, setSimilarityTest] = useState('')
  const [similarChunks, setSimilarChunks] = useState<any[]>([])

  useEffect(() => {
    fetchChunks()
  }, [searchQuery])

  async function fetchChunks() {
    setIsLoading(true)
    try {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)

      const response = await fetch(`/api/admin/chunks?${params}`)
      if (!response.ok) throw new Error('Failed to fetch chunks')

      const data = await response.json()
      setChunks(data.chunks)
    } catch (error) {
      console.error('Failed to fetch chunks:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function testSimilarity() {
    if (!similarityTest.trim()) return

    try {
      const response = await fetch('/api/admin/search/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: similarityTest }),
      })

      if (!response.ok) throw new Error('Failed to test similarity')

      const data = await response.json()
      setSimilarChunks(data.results)
    } catch (error) {
      console.error('Failed to test similarity:', error)
    }
  }

  function toggleExpanded(chunkId: string) {
    setExpandedChunks((prev) => {
      const next = new Set(prev)
      if (next.has(chunkId)) {
        next.delete(chunkId)
      } else {
        next.add(chunkId)
      }
      return next
    })
  }

  return (
    <div className="space-y-6">
      {/* Search and Similarity Test */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle>Search Chunks</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chunk content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Similarity Test</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="Enter text to find similar chunks..."
                value={similarityTest}
                onChange={(e) => setSimilarityTest(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && testSimilarity()}
              />
              <Button onClick={testSimilarity}>Test</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Similar Chunks Results */}
      {similarChunks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Similar Chunks (Top Matches)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {similarChunks.slice(0, 5).map((result: any) => (
                <div
                  key={result.id}
                  className="border rounded-lg p-4 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      Similarity: {(result.similarity * 100).toFixed(1)}%
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {result.document_title}
                    </span>
                  </div>
                  <p className="text-sm line-clamp-3">{result.content}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chunks List */}
      <Card>
        <CardHeader>
          <CardTitle>All Chunks ({chunks.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : chunks.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No chunks found</p>
            </div>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {chunks.map((chunk) => {
                  const isExpanded = expandedChunks.has(chunk.id)

                  return (
                    <div
                      key={chunk.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* Chunk Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              Chunk #{chunk.chunk_index}
                            </Badge>
                            {chunk.section_title && (
                              <Badge variant="secondary">
                                {chunk.section_title}
                              </Badge>
                            )}
                            {chunk.page_number && (
                              <Badge variant="secondary">
                                Page {chunk.page_number}
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            {chunk.documents.title}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => toggleExpanded(chunk.id)}
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                          <Button variant="ghost" size="icon-sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon-sm">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>

                      {/* Chunk Content */}
                      <div
                        className={`text-sm ${
                          !isExpanded ? 'line-clamp-3' : ''
                        }`}
                      >
                        {chunk.content}
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>{chunk.char_count} chars</span>
                        {chunk.token_count && (
                          <span>{chunk.token_count} tokens</span>
                        )}
                        {chunk.embedding && (
                          <span>Embedding: {chunk.embedding.length}d</span>
                        )}
                      </div>

                      {/* Embedding Preview (when expanded) */}
                      {isExpanded && chunk.embedding && (
                        <div className="border-t pt-3">
                          <p className="text-xs font-medium mb-2">
                            Embedding (first 10 dimensions):
                          </p>
                          <code className="text-xs bg-muted p-2 rounded block overflow-x-auto">
                            [{chunk.embedding.slice(0, 10).map(n => n.toFixed(6)).join(', ')}...]
                          </code>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
