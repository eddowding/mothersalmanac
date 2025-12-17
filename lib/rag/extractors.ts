/**
 * Text Extraction Library
 *
 * Extracts text content from various file formats:
 * - PDF (.pdf)
 * - Microsoft Word (.docx)
 * - EPUB (.epub)
 * - Plain text (.txt, .md)
 */

import * as mammoth from 'mammoth';
import EPub from 'epub2';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

// pdf-parse is a CommonJS module, so we need to handle it specially
// We'll dynamically import it when needed
let pdfParseModule: any = null;

async function getPdfParse() {
  if (!pdfParseModule) {
    // Dynamic import for CommonJS module compatibility
    pdfParseModule = await import('pdf-parse');
  }
  // Handle both default export and named export patterns
  return pdfParseModule.default || pdfParseModule;
}

export interface ExtractionResult {
  text: string;
  metadata: {
    pageCount?: number;
    wordCount: number;
    charCount: number;
    extractionTime: number; // milliseconds
  };
}

export interface ExtractionError {
  error: string;
  details?: string;
}

/**
 * Extract text from PDF file
 *
 * Uses pdf-parse library to extract text from PDF documents.
 * Handles multi-page PDFs and preserves basic structure.
 *
 * @param fileBuffer - Buffer containing PDF file data
 * @returns Extracted text and metadata
 */
export async function extractTextFromPDF(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    const pdfParse = await getPdfParse();
    const data = await pdfParse(fileBuffer);

    const extractionTime = Date.now() - startTime;
    const text = data.text;
    const wordCount = countWords(text);
    const charCount = text.length;

    return {
      text,
      metadata: {
        pageCount: data.numpages,
        wordCount,
        charCount,
        extractionTime,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from PDF: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from Microsoft Word (.docx) file
 *
 * Uses mammoth library to convert DOCX to plain text.
 * Preserves paragraphs and basic structure, ignores formatting.
 *
 * @param fileBuffer - Buffer containing DOCX file data
 * @returns Extracted text and metadata
 */
export async function extractTextFromDOCX(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    const result = await mammoth.extractRawText({ buffer: fileBuffer });

    const extractionTime = Date.now() - startTime;
    const text = result.value;
    const wordCount = countWords(text);
    const charCount = text.length;

    // Check for warnings/errors during conversion
    if (result.messages.length > 0) {
      const warnings = result.messages
        .filter(m => m.type === 'warning')
        .map(m => m.message);

      if (warnings.length > 0) {
        console.warn('DOCX extraction warnings:', warnings);
      }
    }

    return {
      text,
      metadata: {
        wordCount,
        charCount,
        extractionTime,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from DOCX: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Extract text from EPUB file
 *
 * EPUBs are ZIP archives containing HTML chapters.
 * Extracts text from all chapters in reading order.
 *
 * @param fileBuffer - Buffer containing EPUB file data
 * @returns Extracted text and metadata
 */
export async function extractTextFromEPUB(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  const startTime = Date.now();

  // epub2 requires a file path, so we write to temp file
  const tempDir = os.tmpdir();
  const tempFile = path.join(tempDir, `epub_${Date.now()}_${Math.random().toString(36).slice(2)}.epub`);

  try {
    // Write buffer to temp file
    await fs.promises.writeFile(tempFile, fileBuffer);

    // Parse EPUB
    const epub = await EPub.createAsync(tempFile);

    // Get chapter IDs in reading order
    const chapterIds = epub.flow.map((chapter: any) => chapter.id);

    // Extract text from each chapter
    const chapters: string[] = [];

    for (const id of chapterIds) {
      try {
        const chapter = await promisify(epub.getChapter.bind(epub))(id) as string;
        if (chapter) {
          // Strip HTML tags to get plain text
          const plainText = chapter
            .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '') // Remove scripts
            .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '') // Remove styles
            .replace(/<[^>]+>/g, ' ') // Remove HTML tags
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#\d+;/g, '') // Remove numeric entities
            .replace(/\s+/g, ' ') // Normalize whitespace
            .trim();

          if (plainText.length > 0) {
            chapters.push(plainText);
          }
        }
      } catch (chapterError) {
        console.warn(`Failed to extract chapter ${id}:`, chapterError);
      }
    }

    const text = chapters.join('\n\n');
    const extractionTime = Date.now() - startTime;
    const wordCount = countWords(text);
    const charCount = text.length;

    return {
      text,
      metadata: {
        pageCount: chapterIds.length, // Use chapter count as "page" count
        wordCount,
        charCount,
        extractionTime,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from EPUB: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  } finally {
    // Clean up temp file
    try {
      await fs.promises.unlink(tempFile);
    } catch {
      // Ignore cleanup errors
    }
  }
}

/**
 * Extract text from plain text file
 *
 * Handles .txt, .md, and other text-based formats.
 * Validates UTF-8 encoding.
 *
 * @param fileBuffer - Buffer containing text file data
 * @returns Extracted text and metadata
 */
export async function extractTextFromTXT(
  fileBuffer: Buffer
): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // Try UTF-8 first
    let text = fileBuffer.toString('utf-8');

    // Check for invalid UTF-8 characters
    if (text.includes('\ufffd')) {
      // Try other encodings
      text = fileBuffer.toString('latin1');
    }

    const extractionTime = Date.now() - startTime;
    const wordCount = countWords(text);
    const charCount = text.length;

    return {
      text,
      metadata: {
        wordCount,
        charCount,
        extractionTime,
      },
    };
  } catch (error) {
    throw new Error(
      `Failed to extract text from TXT: ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

/**
 * Auto-detect file type and extract text accordingly
 *
 * @param fileBuffer - Buffer containing file data
 * @param mimeType - MIME type of the file
 * @param fileName - Optional file name for extension-based fallback
 * @returns Extracted text and metadata
 */
export async function extractText(
  fileBuffer: Buffer,
  mimeType?: string,
  fileName?: string
): Promise<ExtractionResult> {
  // If no mime type, try to extract by file extension
  if (!mimeType && fileName) {
    return extractTextByExtension(fileBuffer, fileName);
  }

  if (!mimeType) {
    throw new Error('No MIME type or file name provided for text extraction');
  }

  // Normalize MIME type
  const normalizedMime = mimeType.toLowerCase().trim();

  // Determine extraction method based on MIME type
  if (normalizedMime === 'application/pdf' || normalizedMime.includes('pdf')) {
    return extractTextFromPDF(fileBuffer);
  }

  if (
    normalizedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    normalizedMime.includes('word') ||
    normalizedMime.includes('docx')
  ) {
    return extractTextFromDOCX(fileBuffer);
  }

  if (
    normalizedMime === 'application/epub+zip' ||
    normalizedMime.includes('epub')
  ) {
    return extractTextFromEPUB(fileBuffer);
  }

  if (
    normalizedMime === 'text/plain' ||
    normalizedMime === 'text/markdown' ||
    normalizedMime.startsWith('text/')
  ) {
    return extractTextFromTXT(fileBuffer);
  }

  throw new Error(`Unsupported file type: ${mimeType}`);
}

/**
 * Extract text by file extension (fallback if MIME type is unreliable)
 *
 * @param fileBuffer - Buffer containing file data
 * @param fileName - Name of the file including extension
 * @returns Extracted text and metadata
 */
export async function extractTextByExtension(
  fileBuffer: Buffer,
  fileName: string
): Promise<ExtractionResult> {
  const extension = fileName.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'pdf':
      return extractTextFromPDF(fileBuffer);

    case 'docx':
    case 'doc':
      return extractTextFromDOCX(fileBuffer);

    case 'epub':
      return extractTextFromEPUB(fileBuffer);

    case 'txt':
    case 'md':
    case 'text':
    case 'markdown':
      return extractTextFromTXT(fileBuffer);

    default:
      throw new Error(`Unsupported file extension: ${extension}`);
  }
}

/**
 * Validate file before extraction
 *
 * @param fileBuffer - Buffer containing file data
 * @param fileName - Name of the file
 * @param maxSizeMB - Maximum file size in megabytes
 * @returns Validation result
 */
export function validateFile(
  fileBuffer: Buffer,
  fileName: string,
  maxSizeMB: number = 50
): { valid: boolean; error?: string } {
  // Check file size
  const fileSizeMB = fileBuffer.length / (1024 * 1024);
  if (fileSizeMB > maxSizeMB) {
    return {
      valid: false,
      error: `File size (${fileSizeMB.toFixed(2)} MB) exceeds maximum allowed size (${maxSizeMB} MB)`,
    };
  }

  // Check file extension
  const extension = fileName.split('.').pop()?.toLowerCase();
  const supportedExtensions = ['pdf', 'docx', 'doc', 'epub', 'txt', 'md'];

  if (!extension || !supportedExtensions.includes(extension)) {
    return {
      valid: false,
      error: `Unsupported file type. Supported formats: ${supportedExtensions.join(', ')}`,
    };
  }

  // Check buffer is not empty
  if (fileBuffer.length === 0) {
    return {
      valid: false,
      error: 'File is empty',
    };
  }

  return { valid: true };
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter(word => word.length > 0).length;
}

/**
 * Get supported file types
 */
export function getSupportedFileTypes(): {
  extensions: string[];
  mimeTypes: string[];
  maxSizeMB: number;
} {
  return {
    extensions: ['pdf', 'docx', 'doc', 'epub', 'txt', 'md'],
    mimeTypes: [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/epub+zip',
      'text/plain',
      'text/markdown',
    ],
    maxSizeMB: 50,
  };
}

/**
 * Estimate extraction time based on file size
 *
 * @param fileSizeBytes - File size in bytes
 * @param mimeType - MIME type of file
 * @returns Estimated extraction time in milliseconds
 */
export function estimateExtractionTime(
  fileSizeBytes: number,
  mimeType: string
): number {
  const fileSizeMB = fileSizeBytes / (1024 * 1024);

  // Rough estimates based on file type
  if (mimeType.includes('pdf')) {
    return fileSizeMB * 2000; // ~2 seconds per MB for PDF
  }

  if (mimeType.includes('docx') || mimeType.includes('word')) {
    return fileSizeMB * 1000; // ~1 second per MB for DOCX
  }

  if (mimeType.includes('epub')) {
    return fileSizeMB * 1500; // ~1.5 seconds per MB for EPUB
  }

  return fileSizeMB * 100; // ~0.1 seconds per MB for text files
}

/**
 * Clean extracted text for better processing
 *
 * Removes common artifacts from text extraction.
 *
 * @param text - Raw extracted text
 * @returns Cleaned text
 */
export function cleanExtractedText(text: string): string {
  return text
    // Remove page numbers (common in PDFs)
    .replace(/^\s*\d+\s*$/gm, '')
    // Remove header/footer patterns (Page X of Y)
    .replace(/Page \d+ of \d+/gi, '')
    // Remove excessive blank lines
    .replace(/\n{4,}/g, '\n\n\n')
    // Remove common PDF artifacts
    .replace(/[^\x20-\x7E\n\t]/g, '')
    // Trim lines
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    .trim();
}
