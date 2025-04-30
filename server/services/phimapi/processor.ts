import { ApiMovieListItem, ApiMovieDetail, MovieFromApi } from './types';
import { log } from '../../vite';

/**
 * Convert API movie detail to our internal data model
 * @param movieDetail Movie detail from API
 * @returns Converted movie data
 */
export function processMovieDetail(movieDetail: ApiMovieDetail, episodesData?: any[]): MovieFromApi {
  const now = new Date();
  
  try {
    // Process episodes data from the response
    const processedEpisodes = [];
    
    // If episodes are provided as a separate parameter (from the API response)
    if (episodesData && Array.isArray(episodesData)) {
      // Flatten the episode data from all servers
      for (const serverData of episodesData) {
        if (serverData.server_data && Array.isArray(serverData.server_data)) {
          for (const episode of serverData.server_data) {
            processedEpisodes.push({
              slug: episode.slug,
              name: episode.name,
              filename: episode.filename,
              embedUrl: episode.link_embed,
              streamUrl: episode.link_m3u8
            });
          }
        }
      }
      
      log(`Processed ${processedEpisodes.length} episodes from external episodes data for ${movieDetail.slug}`, 'phimapi');
    } 
    // Fallback to episodes in the movie object if available
    else if (movieDetail.episodes && Array.isArray(movieDetail.episodes)) {
      for (const episode of movieDetail.episodes) {
        processedEpisodes.push({
          slug: episode.slug,
          name: episode.name,
          filename: episode.filename,
          embedUrl: episode.link_embed,
          streamUrl: episode.link_m3u8
        });
      }
      
      log(`Processed ${processedEpisodes.length} episodes from movie object for ${movieDetail.slug}`, 'phimapi');
    } else {
      log(`No episodes found for ${movieDetail.slug}`, 'phimapi');
    }
    
    // Extract embed URL from first episode if available
    let primaryEmbedUrl = '';
    if (processedEpisodes.length > 0 && processedEpisodes[0].embedUrl) {
      primaryEmbedUrl = processedEpisodes[0].embedUrl;
      log(`Found primary embed URL for ${movieDetail.slug}: ${primaryEmbedUrl}`, 'phimapi');
    }
    
    // Transform the data
    const processed: MovieFromApi = {
      slug: movieDetail.slug,
      title: movieDetail.name,
      originalTitle: movieDetail.origin_name,
      description: movieDetail.content || '',
      posterUrl: movieDetail.thumb_url,
      backdropUrl: movieDetail.poster_url,
      releaseYear: movieDetail.year,
      quality: movieDetail.quality,
      language: movieDetail.lang,
      categories: movieDetail.category || [],
      countries: movieDetail.country || [],
      type: movieDetail.type || 'movie',
      views: movieDetail.view,
      duration: movieDetail.time,
      currentEpisode: movieDetail.episode_current,
      totalEpisodes: movieDetail.episode_total,
      trailerUrl: movieDetail.trailer_url,
      actors: movieDetail.actor,
      directors: movieDetail.director,
      episodes: processedEpisodes,
      embedUrl: primaryEmbedUrl, // Store the primary embed URL directly
      createdAt: now,
      updatedAt: now,
      lastCheckedAt: now
    };
    
    return processed;
  } catch (error) {
    log(`Error processing movie detail: ${error}`, 'phimapi');
    throw error;
  }
}

/**
 * Extract slugs from movie list
 * @param movieList List of movies from API
 * @returns Array of slugs
 */
export function extractSlugs(movieList: ApiMovieListItem[]): string[] {
  return movieList.map(movie => movie.slug);
}

/**
 * Create a slim movie object from list item (without full details)
 * @param movieItem Movie list item
 * @returns Slim movie object
 */
export function createSlimMovie(movieItem: ApiMovieListItem): Partial<MovieFromApi> {
  const now = new Date();
  
  return {
    slug: movieItem.slug,
    title: movieItem.name,
    originalTitle: movieItem.origin_name,
    posterUrl: movieItem.thumb_url,
    backdropUrl: movieItem.poster_url,
    releaseYear: movieItem.year,
    quality: movieItem.quality,
    language: movieItem.lang,
    categories: movieItem.category || [],
    countries: movieItem.country || [],
    type: movieItem.type || 'movie',
    views: movieItem.view,
    duration: movieItem.time,
    currentEpisode: movieItem.episode_current,
    totalEpisodes: movieItem.episode_total,
    createdAt: now,
    updatedAt: now,
    lastCheckedAt: now
  };
}