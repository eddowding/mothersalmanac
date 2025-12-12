'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Search, Zap, Clock, Database } from 'lucide-react'
import { ScrollArea } from '@/components/ui/scroll-area'

/**
 * Search Testing Tool Component
 *
 * Allows admins to test vector search with various parameters
 * and view detailed debug information
 */

interface SearchResult {
  id: string
  content: string
  similarity: number
  document_title: string
  document_file_name: string
  section_title: string | null
  page_number: number | null
  chunk_index: number
}

interface SearchDebugInfo {
  queryEmbeddingPreview: number[]
  searchLatency: number
  resultsCount: number
  contextSizeEstimate: number
}

export function SearchTester() {
  const [query, setQuery] = useState('')
  const [searchMode, setSearchMode] = useState<'vector' | 'hybrid' | 'keyword'>('vector')
  const [threshold, setThreshold] = useState([0.7])
  const [limit, setLimit] = useState([10])
  const [results, setResults] = useState<SearchResult[]>([])
  const [debugInfo, setDebugInfo] = useState<SearchDebugInfo | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  async function handleSearch() {
    if (!query.trim()) return

    setIsSearching(true)
    try {
      const response = await fetch('/api/admin/search/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          mode: searchMode,
          threshold: threshold[0],
          limit: limit[0],
        }),
      })

      if (!response.ok) throw new Error('Search failed')

      const data = await response.json()
      setResults(data.results)
      setDebugInfo(data.debug)
    } catch (error) {
      console.error('Search failed:', error)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Search Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Search Configuration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Query Input */}
          <div>
            <label className="text-sm font-medium mb-2 block">Query</label>
            <div className="flex gap-2">
              <Input
                placeholder="Enter search query..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              />
              <Button onClick={handleSearch} disabled={isSearching}>
                <Search className="h-4 w-4 mr-2" />
                {isSearching ? 'Searching...' : 'Search'}
              </Button>
            </div>
          </div>

          {/* Search Mode */}
          <div>
            <label className="text-sm font-medium mb-2 block">Search Mode</label>
            <Select value={searchMode} onValueChange={(value: any) => setSearchMode(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="vector">Vector Only</SelectItem>
                <SelectItem value="hybrid">Hybrid (Vector + Keyword)</SelectItem>
                <SelectItem value="keyword">Keyword Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Threshold Slider */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Similarity Threshold: {threshold[0].toFixed(2)}
            </label>
            <Slider
              value={threshold}
              onValueChange={setThreshold}
              min={0.5}
              max={1.0}
              step={0.05}
            />
          </div>

          {/* Results Limit */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Max Results: {limit[0]}
            </label>
            <Slider
              value={limit}
              onValueChange={setLimit}
              min={1}
              max={50}
              step={1}
            />
          </div>
        </CardContent>
      </Card>

      {/* Debug Information */}
      {debugInfo && (
        <div className="grid md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Query Embedding</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{debugInfo.queryEmbeddingPreview.length}d</div>
              <p className="text-xs text-muted-foreground mt-1">
                First 3: [{debugInfo.queryEmbeddingPreview.slice(0, 3).map(n => n.toFixed(4)).join(', ')}...]
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Search Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{debugInfo.searchLatency}ms</div>
              <p className="text-xs text-muted-foreground mt-1">Total execution time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="h-4 w-4" />
                Results Count
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{debugInfo.resultsCount}</div>
              <p className="text-xs text-muted-foreground mt-1">Chunks returned</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Zap className="h-4 w-4" />
                Context Size
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{debugInfo.contextSizeEstimate}</div>
              <p className="text-xs text-muted-foreground mt-1">Estimated tokens</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Search Results ({results.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-4 pr-4">
                {results.map((result) => {
                  const similarityPercent = (result.similarity * 100).toFixed(1)
                  const barColor =
                    result.similarity > 0.8
                      ? 'bg-green-500'
                      : result.similarity > 0.6
                      ? 'bg-yellow-500'
                      : 'bg-red-500'

                  return (
                    <div
                      key={result.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      {/* Result Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">
                              {result.document_title}
                            </Badge>
                            {result.section_title && (
                              <Badge variant="outline">
                                {result.section_title}
                              </Badge>
                            )}
                            {result.page_number && (
                              <Badge variant="outline">
                                Page {result.page_number}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <Badge className={barColor}>
                          {similarityPercent}%
                        </Badge>
                      </div>

                      {/* Similarity Bar */}
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className={`${barColor} h-2 rounded-full transition-all`}
                          style={{ width: `${similarityPercent}%` }}
                        />
                      </div>

                      {/* Content */}
                      <p className="text-sm">{result.content}</p>

                      {/* Metadata */}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span>Chunk #{result.chunk_index}</span>
                        <span>•</span>
                        <span>{result.document_file_name}</span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          Use in Wiki
                        </Button>
                        <Button variant="outline" size="sm">
                          View Full Document
                        </Button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isSearching && results.length === 0 && query && (
        <Card>
          <CardContent className="py-12 text-center">
            <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No Results Found</h3>
            <p className="text-sm text-muted-foreground">
              Try adjusting your search parameters or using different keywords
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
