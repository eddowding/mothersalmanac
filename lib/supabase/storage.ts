import { createClient } from './server'
import {
  isAllowedFileType,
  isWithinSizeLimit,
  validateFile as validateFileCore,
} from './storage-validation'

/**
 * Supabase Storage Helper Functions
 *
 * Handles document uploads, downloads, and deletions in Supabase Storage.
 * Uses the 'documents' bucket with path structure: {userId}/{timestamp}-{filename}
 */

const DOCUMENTS_BUCKET = 'documents'

export interface UploadResult {
  path: string
  size: number
  error?: string
}

/**
 * Upload a document to Supabase Storage
 *
 * @param file - The file to upload
 * @param userId - The user ID (used for path organization)
 * @param customFilename - Optional custom filename (defaults to original)
 * @returns Upload result with path and size
 */
export async function uploadDocument(
  file: File,
  userId: string,
  customFilename?: string
): Promise<UploadResult> {
  try {
    const supabase = await createClient()

    // Generate unique filename with timestamp
    const timestamp = Date.now()
    const filename = customFilename || file.name
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    const path = `${userId}/${timestamp}-${sanitizedFilename}`

    // Upload file to storage
    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(path, file, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false, // Don't overwrite existing files
      })

    if (error) {
      return {
        path: '',
        size: 0,
        error: error.message,
      }
    }

    return {
      path,
      size: file.size,
    }
  } catch (error) {
    return {
      path: '',
      size: 0,
      error: error instanceof Error ? error.message : 'Upload failed',
    }
  }
}

/**
 * Get a signed URL for downloading a document
 *
 * @param path - The storage path of the document
 * @param expiresIn - URL expiration time in seconds (default: 1 hour)
 * @returns Signed URL or null if error
 */
export async function downloadDocument(
  path: string,
  expiresIn: number = 3600
): Promise<{ url: string | null; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .createSignedUrl(path, expiresIn)

    if (error) {
      return {
        url: null,
        error: error.message,
      }
    }

    return {
      url: data.signedUrl,
    }
  } catch (error) {
    return {
      url: null,
      error: error instanceof Error ? error.message : 'Download failed',
    }
  }
}

/**
 * Delete a document from Supabase Storage
 *
 * @param path - The storage path of the document
 * @returns Success status
 */
export async function deleteDocument(
  path: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()

    const { error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .remove([path])

    if (error) {
      return {
        success: false,
        error: error.message,
      }
    }

    return {
      success: true,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed',
    }
  }
}

/**
 * Get the public URL for a document (if bucket is public)
 * Note: For private buckets, use downloadDocument instead
 *
 * @param path - The storage path of the document
 * @returns Public URL
 */
export async function getDocumentPublicUrl(path: string): Promise<string> {
  const supabase = await createClient()

  const { data } = supabase.storage
    .from(DOCUMENTS_BUCKET)
    .getPublicUrl(path)

  return data.publicUrl
}

/**
 * List all documents for a user
 *
 * @param userId - The user ID
 * @returns List of file paths
 */
export async function listUserDocuments(
  userId: string
): Promise<{ files: string[]; error?: string }> {
  try {
    const supabase = await createClient()

    const { data, error } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .list(userId, {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' },
      })

    if (error) {
      return {
        files: [],
        error: error.message,
      }
    }

    return {
      files: data.map((file) => `${userId}/${file.name}`),
    }
  } catch (error) {
    return {
      files: [],
      error: error instanceof Error ? error.message : 'List failed',
    }
  }
}

// Re-export validation functions for convenience
export { isAllowedFileType, isWithinSizeLimit, validateFile } from './storage-validation'
