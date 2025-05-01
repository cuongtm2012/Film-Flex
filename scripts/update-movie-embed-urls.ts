#!/usr/bin/env tsx

/**
 * Update Movie Embed URLs Script
 * 
 * This script specifically targets movies with null embedUrl values
 * and updates them by fetching their details from the API.
 * 
 * Usage:
 *   tsx scripts/update-movie-embed-urls.ts [count]
 */

import { db } from '../server/db';
import { apiMovies } from '../shared/schema';
import { eq, isNull } from 'drizzle-orm';
import { fetchMovieDetail } from '../server/services/phimapi/client';
import { processMovieDetail } from '../server/services/phimapi/processor';
import { ApiMovieDetailResponse } from '../server/services/phimapi/types';
import { storage } from '../server/storage';
import { log } from '../server/vite';

async function updateEmbedUrls(count: number = 50, concurrency: number = 5) {
  console.log(`Finding up to ${count} movies with null embedUrl...`);
  
  // Get movies with null embedUrl
  const moviesWithoutEmbed = await db
    .select()
    .from(apiMovies)
    .where(isNull(apiMovies.embedUrl))
    .limit(count);
  
  console.log(`Found ${moviesWithoutEmbed.length} movies with null embedUrl`);
  
  if (moviesWithoutEmbed.length === 0) {
    console.log('No movies need updating. All movies have embedUrl values.');
    return;
  }
  
  let updatedCount = 0;
  let failedCount = 0;
  
  // Process movies in batches for better performance
  const processBatch = async (batch: typeof moviesWithoutEmbed) => {
    const results = await Promise.all(
      batch.map(async (movie) => {
        try {
          console.log(`Processing movie: ${movie.title} (ID: ${movie.id}, Slug: ${movie.slug})`);
          
          // Fetch detailed movie information
          const movieDetailResponse = await fetchMovieDetail(movie.slug);
          
          if (!movieDetailResponse || !movieDetailResponse.movie) {
            console.log(`No details found for movie: ${movie.title}`);
            return { success: false, movie };
          }
          
          // Process movie detail
          const processedMovie = processMovieDetail(
            movieDetailResponse.movie, 
            // Check if episodes exist in the response
            'episodes' in movieDetailResponse ? movieDetailResponse.episodes : undefined
          );
          
          // Check if we found an embedUrl
          if (!processedMovie.embedUrl) {
            console.log(`No embedUrl found for movie: ${movie.title}`);
            return { success: false, movie };
          }
          
          // Update the movie with the new embedUrl
          await storage.updateApiMovie(movie.id, {
            embedUrl: processedMovie.embedUrl,
            updatedAt: new Date(),
            lastCheckedAt: new Date()
          });
          
          console.log(`Updated embedUrl for movie: ${movie.title}`);
          console.log(`New embedUrl: ${processedMovie.embedUrl}`);
          
          return { success: true, movie, embedUrl: processedMovie.embedUrl };
        } catch (error: any) {
          console.error(`Error updating movie ${movie.title}: ${error.message}`);
          return { success: false, movie, error: error.message };
        }
      })
    );
    
    return results;
  };
  
  // Split the movies into batches based on concurrency
  const batches = [];
  for (let i = 0; i < moviesWithoutEmbed.length; i += concurrency) {
    batches.push(moviesWithoutEmbed.slice(i, i + concurrency));
  }
  
  console.log(`Processing ${batches.length} batches with concurrency of ${concurrency}...`);
  
  // Process each batch sequentially
  for (const [index, batch] of batches.entries()) {
    console.log(`Processing batch ${index + 1}/${batches.length} with ${batch.length} movies...`);
    
    const results = await processBatch(batch);
    
    // Count successes and failures
    const batchSuccesses = results.filter(r => r.success).length;
    const batchFailures = results.filter(r => !r.success).length;
    
    updatedCount += batchSuccesses;
    failedCount += batchFailures;
    
    console.log(`Batch ${index + 1} complete: ${batchSuccesses} successes, ${batchFailures} failures`);
    
    // Short delay between batches to avoid overloading the API
    if (index < batches.length - 1) {
      console.log(`Waiting 5 seconds before next batch...`);
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
  }
  
  console.log(`\nSummary:`);
  console.log(`${updatedCount} movies updated successfully`);
  console.log(`${failedCount} movies failed to update`);
}

async function main() {
  const count = process.argv[2] ? parseInt(process.argv[2]) : 50;
  
  try {
    console.log('Starting embedUrl update process...');
    await updateEmbedUrls(count);
    console.log('Process completed.');
  } catch (error: any) {
    console.error(`Error in main process: ${error.message}`);
  } finally {
    console.log('Exiting...');
    process.exit(0);
  }
}

main();