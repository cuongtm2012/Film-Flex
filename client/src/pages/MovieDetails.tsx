import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Play, Plus, Star } from "lucide-react";
import Navbar from "@/components/Navbar";
import { API_BASE_URL, Movie, formatDuration, getGenreNames } from "@/lib/constants";

const MovieDetails = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/movie/:id");
  const movieId = match ? parseInt(params.id) : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch movie details
  const { data: movie, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/movies/${movieId}`],
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

  // Get the highest quality video source
  const getVideoSource = (movie?: Movie) => {
    if (!movie?.videoSources || movie.videoSources.length === 0) {
      return '';
    }
    
    // Sort by quality (assuming higher numbers = better quality)
    const sortedSources = [...movie.videoSources].sort((a, b) => {
      const qualityA = parseInt(a.quality.replace('p', ''));
      const qualityB = parseInt(b.quality.replace('p', ''));
      return qualityB - qualityA;
    });
    
    return sortedSources[0].url;
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
      
      {/* Movie Title and Information */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-4xl font-bold mb-2">{movie.title}</h1>
        <div className="text-gray-400 text-sm mb-4">
          {movie.description.slice(0, 100)}...
        </div>
      </div>
      
      {/* Video Player */}
      <div className="relative max-w-7xl mx-auto bg-black mb-6">
        <div className="aspect-video w-full relative">
          {/* Video element */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={getVideoSource(movie)}
            poster={movie.backdropUrl}
            preload="auto"
          />
          
          {/* Play overlay with big centered play button */}
          {!isPlaying && (
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
          <div className="flex flex-col md:flex-row gap-8">
            {/* Movie Poster */}
            <div className="w-full md:w-1/4 flex-shrink-0">
              <img 
                src={movie.posterUrl}
                alt={movie.title}
                className="w-full aspect-[2/3] object-cover rounded-md shadow-lg"
              />
            </div>
            
            {/* Movie Details */}
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-4">About the Movie</h2>
              
              <p className="text-white/80 mb-6">
                {movie.description}
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8 mb-6">
                {movie.director && (
                  <div>
                    <h3 className="text-white/50 text-sm">Director</h3>
                    <p className="font-medium">{movie.director}</p>
                  </div>
                )}
                
                {movie.cast && movie.cast.length > 0 && (
                  <div>
                    <h3 className="text-white/50 text-sm">Cast</h3>
                    <p className="font-medium">{movie.cast.join(", ")}</p>
                  </div>
                )}
              </div>
              
              <button className="flex items-center bg-red-600 hover:bg-red-700 rounded px-5 py-2 text-white font-medium transition">
                <Plus className="mr-2 h-5 w-5" /> Add to My List
              </button>
            </div>
          </div>
        </div>
        
        {/* Categories/Hashtags */}
        <div className="mb-10">
          <h2 className="text-xl font-bold mb-3">Categories</h2>
          <div className="flex flex-wrap gap-2">
            {getGenreNames(movie.genreIds).map((genre, index) => (
              <span 
                key={index} 
                className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white/80 text-sm cursor-pointer transition-colors"
              >
                #{genre.replace(/\s+/g, '')}
              </span>
            ))}
          </div>
        </div>
        
        {/* Recommended Films */}
        {similarMovies.length > 0 && (
          <div className="mb-16">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Recommended Films</h2>
              <button className="text-white/70 hover:text-white text-sm">
                See All →
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similarMovies.map(similarMovie => (
                <div 
                  key={similarMovie.id}
                  className="cursor-pointer"
                  onClick={() => setLocation(`/movie/${similarMovie.id}`)}
                >
                  <div className="relative">
                    <img 
                      src={similarMovie.posterUrl}
                      alt={similarMovie.title}
                      className="w-full aspect-[2/3] object-cover rounded"
                    />
                    <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs font-medium flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span>{similarMovie.imdbRating || '0.0'}</span>
                    </div>
                  </div>
                  <h3 className="mt-1 text-sm font-medium whitespace-nowrap overflow-hidden text-ellipsis">
                    {similarMovie.title}
                  </h3>
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
