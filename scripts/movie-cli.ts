#!/usr/bin/env tsx
/**
 * Movie Database CLI
 * 
 * A command-line interface for managing movie data from the PhimAPI.
 * This tool provides easy access to the various movie synchronization,
 * import, and publishing functions.
 * 
 * Usage:
 *   tsx scripts/movie-cli.ts [command] [options]
 * 
 * Commands:
 *   sync       - Sync movies from API (recent pages only)
 *   deep-sync  - Sync more pages from API (slower but more comprehensive)
 *   import     - Bulk import movies with various options
 *   publish    - Publish pending movies
 *   scheduled  - Start the scheduled sync process (continuous)
 *   stats      - Show database statistics
 *   help       - Show help information
 * 
 * Examples:
 *   tsx scripts/movie-cli.ts sync
 *   tsx scripts/movie-cli.ts import --start=1 --end=10
 *   tsx scripts/movie-cli.ts publish --count=50
 */

import { syncMovies, processPendingDetailFetches } from '../server/services/phimapi/service';
import { publishMovies } from '../server/services/phimapi/admin';
import { storage } from '../server/storage';
import { pool } from '../server/db';

// Parse command-line arguments
const args = process.argv.slice(2);
const command = args[0] || 'help';

// Parse options from arguments (e.g. --key=value)
const options: Record<string, string> = {};
args.slice(1).forEach(arg => {
  if (arg.startsWith('--')) {
    const [key, value] = arg.substring(2).split('=');
    options[key] = value;
  }
});

// Log with timestamps
function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] ${message}`);
}

// Help text
function showHelp() {
  console.log(`
Movie Database CLI

Usage:
  tsx scripts/movie-cli.ts [command] [options]

Commands:
  sync       - Sync movies from API (recent pages only)
  deep-sync  - Sync more pages from API (slower but more comprehensive)
  import     - Bulk import movies with various options
  publish    - Publish pending movies
  scheduled  - Start the scheduled sync process (continuous)
  stats      - Show database statistics
  help       - Show this help information

Options:
  --start=N     - Starting page number for import/sync
  --end=N       - Ending page number for import/sync
  --count=N     - Number of items to process (e.g., for publish)
  --details=N   - Number of movie details to process in parallel
  --wait=N      - Milliseconds to wait between API requests
  
Examples:
  tsx scripts/movie-cli.ts sync
  tsx scripts/movie-cli.ts import --start=1 --end=10
  tsx scripts/movie-cli.ts publish --count=50
  `);
}

// Show stats
async function showStats() {
  try {
    // Get counts
    const draftCount = await storage.countApiMovies('draft');
    const pendingCount = await storage.countApiMovies('pending_review');
    const publishedCount = await storage.countApiMovies('published');
    const totalCount = await storage.countApiMovies();
    
    // Get recent job logs
    const jobLogs = await storage.getApiMovieJobLogs(5);
    
    console.log('\nDatabase Statistics:');
    console.log('--------------------------------------------------');
    console.log(`Total API Movies:    ${totalCount}`);
    console.log(`Draft Movies:        ${draftCount}`);
    console.log(`Pending Review:      ${pendingCount}`);
    console.log(`Published Movies:    ${publishedCount}`);
    console.log('\nRecent Job Logs:');
    console.log('--------------------------------------------------');
    
    if (jobLogs.length === 0) {
      console.log('No recent job logs found.');
    } else {
      jobLogs.forEach(log => {
        const date = new Date(log.startedAt).toLocaleString();
        console.log(`[${date}] ${log.jobType} - ${log.status} - Processed: ${log.moviesProcessed}, Added: ${log.moviesAdded}, Updated: ${log.moviesUpdated}`);
      });
    }
    
    console.log('--------------------------------------------------');
  } catch (error) {
    console.error('Error fetching statistics:', error);
  } finally {
    await pool.end();
  }
}

// Sync recent movies
async function syncRecentMovies() {
  try {
    const startPage = parseInt(options.start || '1');
    const endPage = parseInt(options.end || '5');
    const details = parseInt(options.details || '5');
    
    log(`Syncing movies from page ${startPage} to ${endPage}`);
    const startTime = Date.now();
    
    const newMovies = await syncMovies(startPage, endPage, details);
    
    // Process details
    log('Processing movie details...');
    const detailsProcessed = await processPendingDetailFetches(details);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Sync completed in ${duration}s`);
    log(`Results: ${newMovies} new movies found, ${detailsProcessed} details processed`);
  } catch (error) {
    log(`Error in sync: ${error}`);
  } finally {
    await pool.end();
  }
}

// Deep sync (more pages)
async function deepSyncMovies() {
  try {
    const startPage = parseInt(options.start || '1');
    const endPage = parseInt(options.end || '20');
    const details = parseInt(options.details || '10');
    
    log(`Deep syncing movies from page ${startPage} to ${endPage}`);
    const startTime = Date.now();
    
    const newMovies = await syncMovies(startPage, endPage, details);
    
    // Process details
    log('Processing movie details...');
    const detailsProcessed = await processPendingDetailFetches(details);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Deep sync completed in ${duration}s`);
    log(`Results: ${newMovies} new movies found, ${detailsProcessed} details processed`);
  } catch (error) {
    log(`Error in deep sync: ${error}`);
  } finally {
    await pool.end();
  }
}

// Bulk import movies
async function bulkImportMovies() {
  try {
    const startPage = parseInt(options.start || '1');
    const endPage = parseInt(options.end || '10');
    const details = parseInt(options.details || '5');
    const wait = parseInt(options.wait || '2000');
    
    log(`Bulk importing movies from page ${startPage} to ${endPage}`);
    log(`Using ${details} parallel details, ${wait}ms wait time`);
    const startTime = Date.now();
    
    // Import pages one by one with wait time
    let totalNewMovies = 0;
    for (let page = startPage; page <= endPage; page++) {
      log(`Processing page ${page}...`);
      const newMovies = await syncMovies(page, page, details);
      totalNewMovies += newMovies;
      
      // Wait between pages
      if (page < endPage) {
        log(`Waiting ${wait}ms before next page...`);
        await new Promise(resolve => setTimeout(resolve, wait));
      }
    }
    
    // Process details
    log('Processing movie details...');
    const detailsProcessed = await processPendingDetailFetches(details * 2);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Bulk import completed in ${duration}s`);
    log(`Results: ${totalNewMovies} new movies found, ${detailsProcessed} details processed`);
  } catch (error) {
    log(`Error in bulk import: ${error}`);
  } finally {
    await pool.end();
  }
}

// Publish movies
async function publishPendingMovies() {
  try {
    const count = parseInt(options.count || '50');
    
    log(`Publishing up to ${count} pending movies`);
    const startTime = Date.now();
    
    const published = await publishMovies(count);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Publishing completed in ${duration}s`);
    log(`Results: ${published} movies published`);
  } catch (error) {
    log(`Error publishing movies: ${error}`);
  } finally {
    await pool.end();
  }
}

// Start scheduled sync
async function startScheduledSync() {
  try {
    log('Starting scheduled movie sync process...');
    log('Press Ctrl+C to stop');
    
    // Import modules dynamically to avoid circular dependencies
    const { default: scheduledSync } = await import('./scheduled-sync');
    
    // This will run indefinitely until the process is terminated
  } catch (error) {
    log(`Error starting scheduled sync: ${error}`);
    await pool.end();
  }
}

// Execute the requested command
async function run() {
  try {
    switch (command) {
      case 'sync':
        await syncRecentMovies();
        break;
      case 'deep-sync':
        await deepSyncMovies();
        break;
      case 'import':
        await bulkImportMovies();
        break;
      case 'publish':
        await publishPendingMovies();
        break;
      case 'scheduled':
        await startScheduledSync();
        break;
      case 'stats':
        await showStats();
        break;
      case 'help':
      default:
        showHelp();
        break;
    }
  } catch (error) {
    console.error('Error executing command:', error);
    process.exit(1);
  }
}

// Run the CLI
run();