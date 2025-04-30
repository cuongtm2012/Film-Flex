#!/usr/bin/env tsx

/**
 * Chunk-based Movie Import Script
 * 
 * This script divides the large import task into manageable chunks
 * that can be run separately, allowing you to import all 2251 pages
 * in multiple runs without overwhelming the system.
 * 
 * Usage:
 *   tsx scripts/chunk-import.ts [chunk] [total_chunks]
 * 
 * Example:
 *   tsx scripts/chunk-import.ts 1 10  # Run the first chunk of 10 total chunks
 *   tsx scripts/chunk-import.ts 2 10  # Run the second chunk of 10 total chunks
 *   ...
 *   tsx scripts/chunk-import.ts 10 10 # Run the tenth chunk of 10 total chunks
 */

import { db } from '../server/db';
import { log } from '../server/vite';
import { storage } from '../server/storage';
import { executeBulkImport } from '../server/services/phimapi/bulkImporter';

// The total number of pages in the API
const TOTAL_PAGES = 2251;

async function main() {
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const chunkNumber = parseInt(args[0]) || 1;
  const totalChunks = parseInt(args[1]) || 10;
  
  // Calculate the page range for this chunk
  const pagesPerChunk = Math.ceil(TOTAL_PAGES / totalChunks);
  const startPage = ((chunkNumber - 1) * pagesPerChunk) + 1;
  const endPage = Math.min(chunkNumber * pagesPerChunk, TOTAL_PAGES);
  
  console.log(`Chunk Import Script - Chunk ${chunkNumber}/${totalChunks}`);
  console.log(`==================================================`);
  console.log(`Processing pages ${startPage} to ${endPage} (${endPage - startPage + 1} pages)`);
  
  try {
    // Run the bulk import for this chunk
    const result = await executeBulkImport({
      startPage,
      endPage,
      concurrency: 1,
      detailConcurrency: 3,
      processDetails: false, // Skip details for faster import
      useCache: true
    });
    
    console.log(`\nImport Summary for Chunk ${chunkNumber}:`);
    console.log(`- Pages processed: ${result.pagesProcessed}/${result.totalPages}`);
    console.log(`- Total movies found: ${result.totalMoviesFound}`);
    console.log(`- New movies added: ${result.newMoviesAdded}`);
    
    // Publish all movies from this chunk
    console.log(`\nPublishing movies from this chunk...`);
    
    // Get the count before
    const beforeCount = await storage.countApiMovies('published');
    
    // Publish draft and pending movies
    const draftMovies = await storage.getApiMovies(1000, 0, 'draft');
    const pendingMovies = await storage.getApiMovies(1000, 0, 'pending_review');
    
    let publishedCount = 0;
    
    // Publish draft movies
    for (const movie of draftMovies) {
      try {
        await storage.updateApiMovie(movie.id, { 
          status: 'published',
          updatedAt: new Date() 
        });
        publishedCount++;
        
        if (publishedCount % 50 === 0) {
          console.log(`Published ${publishedCount} movies so far...`);
        }
      } catch (error) {
        console.error(`Error publishing movie ${movie.id}:`, error);
      }
    }
    
    // Publish pending movies
    for (const movie of pendingMovies) {
      try {
        await storage.updateApiMovie(movie.id, { 
          status: 'published',
          updatedAt: new Date() 
        });
        publishedCount++;
        
        if (publishedCount % 50 === 0) {
          console.log(`Published ${publishedCount} movies so far...`);
        }
      } catch (error) {
        console.error(`Error publishing movie ${movie.id}:`, error);
      }
    }
    
    // Get the count after
    const afterCount = await storage.countApiMovies('published');
    const newlyPublished = afterCount - beforeCount;
    
    console.log(`\nPublished ${newlyPublished} new movies from this chunk`);
    
    // Print database statistics
    const draftCount = await storage.countApiMovies('draft');
    const pendingCount = await storage.countApiMovies('pending_review');
    const publishedCount2 = await storage.countApiMovies('published');
    const totalCount = await storage.countApiMovies();
    
    console.log(`\nCurrent movie database status:`);
    console.log(`- Total: ${totalCount} movies`);
    console.log(`- Published: ${publishedCount2} movies`);
    console.log(`- Pending review: ${pendingCount} movies`);
    console.log(`- Draft: ${draftCount} movies`);
    
    // Calculate progress
    const percentComplete = (chunkNumber / totalChunks * 100).toFixed(2);
    console.log(`\nOverall progress: ${percentComplete}% (${chunkNumber} of ${totalChunks} chunks processed)`);
    
    if (chunkNumber < totalChunks) {
      console.log(`\nTo continue, run: tsx scripts/chunk-import.ts ${chunkNumber + 1} ${totalChunks}`);
    } else {
      console.log(`\nAll chunks completed! You've imported and processed all ${TOTAL_PAGES} pages.`);
    }
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await db.end();
  }
}

// Run the script
main();