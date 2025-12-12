'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { StatusBadge } from './StatusBadge'
import { Progress } from '@/components/ui/progress'
import { toast } from 'sonner'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'

/**
 * Processing Status Component
 *
 * Real-time monitoring of document processing jobs using Supabase Realtime
 *
 * Features:
 * - Live status updates via subscriptions
 * - Progress bars for active jobs
 * - Toast notifications on completion/failure
 */

interface ProcessingJob {
  id: string
  title: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
  progress?: number
  error?: string
}

export function ProcessingStatus() {
  const [jobs, setJobs] = useState<ProcessingJob[]>([])
  const supabase = createClient()

  useEffect(() => {
    // Fetch initial processing jobs
    fetchProcessingJobs()

    // Subscribe to document updates
    const channel = supabase
      .channel('document_processing')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'documents',
          filter: 'status=in.(pending,processing)',
        },
        (payload) => {
          handleRealtimeUpdate(payload)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  async function fetchProcessingJobs() {
    const { data } = await supabase
      .from('documents')
      .select('id, title, status')
      .in('status', ['pending', 'processing'])
      .order('created_at', { ascending: false })
      .limit(10)

    if (data) {
      setJobs(data as ProcessingJob[])
    }
  }

  function handleRealtimeUpdate(payload: any) {
    const { eventType, new: newRecord, old: oldRecord } = payload

    if (eventType === 'UPDATE') {
      setJobs((prevJobs) => {
        // If status changed to completed or failed, show notification
        if (
          newRecord.status === 'completed' &&
          oldRecord.status === 'processing'
        ) {
          toast.success(`Document processed: ${newRecord.title}`, {
            icon: <CheckCircle2 className="h-4 w-4" />,
          })
          // Remove from jobs list
          return prevJobs.filter((job) => job.id !== newRecord.id)
        }

        if (newRecord.status === 'failed' && oldRecord.status === 'processing') {
          toast.error(`Processing failed: ${newRecord.title}`, {
            icon: <XCircle className="h-4 w-4" />,
            description: newRecord.processing_error,
          })
          // Remove from jobs list
          return prevJobs.filter((job) => job.id !== newRecord.id)
        }

        // Update job in list
        return prevJobs.map((job) =>
          job.id === newRecord.id
            ? { ...job, status: newRecord.status }
            : job
        )
      })
    }

    if (eventType === 'INSERT') {
      // Add new job to list
      setJobs((prevJobs) => [
        {
          id: newRecord.id,
          title: newRecord.title,
          status: newRecord.status,
        },
        ...prevJobs,
      ])
    }
  }

  if (jobs.length === 0) {
    return null
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          Processing Jobs ({jobs.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {jobs.map((job) => (
          <div key={job.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium truncate">{job.title}</span>
              <StatusBadge status={job.status} />
            </div>
            {job.status === 'processing' && job.progress !== undefined && (
              <Progress value={job.progress} className="h-1" />
            )}
            {job.error && (
              <p className="text-xs text-red-600 dark:text-red-400">
                {job.error}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
