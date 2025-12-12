/**
 * Client-Safe Storage Validation Functions
 *
 * Pure validation functions that can be used in both Client and Server Components.
 * These functions don't require Supabase or server-only imports.
 */

/**
 * Check if a file type is allowed
 * Allowed types: PDF, TXT, DOCX
 */
export function isAllowedFileType(file: File): boolean {
  const allowedTypes = [
    'application/pdf',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ]

  const allowedExtensions = ['.pdf', '.txt', '.docx']

  return (
    allowedTypes.includes(file.type) ||
    allowedExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  )
}

/**
 * Check if file size is within limits
 * Max size: 50MB
 */
export function isWithinSizeLimit(file: File): boolean {
  const MAX_SIZE = 50 * 1024 * 1024 // 50MB in bytes
  return file.size <= MAX_SIZE
}

/**
 * Validate a file for upload
 * Returns error message if invalid, null if valid
 */
export function validateFile(file: File): string | null {
  if (!isAllowedFileType(file)) {
    return 'Invalid file type. Only PDF, TXT, and DOCX files are allowed.'
  }

  if (!isWithinSizeLimit(file)) {
    return 'File size exceeds 50MB limit.'
  }

  return null
}
