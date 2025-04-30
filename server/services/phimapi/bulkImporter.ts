import { log } from '../../vite';
import { fetchMovieList, fetchMovieDetail, withRetry } from './client';
import { extractSlugs, processMovieDetail, createSlimMovie } from './processor';
import { getCachedMovie, cacheMovie, getCachedMovieSlugs, cacheMovieSlugs } from './cache';
import { storage } from '../../storage';
import { InsertApiMovie, InsertApiMovieJobLog } from '@shared/schema';

/**
 * Configuration options for bulk import
 */
export interface BulkImportConfig {
  startPage: number;
  endPage: number;
  concurrency: number;
  detailConcurrency: number;
  retryAttempts: number;
  retryDelay: number;
  timeBetweenPages: number;
  timeBetweenDetails: number;
  batchSize: number;
  maxErrorsPerPage: number;
  useCache: boolean;
  processDetails: boolean;
  logFrequency: number;
}

// Default configuration for bulk import
export const DEFAULT_BULK_IMPORT_CONFIG: BulkImportConfig = {
  startPage: 1,
  endPage: 2251, // Total number of pages
  concurrency: 1, // How many pages to process in parallel (1 = sequential, for safety)
  detailConcurrency: 3, // How many movie details to fetch in parallel
  retryAttempts: 3,
  retryDelay: 2000, // Initial delay in ms
  timeBetweenPages: 2000, // Wait time between page requests (ms)
  timeBetweenDetails: 1000, // Wait time between detail requests (ms)
  batchSize: 50, // Number of movies to process in each batch
  maxErrorsPerPage: 5, // Maximum tolerated errors per page before skipping
  useCache: true, // Whether to use cache
  processDetails: true, // Whether to fetch details for new movies
  logFrequency: 10, // Log progress every N pages
};

/**
 * Progress tracking for the bulk import process
 */
interface ImportProgress {
  totalPages: number;
  pagesProcessed: number;
  pagesSkipped: number;
  pagesWithErrors: number;
  totalMoviesFound: number;
  newMoviesAdded: number;
  detailsProcessed: number;
  detailsFailed: number;
  startTime: Date;
  lastUpdate: Date;
  errors: Array<{ page?: number, slug?: string, error: string }>;
  skippedPages: number[];
  jobId?: number;
}

/**
 * Create a new import progress tracker
 */
function createProgressTracker(config: BulkImportConfig): ImportProgress {
  return {
    totalPages: config.endPage - config.startPage + 1,
    pagesProcessed: 0,
    pagesSkipped: 0,
    pagesWithErrors: 0,
    totalMoviesFound: 0,
    newMoviesAdded: 0,
    detailsProcessed: 0,
    detailsFailed: 0,
    startTime: new Date(),
    lastUpdate: new Date(),
    errors: [],
    skippedPages: [],
  };
}

/**
 * Process a batch of movies to fetch their details
 */
async function processBatchDetails(
  slugs: string[],
  config: BulkImportConfig,
  progress: ImportProgress
): Promise<void> {
  // Split into smaller batches for concurrency control
  const batches: string[][] = [];
  for (let i = 0; i < slugs.length; i += config.detailConcurrency) {
    batches.push(slugs.slice(i, i + config.detailConcurrency));
  }

  // Process each batch sequentially but with parallel fetches within each batch
  for (const batch of batches) {
    // Log progress
    log(`Processing batch of ${batch.length} movie details`, 'phimapi');
    
    // Process the batch with controlled concurrency
    const results = await Promise.all(
      batch.map(async (slug) => {
        try {
          const success = await withRetry(
            () => fetchAndStoreMovieDetail(slug),
            config.retryAttempts,
            config.retryDelay
          );
          
          if (success) {
            progress.detailsProcessed++;
          } else {
            progress.detailsFailed++;
            progress.errors.push({ slug, error: 'Failed to fetch/process movie details' });
          }
          
          return success;
        } catch (error) {
          progress.detailsFailed++;
          progress.errors.push({ slug, error: error.toString() });
          return false;
        }
      })
    );
    
    // Wait between batches to avoid rate limiting
    if (config.timeBetweenDetails > 0) {
      await new Promise(resolve => setTimeout(resolve, config.timeBetweenDetails));
    }
  }
}

/**
 * Fetch and process movie details for a single movie
 */
async function fetchAndStoreMovieDetail(slug: string): Promise<boolean> {
  try {
    // Check if the movie exists in the database
    const existingMovie = await storage.getApiMovieBySlug(slug);
    if (!existingMovie) {
      log(`Movie ${slug} not found in database`, 'phimapi');
      return false;
    }
    
    // Fetch the movie detail from API
    const movieDetail = await fetchMovieDetail(slug);
    
    if (!movieDetail?.movie) {
      log(`No movie details found for ${slug}`, 'phimapi');
      return false;
    }
    
    // Process the movie details
    const processedMovie = processMovieDetail(movieDetail.movie);
    
    // Cache the processed movie if needed
    cacheMovie(processedMovie, { ttl: 60 * 60 }); // Cache for 1 hour
    
    // Update the movie in the database
    await storage.updateApiMovie(existingMovie.id, {
      description: processedMovie.description,
      trailerUrl: processedMovie.trailerUrl,
      actors: processedMovie.actors,
      directors: processedMovie.directors,
      episodes: processedMovie.episodes,
      status: 'pending_review', // Mark for review before publishing
      updatedAt: new Date(),
      lastCheckedAt: new Date()
    });
    
    return true;
  } catch (error) {
    log(`Error fetching movie detail ${slug}: ${error}`, 'phimapi');
    throw error;
  }
}

/**
 * Process a single page of movies
 */
async function processPage(
  page: number,
  config: BulkImportConfig,
  progress: ImportProgress,
  existingSlugs: Set<string>
): Promise<string[]> {
  try {
    // Check if we want to use cache and if this page is cached
    if (config.useCache) {
      const cachedSlugs = getCachedMovieSlugs(page);
      if (cachedSlugs) {
        log(`Found cached slugs for page ${page}`, 'phimapi');
        progress.pagesProcessed++;
        return []; // No new slugs to process
      }
    }

    // Fetch the movie list from API with retries
    const movieList = await withRetry(
      () => fetchMovieList(page),
      config.retryAttempts,
      config.retryDelay
    );
    
    // Validate response
    if (!movieList || !movieList.items || !movieList.items.length) {
      log(`No valid movies found on page ${page}`, 'phimapi');
      progress.pagesWithErrors++;
      progress.errors.push({ page, error: 'No valid movies in response' });
      return [];
    }
    
    // Extract slugs
    const slugs = extractSlugs(movieList.items);
    const pageStats = {
      totalItems: movieList.paginate?.totalItems || 0,
      totalPages: movieList.paginate?.totalPages || 0,
      currentPage: movieList.paginate?.currentPage || page,
      itemsOnPage: slugs.length
    };
    
    // Cache the slugs
    if (config.useCache) {
      cacheMovieSlugs(slugs, page, { ttl: 60 * 60 * 24 }); // Cache for 24 hours
    }
    
    // Find new slugs
    const newSlugs = slugs.filter(slug => !existingSlugs.has(slug));
    
    // Store slim movie objects for new slugs
    const insertPromises = movieList.items
      .filter(item => newSlugs.includes(item.slug))
      .map(async (item) => {
        const slimMovie = createSlimMovie(item);
        
        try {
          // Store in the database
          // Create the new API movie
          const newMovie = await storage.createApiMovie({
            slug: slimMovie.slug,
            title: slimMovie.title,
            originalTitle: slimMovie.originalTitle,
            description: '',
            posterUrl: slimMovie.posterUrl,
            backdropUrl: slimMovie.backdropUrl,
            releaseYear: slimMovie.releaseYear,
            quality: slimMovie.quality,
            language: slimMovie.language,
            categories: slimMovie.categories,
            countries: slimMovie.countries,
            type: slimMovie.type,
            views: slimMovie.views,
            duration: slimMovie.duration,
            currentEpisode: slimMovie.currentEpisode,
            totalEpisodes: slimMovie.totalEpisodes,
            episodes: [],
            status: 'draft'
          } as InsertApiMovie);
          
          // Process movie categories if available
          try {
            if (slimMovie.categories && slimMovie.categories.length > 0) {
              const { processMovieCategories } = await import('../../category/service');
              await processMovieCategories(newMovie, slimMovie.categories);
              log(`Processed categories for new movie ${newMovie.slug}`, 'phimapi');
            }
          } catch (categoryError) {
            log(`Error processing categories for new movie ${newMovie.slug}: ${categoryError}`, 'phimapi');
            // Continue anyway - we don't want to fail the whole import just because of categories
          }
          
          // Add to existing slugs to avoid duplicates
          existingSlugs.add(slimMovie.slug);
          return true;
        } catch (error) {
          log(`Error storing slim movie ${slimMovie.slug}: ${error}`, 'phimapi');
          progress.errors.push({ page, slug: slimMovie.slug, error: error.toString() });
          return false;
        }
      });
    
    // Wait for all insertions to complete
    const results = await Promise.all(insertPromises);
    const successfulInserts = results.filter(Boolean).length;
    
    // Update progress
    progress.pagesProcessed++;
    progress.totalMoviesFound += slugs.length;
    progress.newMoviesAdded += successfulInserts;
    progress.lastUpdate = new Date();
    
    // Log progress periodically
    if (page % config.logFrequency === 0 || page === config.endPage) {
      log(`Page ${page}/${config.endPage}: Found ${slugs.length} movies, ${successfulInserts} new. Total: ${progress.newMoviesAdded} new movies`, 'phimapi');
    }
    
    return newSlugs;
  } catch (error) {
    // Log and track the error
    log(`Error processing page ${page}: ${error}`, 'phimapi');
    progress.pagesWithErrors++;
    progress.errors.push({ page, error: error.toString() });
    
    // If we've hit the maximum errors for this page, mark it as skipped
    if (progress.errors.filter(e => e.page === page).length >= config.maxErrorsPerPage) {
      progress.skippedPages.push(page);
      progress.pagesSkipped++;
      log(`Skipping page ${page} due to too many errors`, 'phimapi');
    }
    
    return [];
  }
}

/**
 * Execute bulk import with rate limiting and concurrency control
 */
export async function executeBulkImport(
  customConfig: Partial<BulkImportConfig> = {}
): Promise<ImportProgress> {
  // Merge default config with custom options
  const config = { ...DEFAULT_BULK_IMPORT_CONFIG, ...customConfig };
  const progress = createProgressTracker(config);
  
  try {
    // Start a job log to track the entire bulk import
    const jobLog = await storage.createApiMovieJobLog({
      jobType: 'bulk_import',
      status: 'running',
      moviesProcessed: 0,
      moviesAdded: 0,
      moviesUpdated: 0,
      errorCount: 0,
      details: {
        config,
        startTime: progress.startTime
      }
    });
    
    progress.jobId = jobLog.id;
    
    // Get existing slugs from the database to avoid duplicates
    const existingSlugsArray = await storage.getApiMoviesSlugs();
    const existingSlugs = new Set(existingSlugsArray);
    
    log(`Starting bulk import from page ${config.startPage} to ${config.endPage}. Found ${existingSlugs.size} existing movies.`, 'phimapi');
    
    // All new slugs collected during this import
    const allNewSlugs: string[] = [];
    
    // Process pages based on concurrency setting
    for (let page = config.startPage; page <= config.endPage; page++) {
      try {
        // Process pages sequentially or in parallel based on concurrency
        if (config.concurrency === 1) {
          // Sequential processing
          const newSlugs = await processPage(page, config, progress, existingSlugs);
          allNewSlugs.push(...newSlugs);
          
          // Wait between pages to avoid rate limiting
          if (config.timeBetweenPages > 0 && page < config.endPage) {
            await new Promise(resolve => setTimeout(resolve, config.timeBetweenPages));
          }
        } else {
          // Parallel processing with controlled concurrency
          const pagePromises: Promise<string[]>[] = [];
          
          // Start a batch of concurrent page fetches
          for (let i = 0; i < config.concurrency && page + i <= config.endPage; i++) {
            pagePromises.push(processPage(page + i, config, progress, existingSlugs));
          }
          
          // Wait for the batch to complete
          const batchResults = await Promise.all(pagePromises);
          
          // Collect new slugs from this batch
          const batchSlugs = batchResults.flat();
          allNewSlugs.push(...batchSlugs);
          
          // Advance the page counter (minus 1 because the loop will increment it)
          page += config.concurrency - 1;
          
          // Wait between batches to avoid rate limiting
          if (config.timeBetweenPages > 0 && page < config.endPage) {
            await new Promise(resolve => setTimeout(resolve, config.timeBetweenPages));
          }
        }
        
        // Periodically update the job log
        if (page % 10 === 0 || page === config.endPage || page === config.startPage) {
          await storage.updateApiMovieJobLog(jobLog.id, {
            moviesProcessed: progress.totalMoviesFound,
            moviesAdded: progress.newMoviesAdded,
            moviesUpdated: progress.detailsProcessed,
            errorCount: progress.errors.length,
            details: {
              ...progress,
              currentPage: page,
              percentComplete: ((page - config.startPage) / (config.endPage - config.startPage + 1) * 100).toFixed(2)
            }
          });
        }
      } catch (error) {
        // Handle errors for each page batch
        log(`Error in bulk import page processing, page ${page}: ${error}`, 'phimapi');
        progress.errors.push({ page, error: error.toString() });
        progress.pagesWithErrors++;
        
        // Continue with the next batch
        continue;
      }
    }
    
    // Process details for all new movies if configured
    if (config.processDetails && allNewSlugs.length > 0) {
      log(`Processing details for ${allNewSlugs.length} new movies`, 'phimapi');
      
      // Process in batches
      for (let i = 0; i < allNewSlugs.length; i += config.batchSize) {
        const batch = allNewSlugs.slice(i, i + config.batchSize);
        await processBatchDetails(batch, config, progress);
        
        // Update job log every batch
        await storage.updateApiMovieJobLog(jobLog.id, {
          moviesProcessed: progress.totalMoviesFound,
          moviesAdded: progress.newMoviesAdded,
          moviesUpdated: progress.detailsProcessed,
          errorCount: progress.errors.length,
          details: {
            ...progress,
            detailsProgress: {
              processed: progress.detailsProcessed,
              failed: progress.detailsFailed,
              total: allNewSlugs.length,
              percentComplete: ((i + batch.length) / allNewSlugs.length * 100).toFixed(2)
            }
          }
        });
      }
    }
    
    // Calculate elapsed time
    const endTime = new Date();
    const elapsedMs = endTime.getTime() - progress.startTime.getTime();
    const elapsedMinutes = (elapsedMs / 1000 / 60).toFixed(2);
    
    // Log final summary
    log(`Bulk import completed in ${elapsedMinutes} minutes. Processed ${progress.pagesProcessed}/${progress.totalPages} pages, found ${progress.totalMoviesFound} movies, added ${progress.newMoviesAdded} new movies, fetched ${progress.detailsProcessed} details.`, 'phimapi');
    
    // Update final job status
    await storage.updateApiMovieJobLog(jobLog.id, {
      status: progress.errors.length > 0 ? 'partial' : 'success',
      moviesProcessed: progress.totalMoviesFound,
      moviesAdded: progress.newMoviesAdded,
      moviesUpdated: progress.detailsProcessed,
      errorCount: progress.errors.length,
      completedAt: endTime,
      details: {
        ...progress,
        elapsedTime: elapsedMs,
        elapsedMinutes,
        endTime
      }
    });
    
    return progress;
  } catch (error) {
    // Handle critical errors in the bulk import process
    log(`Critical error in bulk import: ${error}`, 'phimapi');
    
    // Update job log with failure status
    if (progress.jobId) {
      await storage.updateApiMovieJobLog(progress.jobId, {
        status: 'failed',
        moviesProcessed: progress.totalMoviesFound,
        moviesAdded: progress.newMoviesAdded,
        moviesUpdated: progress.detailsProcessed,
        errorCount: progress.errors.length + 1,
        completedAt: new Date(),
        details: {
          ...progress,
          criticalError: error.toString()
        }
      });
    } else {
      // Create a new error log if no job ID exists
      await storage.createApiMovieJobLog({
        jobType: 'bulk_import',
        status: 'failed',
        moviesProcessed: progress.totalMoviesFound,
        moviesAdded: progress.newMoviesAdded,
        moviesUpdated: progress.detailsProcessed,
        errorCount: progress.errors.length + 1,
        completedAt: new Date(),
        details: {
          ...progress, 
          criticalError: error.toString()
        }
      });
    }
    
    throw error;
  }
}

/**
 * Resume a bulk import from where it left off based on a previous job
 */
export async function resumeBulkImport(jobId: number): Promise<ImportProgress | null> {
  try {
    // Get the previous job
    const previousJob = await storage.getApiMovieJobLog(jobId);
    if (!previousJob || previousJob.jobType !== 'bulk_import') {
      log(`Cannot resume: invalid job ID ${jobId} or not a bulk import job`, 'phimapi');
      return null;
    }
    
    // Extract previous config and details
    const previousConfig = previousJob.details?.config as Partial<BulkImportConfig>;
    const currentPage = previousJob.details?.currentPage as number || 0;
    const skippedPages = previousJob.details?.skippedPages as number[] || [];
    
    if (!previousConfig || !currentPage) {
      log(`Cannot resume: missing configuration or current page in job ${jobId}`, 'phimapi');
      return null;
    }
    
    // Create new configuration starting from the next page
    const resumeConfig: Partial<BulkImportConfig> = {
      ...previousConfig,
      startPage: currentPage + 1,
    };
    
    log(`Resuming bulk import from page ${resumeConfig.startPage} to ${resumeConfig.endPage}`, 'phimapi');
    
    // Execute new bulk import with resumed configuration
    return executeBulkImport(resumeConfig);
  } catch (error) {
    log(`Error resuming bulk import: ${error}`, 'phimapi');
    return null;
  }
}

/**
 * Retry failed pages from a previous bulk import job
 */
export async function retryFailedPages(jobId: number): Promise<ImportProgress | null> {
  try {
    // Get the previous job
    const previousJob = await storage.getApiMovieJobLog(jobId);
    if (!previousJob || previousJob.jobType !== 'bulk_import') {
      log(`Cannot retry: invalid job ID ${jobId} or not a bulk import job`, 'phimapi');
      return null;
    }
    
    // Extract previous configuration and failed pages
    const previousConfig = previousJob.details?.config as Partial<BulkImportConfig>;
    const skippedPages = previousJob.details?.skippedPages as number[] || [];
    const errorPages = (previousJob.details?.errors as any[] || [])
      .filter(e => e.page)
      .map(e => e.page as number);
    
    // Combine skipped and error pages, removing duplicates
    const pagesToRetry = [...new Set([...skippedPages, ...errorPages])].sort((a, b) => a - b);
    
    if (pagesToRetry.length === 0) {
      log(`No failed pages to retry for job ${jobId}`, 'phimapi');
      return null;
    }
    
    log(`Retrying ${pagesToRetry.length} failed pages from job ${jobId}`, 'phimapi');
    
    // Process each failed page
    const progress = createProgressTracker(previousConfig as BulkImportConfig);
    progress.totalPages = pagesToRetry.length;
    
    // Start a job log for retries
    const jobLog = await storage.createApiMovieJobLog({
      jobType: 'retry_pages',
      status: 'running',
      moviesProcessed: 0,
      moviesAdded: 0,
      moviesUpdated: 0,
      errorCount: 0,
      details: {
        originalJobId: jobId,
        pagesToRetry,
        startTime: progress.startTime
      }
    });
    
    progress.jobId = jobLog.id;
    
    // Get existing slugs
    const existingSlugsArray = await storage.getApiMoviesSlugs();
    const existingSlugs = new Set(existingSlugsArray);
    
    // Process each failed page
    const allNewSlugs: string[] = [];
    
    for (const page of pagesToRetry) {
      try {
        const newSlugs = await processPage(page, previousConfig as BulkImportConfig, progress, existingSlugs);
        allNewSlugs.push(...newSlugs);
        
        // Update job log every 5 pages or at the end
        if (pagesToRetry.indexOf(page) % 5 === 0 || page === pagesToRetry[pagesToRetry.length - 1]) {
          await storage.updateApiMovieJobLog(jobLog.id, {
            moviesProcessed: progress.totalMoviesFound,
            moviesAdded: progress.newMoviesAdded,
            moviesUpdated: progress.detailsProcessed,
            errorCount: progress.errors.length,
            details: {
              ...progress,
              currentPage: page,
              pagesRetried: pagesToRetry.indexOf(page) + 1,
              totalPagesToRetry: pagesToRetry.length,
              percentComplete: ((pagesToRetry.indexOf(page) + 1) / pagesToRetry.length * 100).toFixed(2)
            }
          });
        }
        
        // Wait between pages
        if (page !== pagesToRetry[pagesToRetry.length - 1]) {
          await new Promise(resolve => setTimeout(resolve, (previousConfig.timeBetweenPages || 2000)));
        }
      } catch (error) {
        log(`Error retrying page ${page}: ${error}`, 'phimapi');
        progress.errors.push({ page, error: error.toString() });
        progress.pagesWithErrors++;
        continue;
      }
    }
    
    // Process details if needed
    if (previousConfig.processDetails && allNewSlugs.length > 0) {
      log(`Processing details for ${allNewSlugs.length} new movies from retried pages`, 'phimapi');
      await processBatchDetails(allNewSlugs, previousConfig as BulkImportConfig, progress);
    }
    
    // Final update
    const endTime = new Date();
    const elapsedMs = endTime.getTime() - progress.startTime.getTime();
    
    await storage.updateApiMovieJobLog(jobLog.id, {
      status: progress.errors.length > 0 ? 'partial' : 'success',
      moviesProcessed: progress.totalMoviesFound,
      moviesAdded: progress.newMoviesAdded,
      moviesUpdated: progress.detailsProcessed,
      errorCount: progress.errors.length,
      completedAt: endTime,
      details: {
        ...progress,
        elapsedTime: elapsedMs,
        elapsedMinutes: (elapsedMs / 1000 / 60).toFixed(2),
        endTime
      }
    });
    
    return progress;
  } catch (error) {
    log(`Error retrying failed pages: ${error}`, 'phimapi');
    return null;
  }
}

/**
 * Start the bulk import process with default values for testing
 */
export function initBulkImport(): void {
  // Only start a limited bulk import to demonstrate the functionality
  setTimeout(async () => {
    try {
      log('Starting limited bulk import for testing...', 'phimapi');
      
      // Default to just 5 pages with 3 for details to avoid overwhelming the system
      const testConfig: Partial<BulkImportConfig> = {
        startPage: 1,
        endPage: 5,
        concurrency: 1,
        detailConcurrency: 2,
        batchSize: 10,
        processDetails: true
      };
      
      await executeBulkImport(testConfig);
    } catch (error) {
      log(`Bulk import test error: ${error}`, 'phimapi');
    }
  }, 30000); // Wait 30 seconds after startup
}