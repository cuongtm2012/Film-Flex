import axios from 'axios';
import { ApiMovieListResponse, ApiMovieDetailResponse } from './types';
import { log } from '../../vite';

// Configure base URL and timeouts
const apiClient = axios.create({
  baseURL: 'https://phimapi.com',
  timeout: 15000, // 15 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'User-Agent': 'FilmFlex/1.0'
  }
});

// Add request interceptor for logging and throttling
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 1000; // Minimum 1 second between requests to avoid rate limiting

apiClient.interceptors.request.use(async (config) => {
  // Simple rate limiting to avoid getting blocked
  const now = Date.now();
  const timeElapsed = now - lastRequestTime;
  
  if (timeElapsed < MIN_REQUEST_INTERVAL) {
    // Wait if needed
    const waitTime = MIN_REQUEST_INTERVAL - timeElapsed;
    log(`Rate limiting: waiting ${waitTime}ms before next request`, 'phimapi');
    await new Promise(resolve => setTimeout(resolve, waitTime));
  }
  
  lastRequestTime = Date.now();
  log(`Making request to ${config.url}`, 'phimapi');
  return config;
});

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  response => response,
  error => {
    if (error.response) {
      log(`API Error: ${error.response.status} - ${JSON.stringify(error.response.data)}`, 'phimapi');
    } else if (error.request) {
      log(`API Request Error: ${error.message}`, 'phimapi');
    } else {
      log(`API Config Error: ${error.message}`, 'phimapi');
    }
    
    // Implement retry logic here if needed
    return Promise.reject(error);
  }
);

/**
 * Fetch a list of movies by page
 * @param page Page number (starting from 1)
 * @returns Promise with the movie list data
 */
export async function fetchMovieList(page = 1): Promise<ApiMovieListResponse> {
  try {
    const response = await apiClient.get(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
    return response.data;
  } catch (error) {
    log(`Failed to fetch movie list page ${page}`, 'phimapi');
    throw error;
  }
}

/**
 * Fetch detailed movie information by slug
 * @param slug Movie slug identifier
 * @returns Promise with the detailed movie data
 */
export async function fetchMovieDetail(slug: string): Promise<ApiMovieDetailResponse> {
  try {
    const response = await apiClient.get(`/phim/${slug}`);
    return response.data;
  } catch (error) {
    log(`Failed to fetch movie detail for slug ${slug}`, 'phimapi');
    throw error;
  }
}

/**
 * Retry a function with exponential backoff
 * @param fn Function to retry
 * @param retries Number of retries
 * @param delay Initial delay in ms
 * @returns Promise with the function result
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries === 0) throw error;
    
    log(`Retrying after ${delay}ms, ${retries} attempts left`, 'phimapi');
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return withRetry(fn, retries - 1, delay * 2);
  }
}