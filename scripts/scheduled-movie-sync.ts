#!/usr/bin/env tsx

/**
 * Scheduled Movie Sync Script
 * 
 * This script is designed to be run on a schedule (e.g., daily) to keep the movie database
 * up to date with new content from the API. It automatically determines which pages to sync
 * based on configuration and history of previous runs.
 * 
 * Usage:
 *   tsx scripts/scheduled-movie-sync.ts [options]
 * 
 * Options:
 *   --mode=MODE        Sync mode: 'incremental' (default), 'full', or 'recent'
 *   --pages=N          Number of pages to process (default varies by mode)
 *   --concurrency=N    Number of pages to process in parallel (default: 1)
 *   --details=N        Number of movie details to process in parallel (default: 3)
 *   --retry=N          Number of retry attempts (default: 3)
 *   --wait=N           Milliseconds to wait between page requests (default: 2000)
 *   --force            Force sync even if recently completed
 * 
 * Modes:
 *   incremental        Sync only newer pages and update existing movie details
 *   recent             Sync only the most recent N pages (default: 10)
 *   full               Attempt to sync all pages (very time-consuming)
 * 
 * Examples:
 *   tsx scripts/scheduled-movie-sync.ts
 *   tsx scripts/scheduled-movie-sync.ts --mode=recent --pages=5
 *   tsx scripts/scheduled-movie-sync.ts --mode=full --concurrency=2
 */

import { db } from '../server/db';
import { log } from '../server/vite';
import { executeBulkImport, BulkImportConfig } from '../server/services/phimapi/bulkImporter';
import { storage } from '../server/storage';

// Default configurations for different modes
const DEFAULT_CONFIGS = {
  incremental: {
    pages: 20,
    concurrency: 1,
    detailConcurrency: 3,
    batchSize: 50,
    retryAttempts: 3,
    timeBetweenPages: 2000,
  },
  recent: {
    pages: 10,
    concurrency: 1,
    detailConcurrency: 3,
    batchSize: 30,
    retryAttempts: 3,
    timeBetweenPages: 2000,
  },
  full: {
    pages: 2251, // All pages
    concurrency: 1,
    detailConcurrency: 3,
    batchSize: 50,
    retryAttempts: 3,
    timeBetweenPages: 2000,
  }
};

// Parse command line arguments
function parseArgs() {
  const options: any = {
    mode: 'incremental',
    force: false
  };
  
  const args = process.argv.slice(2);
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      
      switch (key) {
        case 'mode':
          if (['incremental', 'full', 'recent'].includes(value)) {
            options.mode = value;
          } else {
            console.error(`Invalid mode: ${value}. Must be 'incremental', 'full', or 'recent'.`);
            process.exit(1);
          }
          break;
          
        case 'pages':
          options.pages = parseInt(value);
          if (isNaN(options.pages) || options.pages < 1) {
            console.error(`Invalid pages: ${value}. Must be a positive integer.`);
            process.exit(1);
          }
          break;
          
        case 'concurrency':
          options.concurrency = parseInt(value);
          if (isNaN(options.concurrency) || options.concurrency < 1) {
            console.error(`Invalid concurrency: ${value}. Must be a positive integer.`);
            process.exit(1);
          }
          break;
          
        case 'details':
          options.detailConcurrency = parseInt(value);
          if (isNaN(options.detailConcurrency) || options.detailConcurrency < 1) {
            console.error(`Invalid detail concurrency: ${value}. Must be a positive integer.`);
            process.exit(1);
          }
          break;
          
        case 'retry':
          options.retryAttempts = parseInt(value);
          if (isNaN(options.retryAttempts) || options.retryAttempts < 0) {
            console.error(`Invalid retry attempts: ${value}. Must be a non-negative integer.`);
            process.exit(1);
          }
          break;
          
        case 'wait':
          options.timeBetweenPages = parseInt(value);
          if (isNaN(options.timeBetweenPages) || options.timeBetweenPages < 0) {
            console.error(`Invalid wait time: ${value}. Must be a non-negative integer.`);
            process.exit(1);
          }
          break;
          
        case 'force':
          options.force = true;
          break;
          
        default:
          console.error(`Unknown option: ${key}`);
          process.exit(1);
      }
    }
  }
  
  return options;
}

// Check if a sync has been run recently
async function hasRecentSync(maxHoursAgo = 12): Promise<boolean> {
  try {
    // Get the latest bulk import job
    const latestJobs = await storage.getApiMovieJobLogs(1, 0);
    
    if (latestJobs.length === 0) {
      return false;
    }
    
    const latestJob = latestJobs[0];
    const now = new Date();
    const jobTime = latestJob.completedAt || latestJob.createdAt;
    
    // Calculate hours difference
    const hoursDiff = (now.getTime() - jobTime.getTime()) / (1000 * 60 * 60);
    
    return hoursDiff < maxHoursAgo;
  } catch (error) {
    console.error(`Error checking recent syncs: ${error}`);
    return false;
  }
}

// Get the optimal range of pages to sync based on the mode
async function getPageRange(mode: string, pages?: number): Promise<{startPage: number, endPage: number}> {
  const defaultPages = DEFAULT_CONFIGS[mode].pages;
  const numPages = pages || defaultPages;
  
  if (mode === 'recent') {
    // For recent mode, always start from page 1
    return {
      startPage: 1,
      endPage: numPages
    };
  } else if (mode === 'incremental') {
    // For incremental mode, try to find the highest page we've processed
    try {
      const latestJobs = await storage.getApiMovieJobLogs(100, 0);
      
      // Find the highest page processed
      let highestPage = 0;
      
      for (const job of latestJobs) {
        if (job.jobType === 'bulk_import' && job.status !== 'failed') {
          const details = job.details || {};
          const currentPage = details.currentPage as number;
          
          if (currentPage && currentPage > highestPage) {
            highestPage = currentPage;
          }
        }
      }
      
      // If we've processed some pages before, continue from there
      if (highestPage > 0) {
        return {
          startPage: highestPage + 1,
          endPage: highestPage + numPages
        };
      }
    } catch (error) {
      console.error(`Error determining page range: ${error}`);
    }
    
    // Default to first N pages if we couldn't determine the range
    return {
      startPage: 1,
      endPage: numPages
    };
  } else if (mode === 'full') {
    // For full mode, process all pages
    return {
      startPage: 1,
      endPage: numPages
    };
  }
  
  // Default fallback
  return {
    startPage: 1,
    endPage: numPages
  };
}

// Main function
async function main() {
  console.log('Scheduled Movie Sync');
  console.log('===================');
  
  const options = parseArgs();
  const mode = options.mode;
  
  console.log(`Sync mode: ${mode}`);
  
  // Check if we've run a sync recently
  if (!options.force && await hasRecentSync(12)) {
    console.log('A sync has been run in the last 12 hours. Use --force to run anyway.');
    process.exit(0);
  }
  
  try {
    // Get the page range to process
    const { startPage, endPage } = await getPageRange(mode, options.pages);
    
    console.log(`Processing pages ${startPage} to ${endPage}`);
    
    // Merge default config with user options
    const defaultConfig = DEFAULT_CONFIGS[mode];
    const config: Partial<BulkImportConfig> = {
      ...defaultConfig,
      startPage,
      endPage,
      concurrency: options.concurrency || defaultConfig.concurrency,
      detailConcurrency: options.detailConcurrency || defaultConfig.detailConcurrency,
      retryAttempts: options.retryAttempts || defaultConfig.retryAttempts,
      timeBetweenPages: options.timeBetweenPages || defaultConfig.timeBetweenPages,
      batchSize: defaultConfig.batchSize,
      processDetails: true,
      useCache: true
    };
    
    // Execute the bulk import
    const result = await executeBulkImport(config);
    
    // Log summary
    console.log('\nSync Summary:');
    console.log(`Pages processed: ${result.pagesProcessed}/${result.totalPages}`);
    console.log(`Total movies found: ${result.totalMoviesFound}`);
    console.log(`New movies added: ${result.newMoviesAdded}`);
    console.log(`Movie details processed: ${result.detailsProcessed}`);
    
    // Calculate elapsed time
    const elapsedMs = new Date().getTime() - result.startTime.getTime();
    const elapsedMinutes = (elapsedMs / 1000 / 60).toFixed(2);
    console.log(`\nTotal execution time: ${elapsedMinutes} minutes`);
    
    process.exit(0);
  } catch (error) {
    console.error('Fatal error:', error);
    process.exit(1);
  } finally {
    // Clean up database connection
    await db.end();
  }
}

// Run the script
main();