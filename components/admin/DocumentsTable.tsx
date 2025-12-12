'use client'

import { ColumnDef } from '@tanstack/react-table'
import { DataTable } from './DataTable'
import { StatusBadge } from './StatusBadge'
import { Button } from '@/components/ui/button'
import { ExternalLink, MoreHorizontal, Trash2, RefreshCw } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { format } from 'date-fns'
import Link from 'next/link'

type Document = {
  id: string
  title: string
  file_name: string
  file_size: number
  status: 'pending' | 'processing' | 'completed' | 'failed'
  chunk_count: number
  created_at: string
  user_profiles?: {
    name: string | null
    email: string
  }
}

const columns: ColumnDef<Document>[] = [
  {
    accessorKey: 'title',
    header: 'Title',
    cell: ({ row }) => {
      return (
        <Link
          href={`/admin/documents/${row.original.id}`}
          className="font-medium hover:underline"
        >
          {row.original.title}
        </Link>
      )
    },
  },
  {
    accessorKey: 'file_name',
    header: 'File Name',
    cell: ({ row }) => (
      <span className="text-muted-foreground text-sm">
        {row.original.file_name}
      </span>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'chunk_count',
    header: 'Chunks',
    cell: ({ row }) => (
      <span className="text-sm">{row.original.chunk_count || 0}</span>
    ),
  },
  {
    accessorKey: 'file_size',
    header: 'Size',
    cell: ({ row }) => {
      const sizeKB = (row.original.file_size / 1024).toFixed(1)
      return <span className="text-sm">{sizeKB} KB</span>
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Uploaded',
    cell: ({ row }) => (
      <span className="text-sm text-muted-foreground">
        {format(new Date(row.original.created_at), 'MMM d, yyyy')}
      </span>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={`/admin/documents/${row.original.id}`}>
                <ExternalLink className="h-4 w-4 mr-2" />
                View Details
              </Link>
            </DropdownMenuItem>
            {(row.original.status === 'failed' ||
              row.original.status === 'pending') && (
              <DropdownMenuItem>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reprocess
              </DropdownMenuItem>
            )}
            <DropdownMenuItem className="text-red-600">
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
    },
  },
]

export function DocumentsTable({ documents }: { documents: Document[] }) {
  return <DataTable columns={columns} data={documents} searchKey="title" />
}
