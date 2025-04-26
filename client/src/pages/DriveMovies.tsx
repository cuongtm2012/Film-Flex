import React, { useState, useEffect } from 'react';
import { listDriveVideos, getDriveThumbnailUrl, isUserAuthenticated } from '@/lib/driveHelper';
import GoogleDriveAuth from '@/components/GoogleDriveAuth';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'wouter';
import { Movie } from '@shared/schema';
import { Loader2, Film, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

// Source folder ID for movies - from user specifications
const DRIVE_FOLDER_ID = '1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN';

interface DriveMovie {
  id: string;
  name: string;
  thumbnailLink: string;
  createdTime: string;
  mimeType: string;
  size?: string;
}

const DriveMovies = () => {
  const [movies, setMovies] = useState<DriveMovie[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(isUserAuthenticated());
  const { toast } = useToast();

  // Load movies from Google Drive
  const loadDriveMovies = async () => {
    if (!isAuthenticated) {
      setError('Please authenticate with Google Drive to view movies');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const files = await listDriveVideos(DRIVE_FOLDER_ID);
      setMovies(files as DriveMovie[]);
      
      if (files.length === 0) {
        toast({
          title: "No videos found",
          description: "No video files were found in the specified Drive folder.",
        });
      }
    } catch (error) {
      console.error('Error loading Drive movies:', error);
      setError('Failed to load movies from Google Drive');
      toast({
        title: "Error",
        description: "Failed to load movies from Google Drive. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Initial load if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadDriveMovies();
    }
  }, [isAuthenticated]);

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setIsAuthenticated(true);
    loadDriveMovies();
  };

  // Filter movies based on search query
  const filteredMovies = movies.filter(movie => 
    movie.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Extract movie title from filename
  const parseMovieTitle = (filename: string) => {
    // Remove file extension
    const withoutExtension = filename.replace(/\.[^/.]+$/, "");
    
    // Remove special characters and clean up the title
    return withoutExtension
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  };

  // Convert Drive file to Movie object for the WatchMovie page
  const convertToMovie = (driveMovie: DriveMovie): Movie => {
    const title = parseMovieTitle(driveMovie.name);
    return {
      id: 0, // Temporary ID, will be overridden by URL parameter
      title,
      description: `Watch "${title}" from Google Drive`,
      releaseYear: new Date(driveMovie.createdTime).getFullYear(),
      duration: 90, // Default duration (not available from Drive API)
      videoUrl: driveMovie.id, // Store the Drive file ID directly
      posterUrl: getDriveThumbnailUrl(driveMovie.id),
      backdropUrl: getDriveThumbnailUrl(driveMovie.id),
      rating: 'PG-13', // Default rating
      genreIds: [], // Empty array for genres
      videoSources: [{ quality: '1080p', url: driveMovie.id }], // Required field
      director: null,
      cast: null,
      imdbRating: null,
      matchPercentage: null,
      viewCount: 0
    };
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
          <h1 className="text-3xl font-bold mb-2">Google Drive Movies</h1>
          <p className="text-muted-foreground mb-4">
            Browse and watch movies directly from your Google Drive
          </p>
        </div>
        
        <GoogleDriveAuth
          onSuccess={handleAuthSuccess}
          variant="outline"
          className="mb-4 md:mb-0"
        />
      </div>

      {isAuthenticated ? (
        <>
          <div className="flex items-center mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search movies..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline" 
              className="ml-2"
              onClick={loadDriveMovies}
              disabled={isLoading}
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
            </Button>
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="bg-destructive/10 text-destructive p-4 rounded-md">
              <p>{error}</p>
            </div>
          ) : filteredMovies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredMovies.map(movie => {
                const movieObj = convertToMovie(movie);
                return (
                  <Link key={movie.id} href={`/watch/${movie.id}`}>
                    <div className="group cursor-pointer overflow-hidden rounded-lg shadow-md hover:shadow-xl transition-all duration-300">
                      <div className="relative aspect-video bg-muted overflow-hidden">
                        {movie.thumbnailLink ? (
                          <img 
                            src={movie.thumbnailLink}
                            alt={movie.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted-foreground/20">
                            <Film className="h-12 w-12 text-muted-foreground" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <div className="absolute bottom-2 left-2 right-2">
                            <div className="bg-primary text-primary-foreground text-xs py-1 px-2 rounded inline-block">
                              Drive
                            </div>
                          </div>
                        </div>
                      </div>
                      <div className="p-3">
                        <h3 className="font-medium line-clamp-1 text-sm group-hover:text-primary transition-colors">
                          {parseMovieTitle(movie.name)}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(movie.createdTime).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-20">
              <Film className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-medium">No movies found</h3>
              <p className="text-muted-foreground mt-2">
                {searchQuery 
                  ? "Try a different search term" 
                  : "No videos found in this Google Drive folder"}
              </p>
            </div>
          )}
        </>
      ) : (
        <div className="bg-card rounded-lg p-8 max-w-md mx-auto text-center shadow-sm">
          <Film className="h-12 w-12 mx-auto mb-4 text-primary" />
          <h2 className="text-xl font-bold mb-2">Authentication Required</h2>
          <p className="text-muted-foreground mb-6">
            Please authenticate with Google Drive to browse and watch movies.
          </p>
          <GoogleDriveAuth onSuccess={handleAuthSuccess} />
        </div>
      )}
    </div>
  );
};

export default DriveMovies;