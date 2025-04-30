#!/usr/bin/env tsx
/**
 * Cron Job for Movie Data Synchronization
 * 
 * This script is designed to be run as a cron job to keep the movie database
 * up to date with new content from the phimapi.com API. It will sync a configurable
 * number of pages and automatically publish movies to make them immediately available.
 * 
 * Usage (as cron job): 
 *   # Run every 5 minutes
 *   # */5 * * * * cd /path/to/project && tsx scripts/cron-movie-sync.ts >> /var/log/movie-sync.log 2>&1
 * 
 * Options can be configured in the CONFIG object below.
 */

import { syncMovies, processPendingDetailFetches } from '../server/services/phimapi/service';
import { publishMovies, updateMovieStatuses } from '../server/services/phimapi/admin';
import { pool } from '../server/db';

// Configuration for the cron job
const CONFIG = {
  // Number of pages to sync in each cron run (adjust based on frequency)
  pagesToSync: 5,
  
  // Starting page (usually 1 to get newest content)
  startPage: 1,
  
  // Concurrency settings
  concurrency: 1,     // Number of pages to process in parallel
  detailBatchSize: 5, // Number of movie details to process in a batch
  
  // Number of movies to publish in each run
  moviesToPublish: 10,
  
  // Milliseconds to wait between page requests to avoid rate limiting
  waitBetweenRequests: 2000,
  
  // Log level (1=errors only, 2=basic info, 3=detailed)
  logLevel: 2
};

/**
 * Simple logging with timestamps and log levels
 */
function log(message: string, level: number = 2) {
  if (level <= CONFIG.logLevel) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [CRON] ${message}`);
  }
}

/**
 * Main function to run the cron job
 */
async function runCronJob() {
  const startTime = new Date();
  log(`Starting movie sync cron job`, 2);
  
  try {
    // 1. Sync new movies from API
    log(`Syncing pages ${CONFIG.startPage} to ${CONFIG.startPage + CONFIG.pagesToSync - 1}`, 2);
    const newMoviesCount = await syncMovies(
      CONFIG.startPage, 
      CONFIG.startPage + CONFIG.pagesToSync - 1,
      CONFIG.detailBatchSize
    );
    
    // 2. Process any pending movie details that need enrichment
    log(`Processing pending movie details`, 2);
    const processedDetails = await processPendingDetailFetches(CONFIG.detailBatchSize);
    
    // 3. Publish movies to make them available on the site
    log(`Publishing movies`, 2);
    const publishedCount = await publishMovies(CONFIG.moviesToPublish);
    
    // Calculate runtime
    const endTime = new Date();
    const runtimeSeconds = (endTime.getTime() - startTime.getTime()) / 1000;
    
    // Log summary
    log(`Cron job completed in ${runtimeSeconds.toFixed(2)} seconds`, 1);
    log(`Results: ${newMoviesCount} new movies, ${processedDetails} details processed, ${publishedCount} movies published`, 1);
    
  } catch (error) {
    log(`Error running cron job: ${error}`, 1);
  } finally {
    // Always close the database pool when done
    try {
      await pool.end();
      log(`Database connection closed`, 3);
    } catch (err) {
      log(`Error closing database connection: ${err}`, 1);
    }
    
    // Exit explicitly to ensure the process terminates
    process.exit(0);
  }
}

// Run the job
runCronJob();