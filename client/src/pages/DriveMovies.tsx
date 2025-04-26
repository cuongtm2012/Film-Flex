import { useEffect, useState } from 'react';
import { Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useLanguage } from '@/hooks/use-language';
import Navbar from '@/components/Navbar';
import MobileNavBar from '@/components/MobileNavBar';
import { Play, FileVideo, Film } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { getDriveFolderContent, DriveFile, convertDriveFileToMovie } from '@/lib/googleDriveService';
import { Movie } from '@/lib/constants';

// Google Drive folder ID - from shared URL
const GOOGLE_DRIVE_FOLDER_ID = '1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN';

export default function DriveMovies() {
  const { t } = useLanguage();
  const [movies, setMovies] = useState<Movie[]>([]);
  
  // Format rating as string
  const formatRating = (rating?: string) => {
    if (!rating) return '';
    return rating.includes('.') ? rating : rating + '.0';
  };
  
  // Query to fetch movies from Google Drive
  const { data: driveData, isLoading, error } = useQuery({
    queryKey: ['googleDrive', GOOGLE_DRIVE_FOLDER_ID],
    queryFn: () => getDriveFolderContent(GOOGLE_DRIVE_FOLDER_ID),
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
  
  // Process drive files into movie objects
  useEffect(() => {
    if (driveData && driveData.files && driveData.files.length > 0) {
      const processedMovies = driveData.files.map(file => convertDriveFileToMovie(file));
      setMovies(processedMovies);
    }
  }, [driveData]);
  
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
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">{t('error.title')}</h2>
          <p className="text-gray-300">
            {t('error.googleDrive')}
          </p>
          <div className="mt-4">
            <Button onClick={() => window.location.reload()} className="bg-red-600 hover:bg-red-700">
              {t('actions.retry')}
            </Button>
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
          <div className="text-center py-20">
            <Film className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-medium text-gray-300 mb-2">{t('drive.noMovies')}</h2>
            <p className="text-gray-500 max-w-md mx-auto">{t('drive.checkLink')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {movies.map((movie) => (
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