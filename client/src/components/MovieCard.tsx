import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Plus, ThumbsUp, Star, Eye } from "lucide-react";
import { Movie } from "@/lib/constants";

interface MovieCardProps {
  movie: Movie;
}

const MovieCard = ({ movie }: MovieCardProps) => {
  const [, setLocation] = useLocation();
  
  const handleCardClick = () => {
    setLocation(`/movie/${movie.id}`);
  };
  
  const handlePlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLocation(`/watch/${movie.id}`);
  };
  
  const handleAddToList = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Would handle adding to user's list in a real implementation
    console.log("Add to list:", movie.id);
  };
  
  const handleLike = (e: React.MouseEvent) => {
    e.stopPropagation();
    // Would handle liking in a real implementation
    console.log("Like:", movie.id);
  };

  // Format view count to show 'K' for thousands
  const formatViewCount = (count?: number) => {
    if (!count) return "0";
    return count >= 1000 
      ? `${(count / 1000).toFixed(1)}K` 
      : `${count}`;
  };

  return (
    <div 
      className="movie-card flex-shrink-0 w-[170px] md:w-[200px] transition duration-300 relative cursor-pointer group"
      onClick={handleCardClick}
    >
      <div className="relative">
        <img 
          src={movie.posterUrl}
          alt={`${movie.title} poster`}
          className="rounded-t w-full h-[220px] md:h-[280px] object-cover"
        />
        
        {/* Play overlay on hover */}
        <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity duration-200">
          <button 
            onClick={handlePlayClick}
            className="bg-white rounded-full p-3 transform transition hover:scale-110"
          >
            <Play className="h-6 w-6 text-black" fill="black"/>
          </button>
        </div>
      </div>
      
      {/* Card info section (always visible) */}
      <div className="bg-[#181818] rounded-b p-2 text-white">
        <h3 className="font-medium text-sm md:text-base truncate">{movie.title}</h3>
        
        <div className="flex items-center justify-between mt-1 text-xs">
          <div className="flex items-center text-yellow-500">
            <Star className="fill-yellow-500 h-3 w-3 mr-1" />
            <span>{movie.imdbRating || '-'}</span>
          </div>
          
          <div className="flex items-center text-gray-300">
            <Eye className="h-3 w-3 mr-1" />
            <span>{formatViewCount(movie.viewCount)}</span>
          </div>
        </div>
        
        {movie.cast && movie.cast.length > 0 && (
          <p className="text-xs text-gray-400 mt-1 truncate">
            {movie.cast.slice(0, 2).join(", ")}
          </p>
        )}
        
        <div className="flex mt-2 space-x-2 justify-between">
          <button 
            className="p-1 bg-[#222] rounded-full border border-gray-500 hover:bg-[#333]"
            onClick={handleAddToList}
            aria-label="Add to My List"
          >
            <Plus className="h-3 w-3 text-white" />
          </button>
          
          <div className="flex items-center text-xs text-gray-300">
            <span>{movie.releaseYear}</span>
            <span className="mx-1">•</span>
            <span>{movie.rating}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
