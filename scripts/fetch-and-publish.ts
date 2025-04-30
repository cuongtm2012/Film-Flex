#!/usr/bin/env tsx

/**
 * Fetch and Publish Script
 * 
 * This script fetches a specified number of movie pages and then 
 * immediately publishes them to make them visible on the website.
 * 
 * Usage:
 *   tsx scripts/fetch-and-publish.ts [start] [end] [publish_count]
 */

import { db } from '../server/db';
import { log } from '../server/vite';
import { storage } from '../server/storage';
import { syncMovies } from '../server/services/phimapi/service';

async function publishMovies(count: number) {
  try {
    // Get draft and pending review movies
    const draftMovies = await storage.getApiMovies(count, 0, 'draft');
    const pendingMovies = await storage.getApiMovies(count, 0, 'pending_review');
    
    console.log(`Found ${draftMovies.length} draft movies and ${pendingMovies.length} pending movies`);
    
    // Publish draft movies
    let publishedCount = 0;
    for (const movie of draftMovies) {
      try {
        await storage.updateApiMovie(movie.id, { 
          status: 'published',
          updatedAt: new Date() 
        });
        publishedCount++;
        
        if (publishedCount % 10 === 0) {
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
        
        if (publishedCount % 10 === 0) {
          console.log(`Published ${publishedCount} movies so far...`);
        }
      } catch (error) {
        console.error(`Error publishing movie ${movie.id}:`, error);
      }
    }
    
    console.log(`Successfully published ${publishedCount} movies`);
    return publishedCount;
  } catch (error) {
    console.error('Error publishing movies:', error);
    return 0;
  }
}

async function main() {
  console.log('Movie Fetch and Publish Script');
  console.log('==============================');
  
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const startPage = parseInt(args[0]) || 1;
  const endPage = parseInt(args[1]) || 30;
  const publishCount = parseInt(args[2]) || 100;
  
  console.log(`Fetching pages ${startPage} to ${endPage} and publishing up to ${publishCount} movies`);
  
  try {
    // First fetch movies
    console.log('Step 1: Fetching movies...');
    const newMovies = await syncMovies(startPage, endPage, 5);
    console.log(`Fetched ${newMovies} new movies`);
    
    // Then publish them
    console.log('Step 2: Publishing movies...');
    const publishedCount = await publishMovies(publishCount);
    console.log(`Published ${publishedCount} movies`);
    
    // Print summary
    console.log('\nOperation completed successfully');
    console.log(`- Pages processed: ${endPage - startPage + 1}`);
    console.log(`- New movies added: ${newMovies}`);
    console.log(`- Movies published: ${publishedCount}`);
    
    // Check movie counts
    const draftCount = await storage.countApiMovies('draft');
    const pendingCount = await storage.countApiMovies('pending_review');
    const publishedCount2 = await storage.countApiMovies('published');
    const totalCount = await storage.countApiMovies();
    
    console.log('\nCurrent movie counts:');
    console.log(`- Total: ${totalCount}`);
    console.log(`- Published: ${publishedCount2}`);
    console.log(`- Pending review: ${pendingCount}`);
    console.log(`- Draft: ${draftCount}`);
    
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