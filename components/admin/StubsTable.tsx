'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Sparkles, ExternalLink, Trash2, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'

interface Stub {
  id: string
  slug: string
  title: string
  mentioned_in: string[]
  mention_count: number
  confidence: 'strong' | 'medium' | 'weak'
  category: string | null
  created_at: string
  is_generated: boolean
}

interface StubsTableProps {
  stubs: Stub[]
}

export function StubsTable({ stubs }: StubsTableProps) {
  const router = useRouter()
  const [generatingId, setGeneratingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleGenerate = async (stub: Stub) => {
    setGeneratingId(stub.id)

    // Navigate to the wiki page - it will auto-generate with streaming
    router.push(`/wiki/${stub.slug}`)
  }

  const handleDelete = async (stub: Stub) => {
    if (!confirm(`Delete suggestion "${stub.title}"?`)) return

    setDeletingId(stub.id)

    try {
      const response = await fetch(`/api/admin/stubs/${stub.id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        router.refresh()
      }
    } catch (error) {
      console.error('Failed to delete stub:', error)
    } finally {
      setDeletingId(null)
    }
  }

  if (stubs.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Sparkles className="h-12 w-12 mx-auto mb-3 opacity-50" />
        <p>No topic suggestions yet</p>
        <p className="text-sm mt-1">
          Suggestions appear as you generate wiki pages with cross-links
        </p>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Topic</TableHead>
          <TableHead>Confidence</TableHead>
          <TableHead className="text-center">Mentions</TableHead>
          <TableHead>Referenced By</TableHead>
          <TableHead>Discovered</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {stubs.map((stub) => (
          <TableRow key={stub.id}>
            <TableCell className="font-medium">{stub.title}</TableCell>
            <TableCell>
              <Badge
                variant={
                  stub.confidence === 'strong'
                    ? 'default'
                    : stub.confidence === 'medium'
                    ? 'secondary'
                    : 'outline'
                }
                className="capitalize"
              >
                <span
                  className={`h-2 w-2 rounded-full mr-1 ${
                    stub.confidence === 'strong'
                      ? 'bg-green-500'
                      : stub.confidence === 'medium'
                      ? 'bg-yellow-500'
                      : 'bg-muted-foreground'
                  }`}
                />
                {stub.confidence}
              </Badge>
            </TableCell>
            <TableCell className="text-center">{stub.mention_count}</TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">
                {stub.mentioned_in.slice(0, 3).map((slug) => (
                  <Link
                    key={slug}
                    href={`/wiki/${slug}`}
                    className="text-xs text-almanac-sage-600 hover:underline"
                  >
                    {slug}
                  </Link>
                ))}
                {stub.mentioned_in.length > 3 && (
                  <span className="text-xs text-muted-foreground">
                    +{stub.mentioned_in.length - 3} more
                  </span>
                )}
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground text-sm">
              {formatDistanceToNow(new Date(stub.created_at), { addSuffix: true })}
            </TableCell>
            <TableCell className="text-right">
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="default"
                  onClick={() => handleGenerate(stub)}
                  disabled={generatingId === stub.id}
                  className="gap-1"
                >
                  {generatingId === stub.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Sparkles className="h-3 w-3" />
                  )}
                  Generate
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  asChild
                >
                  <Link href={`/wiki/${stub.slug}`} target="_blank">
                    <ExternalLink className="h-3 w-3" />
                  </Link>
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDelete(stub)}
                  disabled={deletingId === stub.id}
                  className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-100 dark:hover:bg-red-900/30"
                >
                  {deletingId === stub.id ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Trash2 className="h-3 w-3" />
                  )}
                </Button>
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
