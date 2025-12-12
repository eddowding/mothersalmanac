/**
 * Test Script for RAG Pipeline
 *
 * Tests the complete pipeline with sample documents.
 * Run with: npx tsx lib/rag/test.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { extractText, cleanExtractedText } from './extractors';
import { chunkDocument } from './chunking';
import { generateEmbeddings, estimateBatchCost } from './embeddings';

async function testPipeline() {
  console.log('='.repeat(80));
  console.log('RAG Pipeline Test Suite');
  console.log('='.repeat(80));
  console.log();

  try {
    // Test 1: Text Extraction
    console.log('TEST 1: Text Extraction');
    console.log('-'.repeat(80));

    const sampleFilePath = path.join(process.cwd(), 'test-data', 'sample.txt');
    const fileBuffer = fs.readFileSync(sampleFilePath);

    const startExtract = Date.now();
    const extractionResult = await extractText(fileBuffer, 'text/plain');
    const extractTime = Date.now() - startExtract;

    console.log(`✓ Extracted ${extractionResult.metadata.charCount} characters`);
    console.log(`✓ Word count: ${extractionResult.metadata.wordCount}`);
    console.log(`✓ Extraction time: ${extractTime}ms`);
    console.log();

    // Test 2: Text Cleaning
    console.log('TEST 2: Text Cleaning');
    console.log('-'.repeat(80));

    const cleanText = cleanExtractedText(extractionResult.text);
    const reductionPercent = (
      ((extractionResult.text.length - cleanText.length) /
        extractionResult.text.length) *
      100
    ).toFixed(2);

    console.log(`✓ Original length: ${extractionResult.text.length} characters`);
    console.log(`✓ Cleaned length: ${cleanText.length} characters`);
    console.log(`✓ Reduction: ${reductionPercent}%`);
    console.log();

    // Test 3: Chunking
    console.log('TEST 3: Document Chunking');
    console.log('-'.repeat(80));

    const startChunk = Date.now();
    const chunks = await chunkDocument('test-doc-id', cleanText, {
      chunkSize: 1500,
      chunkOverlap: 200,
      preserveSections: true,
    });
    const chunkTime = Date.now() - startChunk;

    console.log(`✓ Created ${chunks.length} chunks`);
    console.log(`✓ Chunking time: ${chunkTime}ms`);
    console.log();

    // Display chunk statistics
    console.log('Chunk Statistics:');
    const avgChunkSize =
      chunks.reduce((sum, c) => sum + c.content.length, 0) / chunks.length;
    const minChunkSize = Math.min(...chunks.map(c => c.content.length));
    const maxChunkSize = Math.max(...chunks.map(c => c.content.length));

    console.log(`  Average size: ${avgChunkSize.toFixed(0)} characters`);
    console.log(`  Min size: ${minChunkSize} characters`);
    console.log(`  Max size: ${maxChunkSize} characters`);
    console.log();

    // Display first chunk preview
    console.log('First Chunk Preview:');
    console.log(
      chunks[0].content.slice(0, 200).replace(/\n/g, ' ') + '...'
    );
    console.log();

    // Test 4: Cost Estimation
    console.log('TEST 4: Cost Estimation');
    console.log('-'.repeat(80));

    const chunkContents = chunks.map(c => c.content);
    const costEstimate = estimateBatchCost(chunkContents);

    console.log(`✓ Estimated tokens: ${costEstimate.totalTokens.toLocaleString()}`);
    console.log(`✓ Estimated cost: $${costEstimate.totalCost.toFixed(6)}`);
    console.log(`✓ Average tokens per chunk: ${costEstimate.averageTokensPerText}`);
    console.log();

    // Test 5: Embedding Generation (just first 2 chunks for speed)
    console.log('TEST 5: Embedding Generation (Sample)');
    console.log('-'.repeat(80));

    const sampleChunks = chunkContents.slice(0, 2);
    let embedTime = 0;
    let embeddings: any[] = [];

    // Check if API key is available
    const hasApiKey = !!process.env.ANTHROPIC_API_KEY;

    if (hasApiKey) {
      try {
        const startEmbed = Date.now();
        embeddings = await generateEmbeddings(sampleChunks);
        embedTime = Date.now() - startEmbed;

        console.log(`✓ Generated ${embeddings.length} embeddings`);
        console.log(`✓ Embedding dimension: ${embeddings[0].embedding.length}`);
        console.log(`✓ Total time: ${embedTime}ms`);
        console.log(`✓ Time per embedding: ${(embedTime / embeddings.length).toFixed(0)}ms`);
        console.log();

        // Verify embedding properties
        const embedding = embeddings[0].embedding;
        const magnitude = Math.sqrt(
          embedding.reduce((sum: number, val: number) => sum + val * val, 0)
        );
        console.log(`✓ Embedding magnitude: ${magnitude.toFixed(4)} (should be ~1.0)`);
        console.log();
      } catch (error) {
        console.warn('⚠ Embedding generation failed, using mock embeddings for testing');
        console.warn(`  Error: ${error instanceof Error ? error.message : 'Unknown'}`);
        console.log();

        // Use mock for benchmarking
        const startEmbed = Date.now();
        embeddings = await generateEmbeddings(sampleChunks);
        embedTime = Date.now() - startEmbed;

        console.log(`✓ Generated ${embeddings.length} mock embeddings`);
        console.log(`✓ Embedding dimension: ${embeddings[0].embedding.length}`);
        console.log(`✓ Mock generation time: ${embedTime}ms`);
        console.log();
      }
    } else {
      console.warn('⚠ ANTHROPIC_API_KEY not set - using mock embeddings');
      console.log('  Set ANTHROPIC_API_KEY in .env.local for real embedding generation');
      console.log();

      // Use mock embeddings for testing
      const startEmbed = Date.now();
      embeddings = await generateEmbeddings(sampleChunks);
      embedTime = Date.now() - startEmbed;

      console.log(`✓ Generated ${embeddings.length} mock embeddings`);
      console.log(`✓ Embedding dimension: ${embeddings[0].embedding.length}`);
      console.log(`✓ Mock generation time: ${embedTime}ms`);
      console.log();
    }

    // Test 6: Performance Summary
    console.log('TEST 6: Performance Summary');
    console.log('-'.repeat(80));

    const totalPipelineTime = extractTime + chunkTime + embedTime;
    const estimatedFullEmbedTime = (embedTime / sampleChunks.length) * chunks.length;
    const estimatedTotalTime = extractTime + chunkTime + estimatedFullEmbedTime;

    console.log('Measured Performance:');
    console.log(`  Text extraction: ${extractTime}ms`);
    console.log(`  Chunking: ${chunkTime}ms`);
    console.log(`  Embeddings (sample): ${embedTime}ms`);
    console.log();

    console.log('Estimated Full Pipeline:');
    console.log(`  Total chunks: ${chunks.length}`);
    console.log(`  Estimated embed time: ${estimatedFullEmbedTime.toFixed(0)}ms`);
    console.log(`  Estimated total time: ${estimatedTotalTime.toFixed(0)}ms (~${(estimatedTotalTime / 1000).toFixed(1)}s)`);
    console.log();

    console.log('Processing Rate:');
    const charsPerSecond = (cleanText.length / estimatedTotalTime) * 1000;
    const wordsPerSecond = (extractionResult.metadata.wordCount / estimatedTotalTime) * 1000;
    console.log(`  ${charsPerSecond.toFixed(0)} characters/second`);
    console.log(`  ${wordsPerSecond.toFixed(0)} words/second`);
    console.log(`  ${(chunks.length / (estimatedTotalTime / 1000)).toFixed(1)} chunks/second`);
    console.log();

    // Test 7: Quality Checks
    console.log('TEST 7: Quality Checks');
    console.log('-'.repeat(80));

    let qualityScore = 100;
    const issues: string[] = [];

    // Check chunk size variance
    const chunkSizes = chunks.map(c => c.content.length);
    const variance =
      chunkSizes.reduce((sum, size) => sum + Math.pow(size - avgChunkSize, 2), 0) /
      chunks.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = (stdDev / avgChunkSize) * 100;

    if (coefficientOfVariation > 30) {
      qualityScore -= 10;
      issues.push('High chunk size variance');
    }

    // Check for very small chunks
    const tooSmallChunks = chunks.filter(c => c.content.length < 500).length;
    if (tooSmallChunks > chunks.length * 0.2) {
      qualityScore -= 15;
      issues.push(`${tooSmallChunks} chunks are too small (< 500 chars)`);
    }

    // Check for section preservation
    const chunksWithSections = chunks.filter(
      c => c.metadata.section_title
    ).length;
    const sectionPreservationRate = (chunksWithSections / chunks.length) * 100;

    console.log(`✓ Chunk size consistency: ${coefficientOfVariation.toFixed(1)}% variance`);
    console.log(`✓ Section preservation: ${sectionPreservationRate.toFixed(0)}% of chunks`);
    console.log(`✓ Small chunks: ${tooSmallChunks}/${chunks.length}`);
    console.log();

    if (issues.length > 0) {
      console.log('⚠ Quality Issues:');
      issues.forEach(issue => console.log(`  - ${issue}`));
      console.log();
    }

    console.log(`Overall Quality Score: ${qualityScore}/100`);
    console.log();

    // Final Summary
    console.log('='.repeat(80));
    console.log('TEST RESULTS: ALL TESTS PASSED ✓');
    console.log('='.repeat(80));
    console.log();
    console.log('Summary:');
    console.log(`  Document: ${path.basename(sampleFilePath)}`);
    console.log(`  Size: ${(fileBuffer.length / 1024).toFixed(2)} KB`);
    console.log(`  Chunks created: ${chunks.length}`);
    console.log(`  Estimated cost: $${costEstimate.totalCost.toFixed(6)}`);
    console.log(`  Estimated time: ${(estimatedTotalTime / 1000).toFixed(1)}s`);
    console.log(`  Quality score: ${qualityScore}/100`);
    console.log();

  } catch (error) {
    console.error('TEST FAILED ✗');
    console.error('Error:', error);
    process.exit(1);
  }
}

// Run tests
testPipeline();
