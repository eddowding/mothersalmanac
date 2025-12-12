/**
 * Document Chunking Library
 *
 * Implements semantic chunking strategies for RAG pipelines.
 * Uses recursive character splitting with overlap to maintain context.
 */

export interface ChunkMetadata {
  section_title?: string;
  page_number?: number;
  chunk_index: number;
  char_count: number;
}

export interface Chunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkingOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  preserveSections?: boolean;
}

export interface Section {
  title: string;
  content: string;
  startIndex: number;
}

/**
 * Main chunking function that processes a document into semantic chunks
 *
 * @param documentId - The ID of the document being chunked
 * @param fileContent - The full text content of the document
 * @param options - Chunking configuration options
 * @returns Array of chunks with metadata
 */
export async function chunkDocument(
  documentId: string,
  fileContent: string,
  options?: ChunkingOptions
): Promise<Chunk[]> {
  const {
    chunkSize = 1500,
    chunkOverlap = 200,
    preserveSections = true,
  } = options || {};

  // Normalize the text first
  const normalizedText = normalizeText(fileContent);

  // Extract sections if requested
  const sections = preserveSections ? extractSections(normalizedText) : [];

  const chunks: Chunk[] = [];
  let globalChunkIndex = 0;

  if (sections.length > 0 && preserveSections) {
    // Process each section separately to maintain context
    for (const section of sections) {
      const sectionChunks = recursiveCharacterSplit(
        section.content,
        chunkSize,
        chunkOverlap
      );

      for (const chunkContent of sectionChunks) {
        chunks.push({
          content: chunkContent,
          metadata: {
            section_title: section.title,
            chunk_index: globalChunkIndex++,
            char_count: chunkContent.length,
          },
        });
      }
    }
  } else {
    // Process entire document without section awareness
    const textChunks = recursiveCharacterSplit(
      normalizedText,
      chunkSize,
      chunkOverlap
    );

    for (const chunkContent of textChunks) {
      chunks.push({
        content: chunkContent,
        metadata: {
          chunk_index: globalChunkIndex++,
          char_count: chunkContent.length,
        },
      });
    }
  }

  return chunks;
}

/**
 * Recursive character text splitting with semantic awareness
 *
 * Splits text on paragraph boundaries first, then sentences, then characters.
 * Maintains overlap between chunks to preserve context.
 *
 * @param text - Text to split
 * @param chunkSize - Target size of each chunk in characters
 * @param chunkOverlap - Number of characters to overlap between chunks
 * @returns Array of text chunks
 */
export function recursiveCharacterSplit(
  text: string,
  chunkSize: number = 1500,
  chunkOverlap: number = 200
): string[] {
  if (text.length <= chunkSize) {
    return [text];
  }

  // Define separators in order of preference (semantic boundaries)
  const separators = [
    '\n\n', // Paragraph breaks (highest priority)
    '\n',   // Line breaks
    '. ',   // Sentence endings
    '! ',   // Exclamations
    '? ',   // Questions
    '; ',   // Semicolons
    ', ',   // Commas (lower priority)
    ' ',    // Words
    '',     // Characters (fallback)
  ];

  return splitTextRecursively(text, separators, chunkSize, chunkOverlap);
}

/**
 * Internal recursive splitting implementation
 */
function splitTextRecursively(
  text: string,
  separators: string[],
  chunkSize: number,
  chunkOverlap: number
): string[] {
  const chunks: string[] = [];

  if (text.length <= chunkSize) {
    return [text];
  }

  // Try each separator in order
  const separator = separators[0];
  const parts = separator ? text.split(separator) : [text];

  let currentChunk = '';
  const processedChunks: string[] = [];

  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    const partWithSep = i < parts.length - 1 ? part + separator : part;

    if ((currentChunk + partWithSep).length <= chunkSize) {
      currentChunk += partWithSep;
    } else {
      if (currentChunk) {
        processedChunks.push(currentChunk.trim());
      }

      // If single part is too large, try next separator
      if (partWithSep.length > chunkSize && separators.length > 1) {
        const subChunks = splitTextRecursively(
          partWithSep,
          separators.slice(1),
          chunkSize,
          chunkOverlap
        );
        processedChunks.push(...subChunks);
        currentChunk = '';
      } else {
        currentChunk = partWithSep;
      }
    }
  }

  if (currentChunk) {
    processedChunks.push(currentChunk.trim());
  }

  // Add overlap between chunks for context continuity
  if (chunkOverlap > 0 && processedChunks.length > 1) {
    return addOverlap(processedChunks, chunkOverlap);
  }

  return processedChunks.filter(chunk => chunk.length > 0);
}

/**
 * Add overlap between consecutive chunks for context continuity
 */
function addOverlap(chunks: string[], overlapSize: number): string[] {
  const overlappedChunks: string[] = [];

  for (let i = 0; i < chunks.length; i++) {
    const currentChunk = chunks[i];

    if (i === 0) {
      overlappedChunks.push(currentChunk);
    } else {
      const previousChunk = chunks[i - 1];
      const overlapText = previousChunk.slice(-overlapSize);
      overlappedChunks.push(overlapText + currentChunk);
    }
  }

  return overlappedChunks;
}

/**
 * Extract section titles and content from text
 *
 * Detects markdown-style headings and structured sections.
 *
 * @param text - Text to extract sections from
 * @returns Array of sections with title, content, and position
 */
export function extractSections(text: string): Section[] {
  const sections: Section[] = [];

  // Match markdown headings (# Header, ## Header, etc.)
  const headingRegex = /^(#{1,6})\s+(.+)$/gm;
  const matches = Array.from(text.matchAll(headingRegex));

  if (matches.length === 0) {
    // No structured sections found, return entire text as one section
    return [{
      title: 'Document',
      content: text,
      startIndex: 0,
    }];
  }

  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const title = match[2].trim();
    const startIndex = match.index || 0;

    // Get content until next heading
    const endIndex = i < matches.length - 1
      ? (matches[i + 1].index || text.length)
      : text.length;

    const content = text.slice(startIndex, endIndex).trim();

    sections.push({
      title,
      content,
      startIndex,
    });
  }

  return sections;
}

/**
 * Clean and normalize text for consistent processing
 *
 * - Removes excessive whitespace
 * - Normalizes line endings
 * - Removes non-printable characters
 * - Preserves paragraph structure
 *
 * @param text - Text to normalize
 * @returns Normalized text
 */
export function normalizeText(text: string): string {
  return text
    // Normalize line endings to \n
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // Remove non-printable characters except newlines and tabs
    .replace(/[^\x20-\x7E\n\t]/g, '')
    // Replace multiple spaces with single space
    .replace(/ +/g, ' ')
    // Replace multiple newlines with maximum of 2 (preserve paragraphs)
    .replace(/\n{3,}/g, '\n\n')
    // Remove leading/trailing whitespace from each line
    .split('\n')
    .map(line => line.trim())
    .join('\n')
    // Remove leading/trailing whitespace from entire text
    .trim();
}

/**
 * Estimate the number of chunks for a given text
 *
 * @param textLength - Length of text in characters
 * @param chunkSize - Target chunk size
 * @returns Estimated number of chunks
 */
export function estimateChunkCount(
  textLength: number,
  chunkSize: number = 1500
): number {
  return Math.ceil(textLength / chunkSize);
}

/**
 * Validate chunk size and overlap parameters
 */
export function validateChunkingOptions(options: ChunkingOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const { chunkSize = 1500, chunkOverlap = 200 } = options;

  if (chunkSize < 100) {
    errors.push('Chunk size must be at least 100 characters');
  }

  if (chunkSize > 8000) {
    errors.push('Chunk size should not exceed 8000 characters');
  }

  if (chunkOverlap < 0) {
    errors.push('Chunk overlap cannot be negative');
  }

  if (chunkOverlap >= chunkSize) {
    errors.push('Chunk overlap must be less than chunk size');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
