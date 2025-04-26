import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Play, Plus, Star, Film } from "lucide-react";
import Navbar from "@/components/Navbar";
import GoogleDriveAuth from "@/components/GoogleDriveAuth";
import { API_BASE_URL, Movie, formatDuration, getGenreNames } from "@/lib/constants";
import { convertToDirectStreamingUrl, isGoogleDriveUrl } from "@/lib/googleDriveApi";
import { getDriveVideoStreamingUrl, isValidDriveFileId, extractDriveFileId } from "@/lib/driveHelper";
import { useToast } from "@/hooks/use-toast";

const MovieDetails = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/movie/:id");
  const movieId = match ? parseInt(params.id) : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch movie details
  const { data: movie, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/movie/${movieId}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movieId,
  });
  
  // Fetch similar movies (same genres)
  const { data: allMovies } = useQuery({
    queryKey: [`${API_BASE_URL}/movies`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  
  useEffect(() => {
    if (movie && allMovies) {
      // Find movies with similar genres
      const filtered = allMovies
        .filter((m: Movie) => 
          m.id !== movie.id && // Exclude current movie
          m.genreIds.some(genre => movie.genreIds.includes(genre)) // Must have at least one matching genre
        )
        .slice(0, 5); // Limit to 5 movies
      
      setSimilarMovies(filtered);
    }
  }, [movie, allMovies]);
  
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  // Track authentication state
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false);
  const { toast } = useToast();
  
  // Handle Google Drive auth success
  const handleAuthSuccess = () => {
    setNeedsGoogleAuth(false);
    toast({
      title: "Authentication successful",
      description: "Loading movie from Google Drive...",
    });
    // Reload the video source after authentication
    if (movie) {
      loadVideoSource(movie);
    }
  };
  
  // Load video source function that can be called from multiple places
  const loadVideoSource = async (movieData: Movie) => {
    setIsLoadingVideo(true);
    try {
      const source = await getVideoSource(movieData);
      setVideoSrc(source);
      setNeedsGoogleAuth(false);
    } catch (error: any) {
      console.error('Error loading video source:', error);
      
      // Check if this is an authentication error
      if (error.message && error.message.includes('Authentication required')) {
        setNeedsGoogleAuth(true);
        toast({
          title: "Authentication Required",
          description: "Please sign in with Google to play this movie",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Playback Error",
          description: "Failed to load video. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingVideo(false);
    }
  };
  
  // Load video source when movie data changes
  useEffect(() => {
    if (!movie) return;
    loadVideoSource(movie);
  }, [movie]);
  
  // Get video source with Google Drive integration
  const getVideoSource = async (movie: Movie) => {
    // Try with development mode helper function first, which will handle all the authentication for us
    try {
      // This will handle authentication and return a valid URL in development mode
      // Pass an empty string for a fallback since we'll provide a backup later if all fails
      if (movie.videoUrl) {
        // Case 1: Direct Google Drive file ID
        if (isValidDriveFileId(movie.videoUrl)) {
          return await getDriveVideoStreamingUrl(movie.videoUrl);
        }
        
        // Case 2: Google Drive URL that needs extraction
        const fileId = extractDriveFileId(movie.videoUrl);
        if (fileId) {
          return await getDriveVideoStreamingUrl(fileId);
        }
        
        // Case 3: Direct video URL (not Google Drive)
        if (movie.videoUrl.startsWith('http')) {
          return movie.videoUrl;
        }
      }
    } catch (error) {
      console.error('Error processing Google Drive videoUrl:', error);
      // Fall through to traditional sources if Google Drive fails
    }
    
    // Second priority: Check traditional videoSources
    if (movie.videoSources && movie.videoSources.length > 0) {
      try {
        // Sort by quality (assuming higher numbers = better quality)
        const sortedSources = [...movie.videoSources].sort((a, b) => {
          const qualityA = parseInt(a.quality.replace('p', '')) || 0;
          const qualityB = parseInt(b.quality.replace('p', '')) || 0;
          return qualityB - qualityA;
        });
        
        // Convert to direct streaming URL if it's a Google Drive link
        const sourceUrl = sortedSources[0].url;
        if (isGoogleDriveUrl(sourceUrl)) {
          try {
            // Use our development-mode friendly function for Google Drive URLs
            const fileId = extractDriveFileId(sourceUrl);
            if (fileId) {
              return await getDriveVideoStreamingUrl(fileId);
            }
            return convertToDirectStreamingUrl(sourceUrl);
          } catch (e) {
            console.error('Error converting Google Drive URL:', e);
            return sourceUrl; // Use original URL as fallback
          }
        }
        
        return sourceUrl;
      } catch (error) {
        console.error('Error processing videoSources:', error);
      }
    }
    
    // Ultimate fallback for development mode: use the BigBuckBunny sample
    try {
      // Get a sample URL from the development mode helper
      return await getDriveVideoStreamingUrl('development-fallback');
    } catch (e) {
      console.warn('Failed to get development fallback video');
    }
    
    // Fallback: No valid source found
    console.warn('No valid video source found for movie:', movie.title);
    return '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white">Loading movie details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Movie Not Found</h2>
          <p className="text-gray-300">
            We couldn't find the movie you're looking for. Please try another one.
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            onClick={() => setLocation("/")}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Movie Title */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-4xl font-bold mb-4">{movie.title}</h1>
      </div>
      
      {/* Video Player */}
      <div className="relative max-w-7xl mx-auto bg-black mb-6">
        <div className="aspect-video w-full relative">
          {/* Loading state */}
          {isLoadingVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-white">Preparing video stream...</p>
              </div>
            </div>
          )}
          
          {/* Google Drive Auth Overlay */}
          {needsGoogleAuth && !isLoadingVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
              <div className="text-center max-w-md p-8 bg-zinc-900 rounded-lg shadow-xl">
                <Film className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Google Drive Authentication Required</h3>
                <p className="text-gray-300 mb-6">
                  This movie is hosted on Google Drive. Please authenticate to access the content.
                </p>
                <GoogleDriveAuth 
                  onSuccess={handleAuthSuccess} 
                  size="lg"
                  className="mx-auto" 
                />
              </div>
            </div>
          )}
          
          {/* Video element */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={videoSrc}
            poster={movie.backdropUrl}
            preload="auto"
          />
          
          {/* Play overlay with big centered play button */}
          {!isPlaying && !isLoadingVideo && !needsGoogleAuth && videoSrc && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="text-8xl text-white/90 select-none">
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-black/30">
                  <Play className="h-12 w-12 fill-white text-white" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-40 font-light">
                  PLAY VIDEO
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        {/* Video Stats */}
        <div className="mb-8">
          <div className="flex gap-2 text-sm">
            <div className="py-1 px-2 bg-red-600 rounded-sm">#1</div>
            <div className="py-1 px-2 bg-zinc-800 rounded-sm">#2</div>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <div className="flex items-center">
              <Star className="text-yellow-500 fill-yellow-500 h-5 w-5 mr-1" />
              <span className="font-semibold">{movie.imdbRating || '0.0'}</span>
            </div>
            <span>{movie.releaseYear}</span>
            <span>{formatDuration(movie.duration)}</span>
            <span className="border border-white/30 px-2 py-0.5">{movie.rating}</span>
          </div>
        </div>
      
        {/* About the Movie Section */}
        <div className="mb-10">
          <article className="bg-zinc-900/40 p-6 rounded-lg">
            {/* Movie Details */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white">About the Movie</h2>
              
              <p className="text-white/80 mb-6 leading-relaxed text-base">
                {movie.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {movie.director && (
                  <span className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white/90 text-sm font-medium cursor-pointer transition-all hover:shadow-md hover:shadow-red-900/20">
                    #{movie.director.replace(/\s+/g, '')}
                  </span>
                )}
                
                {movie.cast && movie.cast.length > 0 && (
                  <>
                    {movie.cast.map((actor, index) => (
                      <span 
                        key={index}
                        className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white/90 text-sm font-medium cursor-pointer transition-all hover:shadow-md hover:shadow-red-900/20"
                      >
                        #{actor.replace(/\s+/g, '')}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </article>
        </div>
        
        {/* Recommended Films */}
        {similarMovies.length > 0 && (
          <div className="mb-16">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recommended Films</h2>
              <button className="text-white/70 hover:text-white text-sm flex items-center gap-1 hover:gap-2 transition-all duration-300">
                See All <span className="text-red-500">→</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {similarMovies.map(similarMovie => (
                <div 
                  key={similarMovie.id}
                  className="group cursor-pointer transition-all duration-300"
                  onClick={() => setLocation(`/movie/${similarMovie.id}`)}
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <img 
                      src={similarMovie.posterUrl}
                      alt={`${similarMovie.title} movie poster`}
                      className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-xs font-medium flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span>{similarMovie.imdbRating || '0.0'}</span>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <h3 className="text-sm font-medium text-white leading-tight">
                        {similarMovie.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
