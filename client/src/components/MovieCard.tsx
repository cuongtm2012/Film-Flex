import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Plus, ThumbsUp } from "lucide-react";
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

  return (
    <div 
      className="movie-card flex-shrink-0 w-[180px] md:w-[220px] transition duration-300 relative cursor-pointer"
      onClick={handleCardClick}
    >
      <img 
        src={movie.posterUrl}
        alt={`${movie.title} poster`}
        className="rounded w-full h-[270px] md:h-[330px] object-cover"
      />
      <div className="movie-card-overlay opacity-0 absolute inset-0 bg-black bg-opacity-60 rounded flex flex-col justify-end p-3 transition duration-200">
        <h3 className="text-white font-medium text-sm md:text-base truncate">{movie.title}</h3>
        <div className="flex items-center mt-1 text-xs">
          {movie.matchPercentage && (
            <span className="text-green-500 mr-2">{movie.matchPercentage}% Match</span>
          )}
          <span className="border border-gray-500 px-1 mr-2">{movie.rating}</span>
          <span>{movie.releaseYear}</span>
        </div>
        <div className="flex mt-3 space-x-2">
          <button 
            className="p-1.5 bg-white rounded-full"
            onClick={handlePlayClick}
            aria-label="Play"
          >
            <Play className="h-4 w-4 text-black" />
          </button>
          <button 
            className="p-1.5 bg-[#222] bg-opacity-60 rounded-full border border-gray-300"
            onClick={handleAddToList}
            aria-label="Add to My List"
          >
            <Plus className="h-4 w-4 text-white" />
          </button>
          <button 
            className="p-1.5 bg-[#222] bg-opacity-60 rounded-full border border-gray-300"
            onClick={handleLike}
            aria-label="Like"
          >
            <ThumbsUp className="h-4 w-4 text-white" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default MovieCard;
