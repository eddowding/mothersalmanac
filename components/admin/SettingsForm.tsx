'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ConfirmDialog } from './ConfirmDialog'
import { AlertTriangle, Save, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Settings Form Component
 *
 * Manages all knowledge base configuration settings
 */

interface Settings {
  chunkSize: number
  chunkOverlap: number
  similarityThreshold: number
  maxContextTokens: number
  autoProcess: boolean
  embeddingModel: string
}

const DEFAULT_SETTINGS: Settings = {
  chunkSize: 1000,
  chunkOverlap: 200,
  similarityThreshold: 0.7,
  maxContextTokens: 4000,
  autoProcess: true,
  embeddingModel: 'voyage-3',
}

export function SettingsForm() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showReprocessDialog, setShowReprocessDialog] = useState(false)
  const [showClearDialog, setShowClearDialog] = useState(false)
  const [showRegenerateDialog, setShowRegenerateDialog] = useState(false)

  useEffect(() => {
    fetchSettings()
  }, [])

  async function fetchSettings() {
    setIsLoading(true)
    try {
      const response = await fetch('/api/admin/settings')
      if (!response.ok) throw new Error('Failed to fetch settings')

      const data = await response.json()
      setSettings(data.settings)
    } catch (error) {
      console.error('Failed to fetch settings:', error)
      toast.error('Failed to load settings')
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const response = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      })

      if (!response.ok) throw new Error('Failed to save settings')

      toast.success('Settings saved successfully')
    } catch (error) {
      console.error('Failed to save settings:', error)
      toast.error('Failed to save settings')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleReprocessAll() {
    try {
      const response = await fetch('/api/admin/documents/reprocess-all', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to start reprocessing')

      toast.success('Reprocessing all documents started')
    } catch (error) {
      console.error('Failed to reprocess documents:', error)
      toast.error('Failed to start reprocessing')
    }
  }

  async function handleClearChunks() {
    try {
      const response = await fetch('/api/admin/chunks', {
        method: 'DELETE',
      })

      if (!response.ok) throw new Error('Failed to clear chunks')

      toast.success('All chunks cleared successfully')
    } catch (error) {
      console.error('Failed to clear chunks:', error)
      toast.error('Failed to clear chunks')
    }
  }

  async function handleRegenerateEmbeddings() {
    try {
      const response = await fetch('/api/admin/embeddings/regenerate', {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to start regenerating')

      toast.success('Regenerating embeddings started')
    } catch (error) {
      console.error('Failed to regenerate embeddings:', error)
      toast.error('Failed to start regeneration')
    }
  }

  if (isLoading) {
    return <div>Loading settings...</div>
  }

  return (
    <div className="space-y-6">
      {/* Processing Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Settings</CardTitle>
          <CardDescription>
            Configure how documents are chunked and processed
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chunk Size */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Default Chunk Size: {settings.chunkSize} characters
            </label>
            <Slider
              value={[settings.chunkSize]}
              onValueChange={(value) =>
                setSettings({ ...settings, chunkSize: value[0] })
              }
              min={500}
              max={3000}
              step={100}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Larger chunks preserve context but may reduce precision
            </p>
          </div>

          {/* Chunk Overlap */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Chunk Overlap: {settings.chunkOverlap} characters
            </label>
            <Slider
              value={[settings.chunkOverlap]}
              onValueChange={(value) =>
                setSettings({ ...settings, chunkOverlap: value[0] })
              }
              min={50}
              max={500}
              step={50}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Overlap helps preserve context across chunk boundaries
            </p>
          </div>

          {/* Auto Process */}
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <label className="text-sm font-medium">Auto-process on Upload</label>
              <p className="text-xs text-muted-foreground">
                Automatically chunk and embed new documents
              </p>
            </div>
            <Switch
              checked={settings.autoProcess}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, autoProcess: checked })
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Search Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Search Settings</CardTitle>
          <CardDescription>
            Configure vector search and retrieval parameters
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Similarity Threshold */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Similarity Threshold: {settings.similarityThreshold.toFixed(2)}
            </label>
            <Slider
              value={[settings.similarityThreshold]}
              onValueChange={(value) =>
                setSettings({ ...settings, similarityThreshold: value[0] })
              }
              min={0.5}
              max={1.0}
              step={0.05}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Minimum similarity score for search results
            </p>
          </div>

          {/* Max Context Tokens */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Max Context Tokens: {settings.maxContextTokens}
            </label>
            <Slider
              value={[settings.maxContextTokens]}
              onValueChange={(value) =>
                setSettings({ ...settings, maxContextTokens: value[0] })
              }
              min={2000}
              max={10000}
              step={500}
            />
            <p className="text-xs text-muted-foreground mt-2">
              Maximum tokens to use for context in generation
            </p>
          </div>

          {/* Embedding Model */}
          <div>
            <label className="text-sm font-medium mb-2 block">
              Embedding Model
            </label>
            <Select
              value={settings.embeddingModel}
              onValueChange={(value) =>
                setSettings({ ...settings, embeddingModel: value })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="voyage-3">Voyage AI 3 (Recommended)</SelectItem>
                <SelectItem value="voyage-2">Voyage AI 2</SelectItem>
                <SelectItem value="text-embedding-3-large">OpenAI Large</SelectItem>
                <SelectItem value="text-embedding-3-small">OpenAI Small</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Changing this requires regenerating all embeddings
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={isSaving}>
          <Save className="h-4 w-4 mr-2" />
          {isSaving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>

      <Separator />

      {/* Dangerous Zone */}
      <Card className="border-red-200 dark:border-red-900">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            <CardTitle className="text-red-600">Danger Zone</CardTitle>
          </div>
          <CardDescription>
            Irreversible actions that affect all documents
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Reprocess All */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Reprocess All Documents</p>
              <p className="text-sm text-muted-foreground">
                Re-chunk and re-embed all documents with current settings
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowReprocessDialog(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reprocess
            </Button>
          </div>

          {/* Regenerate Embeddings */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <p className="font-medium">Regenerate All Embeddings</p>
              <p className="text-sm text-muted-foreground">
                Re-generate embeddings for all chunks (preserves chunks)
              </p>
            </div>
            <Button
              variant="outline"
              onClick={() => setShowRegenerateDialog(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          </div>

          {/* Clear All Chunks */}
          <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg">
            <div>
              <p className="font-medium text-red-600">Clear All Chunks</p>
              <p className="text-sm text-muted-foreground">
                Delete all chunks and embeddings (documents preserved)
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={() => setShowClearDialog(true)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialogs */}
      <ConfirmDialog
        open={showReprocessDialog}
        onOpenChange={setShowReprocessDialog}
        title="Reprocess All Documents?"
        description="This will re-chunk and re-embed all documents with the current settings. Existing chunks will be replaced. This operation may take several minutes."
        confirmLabel="Reprocess All"
        variant="default"
        onConfirm={handleReprocessAll}
      />

      <ConfirmDialog
        open={showRegenerateDialog}
        onOpenChange={setShowRegenerateDialog}
        title="Regenerate All Embeddings?"
        description="This will regenerate embeddings for all existing chunks. This is useful when changing embedding models. Chunks will be preserved."
        confirmLabel="Regenerate"
        variant="default"
        onConfirm={handleRegenerateEmbeddings}
      />

      <ConfirmDialog
        open={showClearDialog}
        onOpenChange={setShowClearDialog}
        title="Clear All Chunks?"
        description="This will permanently delete all chunks and embeddings. Documents will be preserved but will need to be reprocessed. This action cannot be undone."
        confirmLabel="Clear All Chunks"
        variant="danger"
        onConfirm={handleClearChunks}
      />
    </div>
  )
}
