/**
 * Admin functions for managing API movies
 * These functions handle publishing, unpublishing, and other admin operations
 */

import { storage } from '../../storage';
import { log } from '../../vite';

/**
 * Update the status of API movies
 * @param slugs Array of movie slugs to update
 * @param status New status to set
 * @returns Number of movies updated
 */
export async function updateMovieStatuses(slugs: string[], status: 'draft' | 'pending_review' | 'published' | 'rejected'): Promise<number> {
  try {
    let updatedCount = 0;
    
    for (const slug of slugs) {
      try {
        // Get the movie by slug
        const movie = await storage.getApiMovieBySlug(slug);
        if (!movie) {
          log(`Movie not found with slug: ${slug}`, 'phimapi');
          continue;
        }
        
        // Update the status
        await storage.updateApiMovie(movie.id, { 
          status, 
          updatedAt: new Date() 
        });
        
        updatedCount++;
      } catch (error) {
        log(`Error updating status for movie ${slug}: ${error}`, 'phimapi');
      }
    }
    
    return updatedCount;
  } catch (error) {
    log(`Error updating movie statuses: ${error}`, 'phimapi');
    throw error;
  }
}

/**
 * Publish movies that are in pending_review status
 * @param count Maximum number of movies to publish
 * @returns Number of movies published
 */
export async function publishMovies(count: number = 10): Promise<number> {
  try {
    log(`Attempting to publish up to ${count} movies`, 'phimapi');
    
    // Get movies that are in pending_review status
    const pendingMovies = await storage.getApiMovies(count, 0, 'pending_review');
    
    if (pendingMovies.length === 0) {
      log('No pending movies to publish', 'phimapi');
      return 0;
    }
    
    // Get the slugs
    const slugs = pendingMovies.map(movie => movie.slug);
    
    // Update their status to published
    const publishedCount = await updateMovieStatuses(slugs, 'published');
    
    log(`Published ${publishedCount} movies`, 'phimapi');
    return publishedCount;
  } catch (error) {
    log(`Error publishing movies: ${error}`, 'phimapi');
    throw error;
  }
}

/**
 * Unpublish (reject) published movies
 * @param slugs Array of movie slugs to unpublish
 * @returns Number of movies unpublished
 */
export async function unpublishMovies(slugs: string[]): Promise<number> {
  try {
    log(`Attempting to unpublish ${slugs.length} movies`, 'phimapi');
    
    // Update their status to rejected
    const unpublishedCount = await updateMovieStatuses(slugs, 'rejected');
    
    log(`Unpublished ${unpublishedCount} movies`, 'phimapi');
    return unpublishedCount;
  } catch (error) {
    log(`Error unpublishing movies: ${error}`, 'phimapi');
    throw error;
  }
}

/**
 * Delete movies completely from the database
 * @param slugs Array of movie slugs to delete
 * @returns Number of movies deleted
 */
export async function deleteMovies(slugs: string[]): Promise<number> {
  try {
    log(`Attempting to delete ${slugs.length} movies`, 'phimapi');
    
    let deletedCount = 0;
    
    for (const slug of slugs) {
      try {
        // Get the movie by slug
        const movie = await storage.getApiMovieBySlug(slug);
        if (!movie) {
          log(`Movie not found with slug: ${slug}`, 'phimapi');
          continue;
        }
        
        // Delete the movie
        await storage.deleteApiMovie(movie.id);
        
        deletedCount++;
      } catch (error) {
        log(`Error deleting movie ${slug}: ${error}`, 'phimapi');
      }
    }
    
    log(`Deleted ${deletedCount} movies`, 'phimapi');
    return deletedCount;
  } catch (error) {
    log(`Error deleting movies: ${error}`, 'phimapi');
    throw error;
  }
}