import { useLocation } from "wouter";
import { Play, Star } from "lucide-react";
import { Movie } from "@/lib/constants";
import { useQuery } from "@tanstack/react-query";
import { API_BASE_URL } from "@/lib/constants";

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const [, setLocation] = useLocation();
  
  // Validate that the movie exists before creating links
  const { data: validMovie } = useQuery({
    queryKey: [`${API_BASE_URL}/movie/${movie.id}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movie.id,
  });
  
  const handleCardClick = () => {
    // Only navigate if the movie exists
    if (validMovie) {
      setLocation(`/movie/${movie.id}`);
    }
  };
  
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Only navigate if the movie exists
    if (validMovie) {
      setLocation(`/watch/${movie.id}`);
    }
  };

  // Use this for determining whether to apply the unavailable styling - check if the API returned a 404
  const { isError, isFetched } = useQuery({
    queryKey: [`${API_BASE_URL}/movie/${movie.id}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movie.id,
  });
  
  const isMovieUnavailable = isError && isFetched;

  return (
    <div 
      className={`movie-card flex-shrink-0 w-[150px] md:w-[180px] transition duration-300 relative cursor-pointer group ${isMovieUnavailable ? 'opacity-50' : ''}`}
      onClick={handleCardClick}
    >
      <div className="relative">
        <img 
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          className="w-full aspect-[2/3] object-cover"
        />
        
        {/* Unavailable movie overlay */}
        {isMovieUnavailable && (
          <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
            <span className="text-white text-xs font-medium px-2 py-1 bg-red-600 rounded">Unavailable</span>
          </div>
        )}
        
        {/* Overlay with gradient and minimal info */}
        {!isMovieUnavailable && (
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
            <div className="absolute bottom-0 left-0 right-0 p-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Star className="fill-yellow-500 h-3 w-3 text-yellow-500" />
                  <span className="text-white text-xs">{movie.imdbRating || '-'}</span>
                </div>
                
                <button 
                  onClick={handlePlayClick}
                  className="bg-white/90 rounded-full p-1 hover:bg-white"
                  aria-label="Play"
                >
                  <Play className="h-3 w-3 text-black" fill="black"/>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Minimal title */}
      <div className="py-1 px-0.5">
        <h3 className="text-xs text-white truncate">{movie.title}</h3>
      </div>
    </div>
  );
};

export default MovieCard;
