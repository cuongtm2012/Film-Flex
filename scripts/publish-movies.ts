#!/usr/bin/env tsx

/**
 * Publish Movies Script
 * 
 * This script publishes all or a specified number of movies that are already in 
 * the database but haven't been published yet (draft or pending_review).
 * 
 * Usage:
 *   tsx scripts/publish-movies.ts [count]
 */

import { db } from '../server/db';
import { storage } from '../server/storage';

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
  console.log('Movie Publisher Script');
  console.log('=====================');
  
  // Parse command-line arguments
  const args = process.argv.slice(2);
  const count = parseInt(args[0]) || 1000;
  
  console.log(`Publishing up to ${count} movies`);
  
  try {
    // Publish the movies
    const publishedCount = await publishMovies(count);
    
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