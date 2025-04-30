// Define types for phimapi.com API responses

export interface ApiMovieListItem {
  slug: string;
  name: string;
  origin_name: string;
  thumb_url: string;
  poster_url?: string;
  year: number;
  quality?: string;
  lang?: string;
  category?: string[];
  country?: string[];
  type?: string;
  view?: number;
  time?: string;
  episode_current?: string;
  episode_total?: string;
  timestamp?: number;
}

export interface ApiMovieListResponse {
  items: ApiMovieListItem[];
  paginate: {
    totalItems: number;
    totalItemsPerPage: number;
    currentPage: number;
    totalPages: number;
  };
}

export interface ApiMovieEpisode {
  slug: string;
  name: string;
  filename?: string;
  link_embed: string;
  link_m3u8?: string;
}

export interface ApiMovieDetail extends ApiMovieListItem {
  content: string;
  trailer_url?: string;
  actor?: string[];
  director?: string[];
  category?: string[];
  episodes: ApiMovieEpisode[];
}

export interface ApiMovieDetailResponse {
  movie: ApiMovieDetail;
}

// Cache control types
export interface CacheOptions {
  ttl?: number; // Time to live in seconds
}

// Movie data model that will be stored in our database
export interface MovieFromApi {
  slug: string;
  title: string;
  originalTitle: string;
  description: string;
  posterUrl: string;
  backdropUrl?: string;
  releaseYear: number;
  quality?: string;
  language?: string;
  categories: string[];
  countries: string[];
  type: string;
  views?: number;
  duration?: string;
  currentEpisode?: string;
  totalEpisodes?: string;
  trailerUrl?: string;
  actors?: string[];
  directors?: string[];
  embedUrl?: string; // Direct embed URL for streaming
  episodes: {
    slug: string;
    name: string;
    filename?: string;
    embedUrl: string;
    streamUrl?: string;
  }[];
  createdAt: Date;
  updatedAt: Date;
  lastCheckedAt: Date;
}