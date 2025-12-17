'use client'

import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { X, Upload, FileText, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
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
import type { SourceType } from '@/types/wiki'

interface FileWithMetadata {
  file: File
  title: string
  author: string
  sourceType: SourceType
}

interface DocumentUploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onUploadComplete: () => void
}

export function DocumentUploadModal({
  open,
  onOpenChange,
  onUploadComplete,
}: DocumentUploadModalProps) {
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
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        ['.docx'],
    },
    multiple: true,
  })

  function getSourceTypeFromFile(file: File): SourceType {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext === 'pdf') return 'pdf'
    if (ext === 'txt') return 'article'
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
      const totalFiles = files.length
      let successCount = 0

      for (let i = 0; i < files.length; i++) {
        const fileData = files[i]

        // Create FormData for upload
        const formData = new FormData()
        formData.append('file', fileData.file)
        formData.append('title', fileData.title)
        formData.append('author', fileData.author)
        formData.append('sourceType', fileData.sourceType)

        try {
          const response = await fetch('/api/admin/documents/upload', {
            method: 'POST',
            body: formData,
          })

          if (!response.ok) {
            const error = await response.json()
            throw new Error(error.error || 'Upload failed')
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

      // Reset and close
      setFiles([])
      setUploadProgress(0)
      onUploadComplete()
      onOpenChange(false)
    } catch (error) {
      toast.error('Upload process failed')
    } finally {
      setIsUploading(false)
    }
  }

  function handleClose() {
    if (!isUploading) {
      setFiles([])
      setUploadProgress(0)
      onOpenChange(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Upload Documents</DialogTitle>
          <DialogDescription>
            Upload PDF, TXT, or DOCX files to process and add to the knowledge
            base. Maximum file size: 50MB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Dropzone */}
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            {isDragActive ? (
              <p className="text-sm text-muted-foreground">Drop files here...</p>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-1">
                  Drag and drop files here, or click to browse
                </p>
                <p className="text-xs text-muted-foreground/70">
                  PDF, TXT, DOCX (max 50MB each)
                </p>
              </div>
            )}
          </div>

          {/* File List */}
          {files.length > 0 && (
            <div className="space-y-3">
              <h4 className="font-medium text-sm">Files to Upload ({files.length})</h4>
              {files.map((fileData, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-4 space-y-3 bg-muted/50"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-5 w-5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">
                        {fileData.file.name}
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
                      <label className="text-xs font-medium text-foreground">
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
                      <label className="text-xs font-medium text-foreground">
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
                      <label className="text-xs font-medium text-foreground">
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
            </div>
          )}

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Uploading...</span>
                <span className="font-medium">{Math.round(uploadProgress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div
                  className="bg-primary h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isUploading}
          >
            Cancel
          </Button>
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
              <>Upload {files.length} File(s)</>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
