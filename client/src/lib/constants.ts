export const API_BASE_URL = "/api";

export const MOVIE_GENRES = [
  { id: 1, name: "Action" },
  { id: 2, name: "Adventure" },
  { id: 3, name: "Comedy" },
  { id: 4, name: "Drama" },
  { id: 5, name: "Horror" },
  { id: 6, name: "Science Fiction" },
  { id: 7, name: "Thriller" },
  { id: 8, name: "Documentary" },
  { id: 9, name: "Animation" }
];

export type VideoSource = {
  quality: string;
  url: string;
};

export interface Movie {
  id: number;
  title: string;
  description: string;
  releaseYear: number;
  duration: number; // in minutes
  posterUrl: string;
  backdropUrl: string;
  rating: string; // e.g., "PG-13", "R"
  matchPercentage?: number; // e.g., 97
  videoSources: VideoSource[];
  videoUrl?: string; // Direct URL or Google Drive file ID
  genreIds: number[];
  director?: string;
  cast?: string[];
  imdbRating?: string;
  viewCount?: number;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (hours > 0) {
    return `${hours}h ${mins}m`;
  }
  
  return `${mins}m`;
}

export function getGenreNames(genreIds: number[]): string[] {
  return genreIds
    .map(id => MOVIE_GENRES.find(genre => genre.id === id)?.name ?? "")
    .filter(name => name !== "");
}

export function getGenresString(genreIds: number[]): string {
  return getGenreNames(genreIds).join(", ");
}
