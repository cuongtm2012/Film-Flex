import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Download, Plus, Star, Eye } from "lucide-react";
import Navbar from "@/components/Navbar";
import MobileNavBar from "@/components/MobileNavBar";
import { API_BASE_URL, Movie, formatDuration, getGenreNames, getGenresString } from "@/lib/constants";

const MovieDetails = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/movie/:id");
  const movieId = match ? parseInt(params.id) : null;
  
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
        .slice(0, 6); // Limit to 6 movies
      
      setSimilarMovies(filtered);
    }
  }, [movie, allMovies]);
  
  const handleClose = () => {
    setLocation("/");
  };
  
  const handlePlay = () => {
    if (movie) {
      setLocation(`/watch/${movie.id}`);
    }
  };

  // Format view count
  const formatViewCount = (count?: number) => {
    if (!count) return "0 views";
    return count >= 1000 
      ? `${(count / 1000).toFixed(1)}K views` 
      : `${count} views`;
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914] mx-auto mb-4"></div>
          <p className="text-white">Loading movie details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Movie Not Found</h2>
          <p className="text-gray-300">
            We couldn't find the movie you're looking for. Please try another one.
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-[#E50914] text-white rounded"
            onClick={() => setLocation("/")}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      <div className="h-full overflow-y-auto pb-16">
        {/* Header Navigation */}
        <div className="sticky top-0 bg-gradient-to-b from-black to-transparent z-50 p-4">
          <button className="text-white" onClick={handleClose}>
            <ArrowLeft className="h-6 w-6" />
          </button>
        </div>
        
        {/* Hero Section */}
        <div className="relative">
          <div className="w-full aspect-video md:aspect-[2.1/1]">
            <img 
              src={movie.backdropUrl}
              alt={`${movie.title} backdrop`}
              className="w-full h-full object-cover brightness-75"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-transparent"></div>
          </div>
          
          {/* Movie Info Overlay */}
          <div className="px-4 md:px-8 -mt-32 relative z-10">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="hidden md:block w-[200px] h-[300px] flex-shrink-0">
                <img 
                  src={movie.posterUrl}
                  alt={`${movie.title} poster`}
                  className="w-full h-full object-cover rounded-md shadow-lg"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{movie.title}</h1>
                
                {/* Movie stats row */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-3">
                  <div className="flex items-center text-yellow-500">
                    <Star className="fill-yellow-500 h-4 w-4 mr-1" />
                    <span className="font-bold">{movie.imdbRating || '0'}</span>
                  </div>
                  
                  <div className="flex items-center text-gray-300">
                    <Eye className="h-4 w-4 mr-1" />
                    <span>{formatViewCount(movie.viewCount)}</span>
                  </div>
                  
                  <span className="text-gray-300">{movie.releaseYear}</span>
                  <span className="border border-gray-600 px-1 text-xs">{movie.rating}</span>
                  <span className="text-gray-300">{formatDuration(movie.duration)}</span>
                </div>
                
                {/* Cast info */}
                {movie.cast && movie.cast.length > 0 && (
                  <div className="mb-3">
                    <p className="text-gray-300 font-medium">
                      {movie.cast.slice(0, 3).join(", ")}
                    </p>
                  </div>
                )}
                
                {/* Action buttons */}
                <div className="flex space-x-3 mb-6">
                  <button 
                    className="flex items-center bg-[#E50914] hover:bg-[#B81D24] rounded px-6 py-2 text-white font-medium transition"
                    onClick={handlePlay}
                  >
                    <Play className="mr-2 h-5 w-5" /> Play
                  </button>
                  <button className="flex items-center bg-[#6D6D6D] bg-opacity-60 hover:bg-opacity-80 rounded px-6 py-2 text-white font-medium transition">
                    <Plus className="mr-2 h-5 w-5" /> My List
                  </button>
                </div>
                
                {/* Movie description */}
                <p className="text-gray-300 max-w-3xl mb-4">
                  {movie.description}
                </p>
                
                {/* Director info */}
                {movie.director && (
                  <p className="text-gray-300 mb-1">
                    <span className="text-gray-500">Director:</span> {movie.director}
                  </p>
                )}
                
                {/* Genres display */}
                <div className="flex flex-wrap gap-2 mt-3">
                  {getGenreNames(movie.genreIds).map((genre, index) => (
                    <span key={index} className="px-3 py-1 bg-[#222] rounded-full text-gray-300 text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* More Like This Section */}
        {similarMovies.length > 0 && (
          <div className="px-4 md:px-8 py-6">
            <h2 className="text-xl font-bold text-white mb-4">More Like This</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similarMovies.map(similarMovie => (
                <div 
                  key={similarMovie.id}
                  className="cursor-pointer"
                  onClick={() => setLocation(`/movie/${similarMovie.id}`)}
                >
                  <div className="relative group">
                    <img 
                      src={similarMovie.posterUrl}
                      alt={`${similarMovie.title} poster`}
                      className="rounded-t w-full aspect-[2/3] object-cover"
                    />
                    <div className="absolute inset-0 bg-black bg-opacity-40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <Play className="h-12 w-12 text-white opacity-80" />
                    </div>
                  </div>
                  <div className="bg-[#181818] rounded-b p-2">
                    <h3 className="text-white font-medium text-sm truncate">{similarMovie.title}</h3>
                    <div className="flex justify-between items-center mt-1">
                      <div className="flex items-center text-yellow-500 text-xs">
                        <Star className="fill-yellow-500 h-3 w-3 mr-1" />
                        <span>{similarMovie.imdbRating || '-'}</span>
                      </div>
                      <span className="text-gray-400 text-xs">{similarMovie.releaseYear}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <MobileNavBar />
    </div>
  );
};

export default MovieDetails;
