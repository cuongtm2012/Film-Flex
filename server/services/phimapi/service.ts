import { log } from '../../vite';
import { fetchMovieList, fetchMovieDetail, withRetry } from './client';
import { extractSlugs, processMovieDetail, createSlimMovie } from './processor';
import { getCachedMovie, cacheMovie, getCachedMovieSlugs, cacheMovieSlugs } from './cache';
import { storage } from '../../storage';
import { InsertApiMovie, InsertApiMovieJobLog } from '@shared/schema';

/**
 * Fetch a page of movies from the API and store slugs in the database
 * @param page Page number to fetch
 * @returns Number of new movies fetched
 */
export async function fetchAndStorePage(page: number = 1): Promise<number> {
  try {
    // Check if we have this page in cache
    const cachedSlugs = getCachedMovieSlugs(page);
    if (cachedSlugs) {
      log(`Found cached slugs for page ${page}`, 'phimapi');
      return 0; // Skip if we already have this page
    }

    // Start a new job log
    const jobLog = await storage.createApiMovieJobLog({
      jobType: 'list',
      status: 'success',
      moviesProcessed: 0,
      moviesAdded: 0,
      moviesUpdated: 0,
      errorCount: 0
    });

    // Fetch the movie list from API
    const movieList = await withRetry(() => fetchMovieList(page));
    
    // Check if the response is properly structured
    if (!movieList || !movieList.items) {
      log(`Invalid API response for page ${page}: ${JSON.stringify(movieList)}`, 'phimapi');
      await storage.updateApiMovieJobLog(jobLog.id, {
        status: 'failed',
        details: { error: 'Invalid API response format', page, response: JSON.stringify(movieList).substring(0, 1000) },
        completedAt: new Date()
      });
      return 0;
    }
    
    if (!movieList.items.length) {
      log(`No movies found on page ${page}`, 'phimapi');
      await storage.updateApiMovieJobLog(jobLog.id, {
        status: 'failed',
        details: { error: 'No movies found', page },
        completedAt: new Date()
      });
      return 0;
    }
    
    // Extract slugs
    const slugs = extractSlugs(movieList.items);
    cacheMovieSlugs(slugs, page, { ttl: 60 * 60 }); // Cache for 1 hour
    
    // Get existing slugs from database
    const existingSlugs = await storage.getApiMoviesSlugs();
    const newSlugs = slugs.filter(slug => !existingSlugs.includes(slug));
    
    // Store slim movie objects for new slugs
    const results = await Promise.all(
      movieList.items
        .filter(item => newSlugs.includes(item.slug))
        .map(async (item) => {
          const slimMovie = createSlimMovie(item);
          
          try {
            // Store in the database
            await storage.createApiMovie({
              slug: slimMovie.slug,
              title: slimMovie.title,
              originalTitle: slimMovie.originalTitle,
              description: '', // Will be populated when we fetch details
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
              episodes: [], // Will be populated when we fetch details
              status: 'draft'
            } as InsertApiMovie);
            return true;
          } catch (error) {
            log(`Error storing slim movie ${slimMovie.slug}: ${error}`, 'phimapi');
            return false;
          }
        })
    );
    
    // Count successes
    const successCount = results.filter(Boolean).length;
    
    // Update job log
    await storage.updateApiMovieJobLog(jobLog.id, {
      moviesProcessed: slugs.length,
      moviesAdded: successCount,
      status: successCount > 0 ? 'success' : 'partial',
      details: { 
        page,
        totalItems: movieList.paginate?.totalItems || 0,
        totalPages: movieList.paginate?.totalPages || 1,
        newSlugs,
        existingSlugs: existingSlugs.length,
        hasPaginate: !!movieList.paginate
      },
      completedAt: new Date()
    });
    
    return successCount;
  } catch (error) {
    log(`Error fetching movie page ${page}: ${error}`, 'phimapi');
    // Create error log
    try {
      await storage.createApiMovieJobLog({
        jobType: 'list',
        status: 'failed',
        moviesProcessed: 0,
        moviesAdded: 0,
        moviesUpdated: 0,
        errorCount: 1,
        details: { error: error.toString(), page },
        completedAt: new Date()
      });
    } catch (logError) {
      log(`Failed to create error log: ${logError}`, 'phimapi');
    }
    throw error;
  }
}

/**
 * Fetch detailed movie information from API
 * @param slug Movie slug to fetch
 * @returns Whether the operation succeeded
 */
export async function fetchAndStoreMovieDetail(slug: string): Promise<boolean> {
  try {
    // Check if the movie exists in the database
    const existingMovie = await storage.getApiMovieBySlug(slug);
    if (!existingMovie) {
      log(`Movie ${slug} not found in database`, 'phimapi');
      return false;
    }
    
    // Check if it's already cached
    const cachedMovie = getCachedMovie(slug);
    if (cachedMovie) {
      log(`Found cached detailed movie ${slug}`, 'phimapi');
      return true;
    }
    
    // Start a job log
    const jobLog = await storage.createApiMovieJobLog({
      jobType: 'detail',
      status: 'success',
      moviesProcessed: 1,
      moviesUpdated: 0,
      errorCount: 0
    });
    
    // Fetch the movie detail from API
    const movieDetail = await withRetry(() => fetchMovieDetail(slug));
    
    if (!movieDetail?.movie) {
      log(`No movie details found for ${slug}`, 'phimapi');
      await storage.updateApiMovieJobLog(jobLog.id, {
        status: 'failed',
        details: { error: 'No movie details found', slug },
        completedAt: new Date()
      });
      return false;
    }
    
    // Process the movie details
    const processedMovie = processMovieDetail(movieDetail.movie, movieDetail.episodes);
    
    // Cache the processed movie
    cacheMovie(processedMovie, { ttl: 60 * 10 }); // Cache for 10 minutes
    
    // Update the movie in the database
    const updatedMovie = await storage.updateApiMovie(existingMovie.id, {
      description: processedMovie.description,
      trailerUrl: processedMovie.trailerUrl,
      actors: processedMovie.actors,
      directors: processedMovie.directors,
      episodes: processedMovie.episodes,
      embedUrl: processedMovie.embedUrl, // Store the embed URL directly
      status: 'pending_review', // Mark for review before publishing
      updatedAt: new Date(),
      lastCheckedAt: new Date()
    });
    
    // Process movie categories using the updated structure
    try {
      const { processMovieCategories } = await import('../category/service');
      await processMovieCategories(updatedMovie, processedMovie.categories);
      log(`Processed categories for movie ${updatedMovie.slug}`, 'phimapi');
    } catch (categoryError) {
      log(`Error processing categories for movie ${updatedMovie.slug}: ${categoryError}`, 'phimapi');
      // Continue anyway - we don't want to fail the whole update just because of categories
    }
    
    // Update job log
    await storage.updateApiMovieJobLog(jobLog.id, {
      moviesUpdated: 1,
      status: 'success',
      completedAt: new Date(),
      details: { slug }
    });
    
    return true;
  } catch (error) {
    log(`Error fetching movie detail ${slug}: ${error}`, 'phimapi');
    // Create error log
    try {
      await storage.createApiMovieJobLog({
        jobType: 'detail',
        status: 'failed',
        moviesProcessed: 1,
        moviesUpdated: 0,
        errorCount: 1,
        details: { error: error.toString(), slug },
        completedAt: new Date()
      });
    } catch (logError) {
      log(`Failed to create error log: ${logError}`, 'phimapi');
    }
    throw error;
  }
}

/**
 * Process movies that need to be enriched with detailed information
 * @param batchSize Number of movies to process in this batch
 * @returns Number of movies processed
 */
export async function processPendingDetailFetches(batchSize: number = 5): Promise<number> {
  try {
    // Get all draft movies that need details
    const pendingMovies = await storage.getApiMovies(batchSize, 0, 'draft');
    
    if (pendingMovies.length === 0) {
      log('No pending movies to fetch details for', 'phimapi');
      return 0;
    }
    
    // Start a job log
    const jobLog = await storage.createApiMovieJobLog({
      jobType: 'update',
      status: 'success',
      moviesProcessed: pendingMovies.length,
      moviesUpdated: 0,
      errorCount: 0
    });
    
    // Process each movie
    const results = await Promise.all(
      pendingMovies.map(async (movie) => {
        try {
          return await fetchAndStoreMovieDetail(movie.slug);
        } catch (error) {
          log(`Error processing movie ${movie.slug}: ${error}`, 'phimapi');
          return false;
        }
      })
    );
    
    // Count successes
    const successCount = results.filter(Boolean).length;
    
    // Update job log
    await storage.updateApiMovieJobLog(jobLog.id, {
      moviesUpdated: successCount,
      status: successCount === pendingMovies.length ? 'success' : 'partial',
      completedAt: new Date(),
      details: { pendingCount: pendingMovies.length, successCount }
    });
    
    return successCount;
  } catch (error) {
    log(`Error processing pending movie details: ${error}`, 'phimapi');
    // Create error log
    try {
      await storage.createApiMovieJobLog({
        jobType: 'update',
        status: 'failed',
        moviesProcessed: 0,
        moviesUpdated: 0,
        errorCount: 1,
        details: { error: error.toString() },
        completedAt: new Date()
      });
    } catch (logError) {
      log(`Failed to create error log: ${logError}`, 'phimapi');
    }
    throw error;
  }
}

/**
 * Main function to synchronize movies from the API
 * @param startPage Page to start from
 * @param endPage Last page to process
 * @param detailBatchSize Number of movie details to fetch in a batch
 * @returns Total number of new movies added
 */
export async function syncMovies(
  startPage: number = 1, 
  endPage: number = 5,
  detailBatchSize: number = 10
): Promise<number> {
  let totalNewMovies = 0;
  
  try {
    // Fetch movie lists page by page
    for (let page = startPage; page <= endPage; page++) {
      const newMovies = await fetchAndStorePage(page);
      totalNewMovies += newMovies;
      
      // Wait a bit between pages to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    // Process movies that need details
    let detailsProcessed = 0;
    let batchesProcessed = 0;
    const MAX_BATCHES = 3;
    
    do {
      const processed = await processPendingDetailFetches(detailBatchSize);
      detailsProcessed += processed;
      batchesProcessed++;
      
      // Stop if we've processed enough batches or no more movies were processed
      if (batchesProcessed >= MAX_BATCHES || processed === 0) {
        break;
      }
      
      // Wait between batches
      await new Promise(resolve => setTimeout(resolve, 5000));
    } while (true);
    
    log(`Sync completed: ${totalNewMovies} new movies, ${detailsProcessed} details fetched`, 'phimapi');
    return totalNewMovies;
  } catch (error) {
    log(`Error syncing movies: ${error}`, 'phimapi');
    // Create error log
    try {
      await storage.createApiMovieJobLog({
        jobType: 'list',
        status: 'failed',
        moviesProcessed: 0,
        moviesAdded: 0,
        moviesUpdated: 0,
        errorCount: 1,
        details: { 
          error: error.toString(),
          startPage,
          endPage,
          detailBatchSize
        },
        completedAt: new Date()
      });
    } catch (logError) {
      log(`Failed to create error log: ${logError}`, 'phimapi');
    }
    throw error;
  }
}

/**
 * Initialize the scheduled task for regular movie updates
 */
export function initScheduledSync(): void {
  // Run an initial sync after startup (delayed by 10 seconds)
  setTimeout(async () => {
    try {
      log('Running initial movie sync...', 'phimapi');
      await syncMovies(1, 20, 10); // Start with 20 pages and 10 movies for details
    } catch (error) {
      log(`Initial sync error: ${error}`, 'phimapi');
      // Log the error
      try {
        await storage.createApiMovieJobLog({
          jobType: 'list',
          status: 'failed',
          moviesProcessed: 0,
          moviesAdded: 0,
          moviesUpdated: 0,
          errorCount: 1,
          details: { error: error.toString(), initial: true },
          completedAt: new Date()
        });
      } catch (logError) {
        log(`Failed to create initial error log: ${logError}`, 'phimapi');
      }
    }
    
    // Then start a more extensive sync after the initial batch
    setTimeout(async () => {
      try {
        log('Running extended movie sync...', 'phimapi');
        await syncMovies(21, 50, 20); // Get more pages
      } catch (error) {
        log(`Extended sync error: ${error}`, 'phimapi');
      }
    }, 60000); // Start 1 minute after the initial sync
  }, 10000);
  
  // Schedule regular syncs every 12 hours
  setInterval(async () => {
    try {
      log('Running scheduled movie sync...', 'phimapi');
      await syncMovies(1, 5, 10); // Sync first 5 pages, 10 movies for details
    } catch (error) {
      log(`Scheduled sync error: ${error}`, 'phimapi');
    }
  }, 12 * 60 * 60 * 1000); // 12 hours
}