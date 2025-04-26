import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Plus, Star, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import { API_BASE_URL, Movie, formatDuration, getGenreNames } from "@/lib/constants";

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
        .slice(0, 5); // Limit to 5 movies
      
      setSimilarMovies(filtered);
    }
  }, [movie, allMovies]);
  
  const handleBack = () => {
    setLocation("/");
  };
  
  const handlePlay = () => {
    if (movie) {
      setLocation(`/watch/${movie.id}`);
    }
  };

  // Format rating as string
  const formatRating = (rating?: string) => {
    if (!rating) return '0.0';
    return rating.includes('.') ? rating : rating + '.0';
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
            onClick={handleBack}
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
      
      {/* 1. Header Section */}
      <header className="relative">
        <div className="w-full h-[50vh] md:h-[60vh] relative">
          <img 
            src={movie.backdropUrl}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/20"></div>
          
          <div className="absolute bottom-0 left-0 right-0 p-6 md:p-10">
            <div className="max-w-5xl mx-auto">
              <h1 className="text-4xl md:text-6xl font-bold mb-2">{movie.title}</h1>
              <div className="flex items-center space-x-3 text-sm md:text-base mb-4">
                <div className="flex items-center bg-black/70 px-2 py-1 rounded">
                  <Star className="text-yellow-500 fill-yellow-500 h-4 w-4 mr-1" />
                  <span>{formatRating(movie.imdbRating)}</span>
                </div>
                <span>{movie.releaseYear}</span>
                <span>{formatDuration(movie.duration)}</span>
                <span className="border border-white/30 px-1">{movie.rating}</span>
              </div>
              
              {/* Play Button */}
              <button 
                onClick={handlePlay}
                className="flex items-center bg-white hover:bg-white/90 text-black rounded px-8 py-3 font-medium transition-colors"
              >
                <Play className="mr-2 h-5 w-5 fill-black" /> 
                Play Movie
              </button>
            </div>
          </div>
        </div>
      </header>
      
      <main className="max-w-6xl mx-auto px-4 md:px-8 -mt-6 relative z-10">
        {/* 2. Movie Section */}
        <div className="bg-zinc-900/70 backdrop-blur-sm rounded-lg p-6 mb-8">
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
              <p className="text-white/80 mb-6 leading-relaxed">
                {movie.description}
              </p>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                {movie.director && (
                  <div>
                    <span className="block text-white/50 text-sm">Director</span>
                    <span className="font-medium">{movie.director}</span>
                  </div>
                )}
                
                {movie.cast && movie.cast.length > 0 && (
                  <div>
                    <span className="block text-white/50 text-sm">Cast</span>
                    <span className="font-medium">{movie.cast.join(", ")}</span>
                  </div>
                )}
              </div>
              
              {/* Action Buttons */}
              <div className="flex space-x-3">
                <button className="flex items-center bg-red-600 hover:bg-red-700 rounded px-5 py-2 text-white font-medium transition">
                  <Plus className="mr-2 h-5 w-5" /> Add to My List
                </button>
              </div>
            </div>
          </div>
        </div>
        
        {/* 3. Hashtags/Genres Section */}
        <div className="mb-10">
          <h3 className="text-xl font-semibold mb-3">Categories</h3>
          <div className="flex flex-wrap gap-2">
            {getGenreNames(movie.genreIds).map((genre, index) => (
              <span key={index} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white/80 text-sm cursor-pointer transition-colors">
                #{genre.replace(' ', '')}
              </span>
            ))}
          </div>
        </div>
        
        {/* 4. Recommended Films Section */}
        {similarMovies.length > 0 && (
          <div className="mb-16">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">Recommended Films</h3>
              <button className="text-white/70 hover:text-white flex items-center">
                See All <ArrowRight className="ml-1 h-4 w-4" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {similarMovies.map(similarMovie => (
                <div 
                  key={similarMovie.id}
                  className="group cursor-pointer"
                  onClick={() => setLocation(`/movie/${similarMovie.id}`)}
                >
                  <div className="relative overflow-hidden rounded-md">
                    <img 
                      src={similarMovie.posterUrl}
                      alt={similarMovie.title}
                      className="w-full aspect-[2/3] object-cover rounded-md group-hover:scale-105 transition-transform duration-300"
                    />
                    
                    {/* Rating Badge */}
                    <div className="absolute top-2 left-2 bg-black/70 px-1.5 py-0.5 rounded text-xs font-medium flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span>{formatRating(similarMovie.imdbRating)}</span>
                    </div>
                    
                    {/* Play Button */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <div className="bg-white/80 rounded-full p-3">
                        <Play className="h-6 w-6 text-black fill-black" />
                      </div>
                    </div>
                  </div>
                  <h4 className="mt-2 text-sm font-medium">{similarMovie.title}</h4>
                  <span className="text-xs text-white/60">{similarMovie.releaseYear}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default MovieDetails;
