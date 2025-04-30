#!/usr/bin/env tsx

/**
 * Bulk Movie Import Script
 * 
 * This script fetches movie data from a paginated API in bulk, with options for
 * concurrency, retries, and detailed processing.
 * 
 * Usage:
 *   tsx scripts/bulk-import-movies.ts [options]
 * 
 * Options:
 *   --start=N          Starting page number (default: 1)
 *   --end=N            Ending page number (default: 2251)
 *   --concurrency=N    Number of pages to process in parallel (default: 1)
 *   --details=N        Number of movie details to process in parallel (default: 3)
 *   --batch=N          Size of batches for detail processing (default: 50)
 *   --retry=N          Number of retry attempts (default: 3)
 *   --wait=N           Milliseconds to wait between page requests (default: 2000)
 *   --resume=ID        Resume a previous job by ID
 *   --retry-failed=ID  Retry failed pages from a previous job by ID
 *   --no-details       Skip processing movie details
 *   --no-cache         Disable caching
 * 
 * Examples:
 *   tsx scripts/bulk-import-movies.ts
 *   tsx scripts/bulk-import-movies.ts --start=1 --end=5 --concurrency=1
 *   tsx scripts/bulk-import-movies.ts --resume=123
 *   tsx scripts/bulk-import-movies.ts --retry-failed=123
 */

import { db } from '../server/db';
import { log } from '../server/vite';
import { executeBulkImport, resumeBulkImport, retryFailedPages, BulkImportConfig } from '../server/services/phimapi/bulkImporter';

// Parse command line arguments
function parseArgs(): {
  options: Partial<BulkImportConfig> & { 
    resume?: number;
    retryFailed?: number;
    noDetails?: boolean;
    noCache?: boolean;
  };
  errors: string[];
} {
  const options: any = {};
  const errors: string[] = [];
  
  // Get all args after "script.ts"
  const args = process.argv.slice(2);
  
  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.slice(2).split('=');
      
      switch (key) {
        case 'start':
          options.startPage = parseInt(value);
          if (isNaN(options.startPage) || options.startPage < 1) {
            errors.push(`Invalid start page: ${value}. Must be a positive integer.`);
          }
          break;
          
        case 'end':
          options.endPage = parseInt(value);
          if (isNaN(options.endPage) || options.endPage < 1) {
            errors.push(`Invalid end page: ${value}. Must be a positive integer.`);
          }
          break;
          
        case 'concurrency':
          options.concurrency = parseInt(value);
          if (isNaN(options.concurrency) || options.concurrency < 1) {
            errors.push(`Invalid concurrency: ${value}. Must be a positive integer.`);
          }
          break;
          
        case 'details':
          options.detailConcurrency = parseInt(value);
          if (isNaN(options.detailConcurrency) || options.detailConcurrency < 1) {
            errors.push(`Invalid detail concurrency: ${value}. Must be a positive integer.`);
          }
          break;
          
        case 'batch':
          options.batchSize = parseInt(value);
          if (isNaN(options.batchSize) || options.batchSize < 1) {
            errors.push(`Invalid batch size: ${value}. Must be a positive integer.`);
          }
          break;
          
        case 'retry':
          options.retryAttempts = parseInt(value);
          if (isNaN(options.retryAttempts) || options.retryAttempts < 0) {
            errors.push(`Invalid retry attempts: ${value}. Must be a non-negative integer.`);
          }
          break;
          
        case 'wait':
          options.timeBetweenPages = parseInt(value);
          if (isNaN(options.timeBetweenPages) || options.timeBetweenPages < 0) {
            errors.push(`Invalid wait time: ${value}. Must be a non-negative integer.`);
          }
          break;
          
        case 'resume':
          options.resume = parseInt(value);
          if (isNaN(options.resume) || options.resume < 1) {
            errors.push(`Invalid job ID for resume: ${value}. Must be a positive integer.`);
          }
          break;
          
        case 'retry-failed':
          options.retryFailed = parseInt(value);
          if (isNaN(options.retryFailed) || options.retryFailed < 1) {
            errors.push(`Invalid job ID for retry-failed: ${value}. Must be a positive integer.`);
          }
          break;
          
        case 'no-details':
          options.noDetails = true;
          options.processDetails = false;
          break;
          
        case 'no-cache':
          options.noCache = true;
          options.useCache = false;
          break;
          
        default:
          errors.push(`Unknown option: ${key}`);
      }
    }
  }
  
  // Validate conflicting options
  if (options.resume && options.retryFailed) {
    errors.push('Cannot specify both --resume and --retry-failed');
  }
  
  if ((options.resume || options.retryFailed) && 
      (options.startPage || options.endPage)) {
    errors.push('Cannot specify page range with --resume or --retry-failed');
  }
  
  return { options, errors };
}

// Main function
async function main() {
  console.log('Movie Bulk Import Script');
  console.log('=======================');
  
  const { options, errors } = parseArgs();
  
  if (errors.length > 0) {
    console.error('Error(s) in command-line arguments:');
    errors.forEach(error => console.error(` - ${error}`));
    process.exit(1);
  }
  
  try {
    // Configure bulk importer
    if (options.processDetails === false) {
      console.log('Movie details processing disabled');
    }
    
    if (options.useCache === false) {
      console.log('Caching disabled');
    }
    
    // Prepare configuration
    const config: Partial<BulkImportConfig> = {
      startPage: options.startPage,
      endPage: options.endPage,
      concurrency: options.concurrency,
      detailConcurrency: options.detailConcurrency,
      retryAttempts: options.retryAttempts,
      timeBetweenPages: options.timeBetweenPages,
      batchSize: options.batchSize,
      processDetails: !options.noDetails,
      useCache: !options.noCache
    };
    
    // Log start-up configuration
    console.log('Current configuration:');
    Object.entries(config).forEach(([key, value]) => {
      if (value !== undefined) {
        console.log(` - ${key}: ${value}`);
      }
    });
    
    // Execute the appropriate action
    let result;
    
    if (options.resume) {
      console.log(`Resuming job ID: ${options.resume}`);
      result = await resumeBulkImport(options.resume);
      if (!result) {
        console.error('Failed to resume job');
        process.exit(1);
      }
    } else if (options.retryFailed) {
      console.log(`Retrying failed pages from job ID: ${options.retryFailed}`);
      result = await retryFailedPages(options.retryFailed);
      if (!result) {
        console.error('Failed to retry failed pages');
        process.exit(1);
      }
    } else {
      console.log('Starting new bulk import');
      result = await executeBulkImport(config);
    }
    
    // Log summary
    console.log('\nBulk Import Summary:');
    console.log(`Pages processed: ${result.pagesProcessed}/${result.totalPages}`);
    console.log(`Pages with errors: ${result.pagesWithErrors}`);
    console.log(`Pages skipped: ${result.pagesSkipped}`);
    console.log(`Total movies found: ${result.totalMoviesFound}`);
    console.log(`New movies added: ${result.newMoviesAdded}`);
    
    if (result.detailsProcessed > 0 || result.detailsFailed > 0) {
      console.log(`Movie details processed: ${result.detailsProcessed}`);
      console.log(`Movie details failed: ${result.detailsFailed}`);
    }
    
    // Print errors if any
    if (result.errors.length > 0) {
      console.log(`\nErrors (${result.errors.length}):`);
      // Only show up to 10 errors to avoid flooding the console
      result.errors.slice(0, 10).forEach((error, index) => {
        console.log(` ${index + 1}. ${error.page ? `Page ${error.page}` : ''} ${error.slug ? `Slug ${error.slug}` : ''}: ${error.error}`);
      });
      if (result.errors.length > 10) {
        console.log(` ... and ${result.errors.length - 10} more errors`);
      }
    }
    
    // Calculate elapsed time
    const elapsedMs = new Date().getTime() - result.startTime.getTime();
    const elapsedMinutes = (elapsedMs / 1000 / 60).toFixed(2);
    console.log(`\nTotal execution time: ${elapsedMinutes} minutes`);
    
    // Job ID
    if (result.jobId) {
      console.log(`\nJob ID: ${result.jobId} (use this ID to resume or retry failed pages)`);
    }
    
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