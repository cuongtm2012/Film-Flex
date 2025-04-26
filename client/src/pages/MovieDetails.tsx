import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Play, Download, Plus, Star } from "lucide-react";
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
      <div className="h-full overflow-y-auto pb-20">
        {/* Hero Section */}
        <div className="relative h-[60vh] md:h-[80vh]">
          <img 
            src={movie.backdropUrl}
            alt={`${movie.title} backdrop`}
            className="w-full h-full object-cover brightness-75"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#141414] via-[#141414]/70 to-transparent"></div>
          
          {/* Header Navigation */}
          <div className="absolute top-0 left-0 right-0 p-4 z-10">
            <button className="text-white" onClick={handleClose}>
              <ArrowLeft className="h-6 w-6" />
            </button>
          </div>
          
          {/* Movie Info Overlay */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-8 z-10">
            <div className="flex flex-col md:flex-row md:items-end gap-6">
              <div className="hidden md:block w-[220px] h-[330px] flex-shrink-0">
                <img 
                  src={movie.posterUrl}
                  alt={`${movie.title} poster`}
                  className="w-full h-full object-cover rounded-md shadow-lg"
                />
              </div>
              <div className="flex-1">
                <h1 className="text-3xl md:text-5xl font-bold text-white mb-2">{movie.title}</h1>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-4">
                  {movie.matchPercentage && (
                    <span className="text-green-500 font-medium">{movie.matchPercentage}% Match</span>
                  )}
                  <span className="text-gray-300">{movie.releaseYear}</span>
                  <span className="border border-gray-600 px-1 text-xs">{movie.rating}</span>
                  <span className="text-gray-300">{formatDuration(movie.duration)}</span>
                  <span className="text-gray-300">HD</span>
                </div>
                
                <div className="flex space-x-3 mb-6">
                  <button 
                    className="flex items-center bg-[#E50914] hover:bg-[#B81D24] rounded px-6 py-2 text-white font-medium transition"
                    onClick={handlePlay}
                  >
                    <Play className="mr-2 h-5 w-5" /> Play
                  </button>
                  <button className="flex items-center bg-[#6D6D6D] bg-opacity-60 hover:bg-opacity-80 rounded px-6 py-2 text-white font-medium transition">
                    <Download className="mr-2 h-5 w-5" /> Download
                  </button>
                  <button className="flex items-center justify-center w-10 h-10 rounded-full border border-gray-300 bg-[#222] bg-opacity-60">
                    <Plus className="h-5 w-5 text-white" />
                  </button>
                </div>
                
                <p className="text-gray-300 max-w-3xl mb-4">
                  {movie.description}
                </p>
                
                <div className="text-gray-300">
                  {movie.director && (
                    <p className="mb-1"><span className="text-gray-500">Director:</span> {movie.director}</p>
                  )}
                  {movie.cast && movie.cast.length > 0 && (
                    <p className="mb-1"><span className="text-gray-500">Cast:</span> {movie.cast.join(", ")}</p>
                  )}
                  <p><span className="text-gray-500">Genres:</span> {getGenresString(movie.genreIds)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* More Info Sections */}
        <div className="px-4 md:px-8 py-6">
          {similarMovies.length > 0 && (
            <div className="mb-8">
              <h2 className="text-xl font-bold text-white mb-4">More Like This</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {similarMovies.map(similarMovie => (
                  <div 
                    key={similarMovie.id}
                    className="movie-card relative cursor-pointer"
                    onClick={() => setLocation(`/movie/${similarMovie.id}`)}
                  >
                    <img 
                      src={similarMovie.posterUrl}
                      alt={`${similarMovie.title} poster`}
                      className="rounded w-full aspect-[2/3] object-cover"
                    />
                    <div className="movie-card-overlay opacity-0 md:group-hover:opacity-100 absolute inset-0 bg-black bg-opacity-60 rounded flex flex-col justify-end p-3 transition duration-200">
                      <h3 className="text-white font-medium text-sm truncate">{similarMovie.title}</h3>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div>
            <h2 className="text-xl font-bold text-white mb-4">About {movie.title}</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <p className="text-gray-300 mb-4">
                  {movie.description}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  {movie.cast && movie.cast.length > 0 && (
                    <div>
                      <h3 className="text-white font-medium mb-2">Cast</h3>
                      <ul className="text-gray-300 space-y-1">
                        {movie.cast.map((actor, index) => (
                          <li key={index}>{actor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  <div>
                    <h3 className="text-white font-medium mb-2">Details</h3>
                    <ul className="text-gray-300 space-y-1">
                      {movie.director && (
                        <li><span className="text-gray-500">Director:</span> {movie.director}</li>
                      )}
                      <li><span className="text-gray-500">Release:</span> {movie.releaseYear}</li>
                      <li><span className="text-gray-500">Runtime:</span> {formatDuration(movie.duration)}</li>
                      <li><span className="text-gray-500">Rating:</span> {movie.rating}</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <div>
                {movie.imdbRating && (
                  <>
                    <h3 className="text-white font-medium mb-2">Ratings</h3>
                    <div className="flex items-center mb-4">
                      <div className="text-[#E50914] text-4xl font-bold mr-2">{movie.imdbRating}</div>
                      <div className="text-gray-300">
                        <div className="flex items-center mb-1">
                          {[...Array(5)].map((_, i) => {
                            const ratingValue = parseFloat(movie.imdbRating || "0");
                            const fullStars = Math.floor(ratingValue / 2);
                            const hasHalfStar = ratingValue / 2 - fullStars >= 0.5;
                            
                            if (i < fullStars) {
                              return <Star key={i} className="h-4 w-4 text-yellow-500 fill-current mr-1" />;
                            } else if (i === fullStars && hasHalfStar) {
                              return (
                                <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 text-yellow-500 mr-1">
                                  <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253l3.086 6.253l6.9 1l-5 4.867l1.179 6.873z" fill="rgba(234, 179, 8, 0.5)" />
                                  <path d="M12 17.75l-6.172 3.245l1.179 -6.873l-5 -4.867l6.9 -1l3.086 -6.253" fill="rgba(234, 179, 8, 1)" />
                                </svg>
                              );
                            } else {
                              return <Star key={i} className="h-4 w-4 text-yellow-500 mr-1" />;
                            }
                          })}
                        </div>
                        <span className="text-sm">IMDB Rating</span>
                      </div>
                    </div>
                  </>
                )}
                
                <h3 className="text-white font-medium mb-2">Genres</h3>
                <div className="flex flex-wrap gap-2 mb-4">
                  {getGenreNames(movie.genreIds).map((genre, index) => (
                    <span key={index} className="px-3 py-1 bg-[#222] rounded-full text-gray-300 text-sm">
                      {genre}
                    </span>
                  ))}
                </div>
                
                <h3 className="text-white font-medium mb-2">Available In</h3>
                <div className="flex flex-wrap gap-2">
                  {movie.videoSources.map((source, index) => (
                    <span key={index} className="px-3 py-1 bg-[#222] rounded-full text-gray-300 text-sm">
                      {source.quality}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <MobileNavBar />
    </div>
  );
};

export default MovieDetails;
