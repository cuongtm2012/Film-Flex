import { log } from '../../vite';
import { CacheOptions, MovieFromApi } from './types';

// Simple in-memory cache for development
// In production, this would be replaced with Redis or another distributed cache
const cache: Record<string, { data: any; expiry: number }> = {};

// Default TTL: 1 hour
const DEFAULT_TTL = 60 * 60;

/**
 * Get item from cache
 * @param key Cache key
 * @returns Cached data or null if not found/expired
 */
export function getCachedItem<T>(key: string): T | null {
  const item = cache[key];
  
  if (!item) {
    return null;
  }
  
  const now = Date.now();
  
  if (item.expiry < now) {
    // Item expired, remove it
    log(`Cache item ${key} expired`, 'cache');
    delete cache[key];
    return null;
  }
  
  log(`Cache hit for ${key}`, 'cache');
  return item.data as T;
}

/**
 * Store item in cache
 * @param key Cache key
 * @param data Data to cache
 * @param options Cache options
 */
export function setCachedItem<T>(key: string, data: T, options?: CacheOptions): void {
  const ttl = options?.ttl || DEFAULT_TTL;
  const expiry = Date.now() + (ttl * 1000);
  
  cache[key] = {
    data,
    expiry
  };
  
  log(`Cached item ${key} with TTL ${ttl}s`, 'cache');
}

/**
 * Remove item from cache
 * @param key Cache key
 */
export function removeCachedItem(key: string): void {
  if (cache[key]) {
    delete cache[key];
    log(`Removed item ${key} from cache`, 'cache');
  }
}

/**
 * Cache a movie by slug
 * @param movie Movie data
 * @param options Cache options
 */
export function cacheMovie(movie: MovieFromApi, options?: CacheOptions): void {
  const key = `movie:${movie.slug}`;
  setCachedItem(key, movie, options);
}

/**
 * Get cached movie by slug
 * @param slug Movie slug
 * @returns Cached movie or null
 */
export function getCachedMovie(slug: string): MovieFromApi | null {
  const key = `movie:${slug}`;
  return getCachedItem<MovieFromApi>(key);
}

/**
 * Cache a list of movie slugs
 * @param slugs List of slugs
 * @param page Page number
 * @param options Cache options
 */
export function cacheMovieSlugs(slugs: string[], page: number, options?: CacheOptions): void {
  const key = `movie:list:page:${page}`;
  setCachedItem(key, slugs, options);
}

/**
 * Get cached movie slugs by page
 * @param page Page number
 * @returns Cached slugs or null
 */
export function getCachedMovieSlugs(page: number): string[] | null {
  const key = `movie:list:page:${page}`;
  return getCachedItem<string[]>(key);
}

/**
 * Clear expired items from cache
 */
export function clearExpiredCache(): void {
  const now = Date.now();
  let cleared = 0;
  
  Object.keys(cache).forEach(key => {
    if (cache[key].expiry < now) {
      delete cache[key];
      cleared++;
    }
  });
  
  if (cleared > 0) {
    log(`Cleared ${cleared} expired items from cache`, 'cache');
  }
}

// Run cache cleanup every 5 minutes
setInterval(clearExpiredCache, 5 * 60 * 1000);