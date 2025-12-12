/**
 * Mother's Almanac Wiki System
 *
 * A comprehensive wiki system with smart entity extraction and linking.
 *
 * @module lib/wiki
 */

// Core types
export type {
  Entity,
  EntityType,
  EntityConfidence,
  LinkCandidate,
  LinkConfidence,
  PageConnection,
  RelatedPage,
  WikiPageMetadata,
  WikiPageGeneration,
  SourceReference,
  ConfidenceFactors,
  ConfidenceBadge,
  GenerationOptions
} from './types'

export { queryToSlug, slugToTitle } from './types'

// Entity extraction
export {
  extractEntities,
  validateEntity
} from './entities'

// Link candidates
export {
  upsertLinkCandidate,
  checkPageExists,
  markPageAsExisting,
  getSuggestedPages,
  getAllLinkCandidates,
  getLinkCandidateStats,
  batchUpsertLinkCandidates,
  deleteLinkCandidate
} from './link-candidates'

// Link injection
export {
  injectLinks,
  stripWikiLinks,
  extractLinks,
  updateLinkClasses,
  batchUpdateLinksForNewPage,
  previewLinks
} from './link-injection'

// Page graph
export {
  recordPageConnections,
  getRelatedPages,
  getBacklinks,
  getOutgoingLinks,
  getGraphStats,
  findOrphanedPages,
  deletePageConnections
} from './graph'

// Complete generation pipeline
export type { WikiPageWithLinks } from './generation-with-links'

export {
  generatePageWithLinks,
  regenerateLinks,
  batchGenerateWithLinks,
  updateExistingPagesForNewPage,
  getLinkStats,
  validatePageLinks
} from './generation-with-links'

// RAG-based generation
export {
  generateWikiPage,
  generateWikiPages,
  previewWikiPage,
  forceRegenerateWikiPage,
  canGenerateWikiPage,
  canGenerateWikiPages
} from './generation'

// Confidence scoring
export {
  getConfidenceBadge,
  calculateConfidence,
  calculateTopicCoverage,
  analyzeConfidenceBreakdown,
  getQualityTier,
  isPublishable,
  getImprovementRecommendations
} from './confidence'

// Source attribution
export {
  createSourceMetadata,
  formatSourceReferences,
  deduplicateSources,
  groupSourcesByType,
  formatSourcesByType,
  extractUsedCitations,
  filterToCitedSources,
  validateCitations,
  renumberCitations,
  calculateSourceDiversity,
  generateAttributionContext
} from './sources'

// Post-processing
export {
  postProcessMarkdown,
  normalizeHeadings,
  enhanceLists,
  wrapCallouts,
  extractSections,
  generateTableOfContents,
  estimateReadingTime,
  addHeadingIds,
  validateMarkdown,
  sanitizeMarkdown,
  extractFrontmatter
} from './postprocess'

// Prompt engineering
export {
  buildWikiPrompt,
  buildChatPrompt,
  buildEntityExtractionPrompt,
  buildQualityAssessmentPrompt,
  buildSummarizationPrompt,
  buildTitleImprovementPrompt
} from './prompts'

// Testing utilities
export {
  testSingleGeneration,
  testMultipleGenerations,
  testPreviews,
  exportTestResult,
  quickTest,
  TEST_TOPICS
} from './test-generation'
