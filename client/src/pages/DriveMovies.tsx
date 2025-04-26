import { useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import Navbar from '@/components/Navbar';
import MobileNavBar from '@/components/MobileNavBar';
import { Play, FileVideo, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Movie } from '@/lib/constants';
import { apiRequest } from '@/lib/queryClient';

// Google Drive folder ID - from shared URL
// Using the folder shared by the user
// Note: If you want to use a different folder, you would replace this ID
const GOOGLE_DRIVE_FOLDER_ID = '10e9ynLaJdenTOQzuq3E9eoBM6JL5LDEF';

// Optional local sample data in case Google Drive doesn't work
const SAMPLE_MOVIES: Movie[] = [
  {
    id: 1001,
    title: "The Matrix",
    description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
    releaseYear: 1999,
    duration: 136,
    posterUrl: "https://m.media-amazon.com/images/I/613ypTLZHsL._AC_UF894,1000_QL80_.jpg",
    backdropUrl: "https://images.squarespace-cdn.com/content/v1/51b3dc8ee4b051b96ceb10de/1577219171446-OLHU5WPIC1YFFM9W38M1/image-asset.jpeg",
    rating: "R",
    matchPercentage: 92,
    videoSources: [{ quality: "HD", url: "/sample-video.mp4" }],
    genreIds: [1, 2], // Action, Sci-Fi
    director: "Lana & Lilly Wachowski",
    cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
    imdbRating: "8.7",
    viewCount: 123456
  }
];

export default function DriveMovies() {
  const { t } = useLanguage();
  
  // Format rating as string
  const formatRating = (rating?: string) => {
    if (!rating) return '';
    return rating.includes('.') ? rating : rating + '.0';
  };
  
  // Query to fetch movies from Google Drive via server endpoint
  const { data: movies = [], isLoading, error } = useQuery<Movie[], Error>({
    queryKey: ['driveMovies', GOOGLE_DRIVE_FOLDER_ID],
    queryFn: async () => {
      try {
        const res = await apiRequest('GET', `/api/drive/movies/${GOOGLE_DRIVE_FOLDER_ID}`);
        
        if (!res.ok) {
          // Try to get more detailed error information
          try {
            const errorData = await res.json();
            throw new Error(errorData.message || `Error: ${res.status}`);
          } catch (jsonError) {
            throw new Error(`Failed to fetch movies from Google Drive: ${res.status}`);
          }
        }
        
        return await res.json() as Movie[];
      } catch (err) {
        console.error('Error fetching drive movies:', err);
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1, // Only retry once
  });
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white">{t('loading.movies')}</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <h2 className="text-2xl font-bold text-white mb-2">{t('error.title')}</h2>
          <p className="text-gray-300 mb-4">
            {t('error.googleDrive')}
          </p>
          <div className="bg-gray-900 p-4 rounded-md text-sm text-left text-gray-400 mb-4 overflow-auto max-h-40">
            <p className="font-mono">
              {error instanceof Error ? error.message : String(error)}
            </p>
            <p className="mt-2 text-yellow-500">
              {t('drive.needAccess')}
            </p>
          </div>
          <div className="flex flex-col md:flex-row gap-3 justify-center">
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-red-600 hover:bg-red-700"
            >
              {t('actions.retry')}
            </Button>
            <Link href="/">
              <Button 
                variant="outline"
                className="border-gray-600 text-gray-300"
              >
                {t('actions.backHome')}
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="pt-4 px-4 md:px-8 max-w-[1400px] mx-auto">
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <FileVideo className="mr-2 h-6 w-6 text-red-600" />
            <h1 className="text-2xl md:text-3xl font-bold">{t('drive.title')}</h1>
          </div>
          <p className="text-gray-400 max-w-3xl">
            {t('drive.description')}
          </p>
        </div>
        
        {movies.length === 0 ? (
          <div>
            <div className="text-center py-10">
              <Film className="h-16 w-16 text-gray-600 mx-auto mb-4" />
              <h2 className="text-xl font-medium text-gray-300 mb-2">{t('drive.noMovies')}</h2>
              <p className="text-gray-500 max-w-md mx-auto mb-8">{t('drive.checkLink')}</p>
            </div>
            
            <div className="mt-8 border-t border-gray-800 pt-8">
              <h3 className="text-xl font-medium mb-4">{t('drive.sampleContent')}</h3>
              <p className="text-gray-400 mb-6">{t('drive.sampleDescription')}</p>
              
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {SAMPLE_MOVIES.map((movie: Movie) => (
                  <Link key={movie.id} href={`/movie/${movie.id}`}>
                    <div className="group relative cursor-pointer">
                      <div className="relative">
                        <img 
                          src={movie.posterUrl}
                          alt={movie.title}
                          className="w-full aspect-[2/3] object-cover rounded-sm"
                        />
                        <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs font-medium flex items-center">
                          <span className="text-yellow-500 mr-1">★</span>
                          <span>{formatRating(movie.imdbRating)}</span>
                        </div>
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="bg-white/80 rounded-full p-3">
                            <Play className="h-6 w-6 text-black fill-black" />
                          </div>
                        </div>
                      </div>
                      <h3 className="mt-1 text-sm font-medium truncate">{movie.title}</h3>
                      <p className="text-xs text-gray-400">{movie.releaseYear}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {movies.map((movie: Movie) => (
              <Link key={movie.id} href={`/movie/${movie.id}`}>
                <div className="group relative cursor-pointer">
                  <div className="relative">
                    <img 
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover rounded-sm"
                    />
                    {/* Rating Badge */}
                    <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs font-medium flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span>{formatRating(movie.imdbRating)}</span>
                    </div>
                    {/* Play Button */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/80 rounded-full p-3">
                        <Play className="h-6 w-6 text-black fill-black" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-1 text-sm font-medium truncate">{movie.title}</h3>
                  {movie.releaseYear && (
                    <p className="text-xs text-gray-400">{movie.releaseYear}</p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <MobileNavBar />
    </div>
  );
}