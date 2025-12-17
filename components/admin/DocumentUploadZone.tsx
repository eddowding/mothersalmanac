'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, FileText, Loader2, BookOpen } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { validateFile } from '@/lib/supabase/storage-validation'
import { createClient } from '@/lib/supabase/client'
import type { SourceType } from '@/types/wiki'

const DOCUMENTS_BUCKET = 'documents'

interface FileWithMetadata {
  file: File
  title: string
  author: string
  sourceType: SourceType
}

interface DocumentUploadZoneProps {
  onUploadComplete: () => void
}

export function DocumentUploadZone({ onUploadComplete }: DocumentUploadZoneProps) {
  const [files, setFiles] = useState<FileWithMetadata[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const validFiles: FileWithMetadata[] = []

    acceptedFiles.forEach((file) => {
      const error = validateFile(file)
      if (error) {
        toast.error(`${file.name}: ${error}`)
      } else {
        validFiles.push({
          file,
          title: file.name.replace(/\.[^/.]+$/, ''), // Remove extension
          author: '',
          sourceType: getSourceTypeFromFile(file),
        })
      }
    })

    setFiles((prev) => [...prev, ...validFiles])
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'text/plain': ['.txt'],
      'text/markdown': ['.md'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'application/epub+zip': ['.epub'],
    },
    multiple: true,
  })

  function getSourceTypeFromFile(file: File): SourceType {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'epub') return 'book'
    if (ext === 'txt' || ext === 'md') return 'article'
    if (ext === 'docx') return 'article'
    return 'other'
  }

  function updateFileMetadata(
    index: number,
    field: keyof Omit<FileWithMetadata, 'file'>,
    value: string
  ) {
    setFiles((prev) =>
      prev.map((f, i) =>
        i === index ? { ...f, [field]: value } : f
      )
    )
  }

  function removeFile(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleUpload() {
    if (files.length === 0) {
      toast.error('Please add at least one file')
      return
    }

    // Validate all files have required metadata
    const invalidFiles = files.filter((f) => !f.title.trim())
    if (invalidFiles.length > 0) {
      toast.error('All files must have a title')
      return
    }

    setIsUploading(true)
    setUploadProgress(0)

    try {
      const supabase = createClient()

      // Get current user for file path
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        toast.error('You must be logged in to upload files')
        setIsUploading(false)
        return
      }

      const totalFiles = files.length
      let successCount = 0

      for (let i = 0; i < files.length; i++) {
        const fileData = files[i]

        try {
          // Step 1: Upload file directly to Supabase Storage (bypasses Vercel size limits)
          const timestamp = Date.now()
          const sanitizedFilename = fileData.file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
          const filePath = `${user.id}/${timestamp}-${sanitizedFilename}`

          const { error: uploadError } = await supabase.storage
            .from(DOCUMENTS_BUCKET)
            .upload(filePath, fileData.file, {
              contentType: fileData.file.type,
              cacheControl: '3600',
              upsert: false,
            })

          if (uploadError) {
            throw new Error(`Storage upload failed: ${uploadError.message}`)
          }

          // Step 2: Create database record via API
          const response = await fetch('/api/admin/documents/create', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              title: fileData.title,
              author: fileData.author,
              sourceType: fileData.sourceType,
              filePath: filePath,
              fileSize: fileData.file.size,
              originalFilename: fileData.file.name,
              contentType: fileData.file.type,
            }),
          })

          if (!response.ok) {
            const error = await response.json()
            // Try to clean up the uploaded file if DB record creation fails
            await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath])
            throw new Error(error.error || 'Failed to create document record')
          }

          successCount++
          setUploadProgress(((i + 1) / totalFiles) * 100)
        } catch (error) {
          toast.error(
            `Failed to upload ${fileData.file.name}: ${
              error instanceof Error ? error.message : 'Unknown error'
            }`
          )
        }
      }

      if (successCount === totalFiles) {
        toast.success(`Successfully uploaded ${successCount} document(s)`)
      } else if (successCount > 0) {
        toast.warning(
          `Uploaded ${successCount} of ${totalFiles} documents. Some failed.`
        )
      } else {
        toast.error('All uploads failed')
      }

      // Reset and notify
      setFiles([])
      setUploadProgress(0)
      onUploadComplete()
    } catch (error) {
      toast.error('Upload process failed')
    } finally {
      setIsUploading(false)
    }
  }

  function clearAllFiles() {
    setFiles([])
    setUploadProgress(0)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Upload Documents
        </CardTitle>
        <CardDescription>
          Drag and drop files to add them to the knowledge base. Supported formats: PDF, EPUB, DOCX, TXT, MD (max 50MB each)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Dropzone */}
        <div
          {...getRootProps()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            isDragActive
              ? 'border-primary bg-primary/5'
              : 'border-gray-300 hover:border-gray-400 dark:border-gray-600 dark:hover:border-gray-500'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
          {isDragActive ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">Drop files here...</p>
          ) : (
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                Drag and drop files here, or click to browse
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-500">
                PDF, EPUB, DOCX, TXT, MD (max 50MB each)
              </p>
            </div>
          )}
        </div>

        {/* File List */}
        {files.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-sm">Files to Upload ({files.length})</h4>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllFiles}
                disabled={isUploading}
              >
                Clear All
              </Button>
            </div>
            {files.map((fileData, index) => (
              <div
                key={index}
                className="border rounded-lg p-4 space-y-3 bg-gray-50 dark:bg-gray-900"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-gray-400" />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {fileData.file.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({(fileData.file.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(index)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Title *
                    </label>
                    <Input
                      value={fileData.title}
                      onChange={(e) =>
                        updateFileMetadata(index, 'title', e.target.value)
                      }
                      placeholder="Document title"
                      disabled={isUploading}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Author
                    </label>
                    <Input
                      value={fileData.author}
                      onChange={(e) =>
                        updateFileMetadata(index, 'author', e.target.value)
                      }
                      placeholder="Author name"
                      disabled={isUploading}
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-medium text-gray-700 dark:text-gray-300">
                      Source Type
                    </label>
                    <Select
                      value={fileData.sourceType}
                      onValueChange={(value) =>
                        updateFileMetadata(
                          index,
                          'sourceType',
                          value as SourceType
                        )
                      }
                      disabled={isUploading}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="book">Book</SelectItem>
                        <SelectItem value="article">Article</SelectItem>
                        <SelectItem value="pdf">PDF</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            ))}

            {/* Upload Progress */}
            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Uploading...</span>
                  <span className="font-medium">{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Upload Button */}
            <div className="flex justify-end pt-2">
              <Button
                type="button"
                onClick={handleUpload}
                disabled={isUploading || files.length === 0}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload {files.length} File(s)
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
