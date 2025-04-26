import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Info, Star, Eye } from "lucide-react";
import { Movie, formatDuration } from "@/lib/constants";

interface HeroSectionProps {
  movie: Movie;
}

const HeroSection = ({ movie }: HeroSectionProps) => {
  const [, setLocation] = useLocation();

  const handlePlay = () => {
    setLocation(`/watch/${movie.id}`);
  };
  
  const handleMoreInfo = () => {
    setLocation(`/movie/${movie.id}`);
  };

  // Format view count to show 'K' for thousands
  const formatViewCount = (count?: number) => {
    if (!count) return "0 views";
    return count >= 1000 
      ? `${(count / 1000).toFixed(1)}K views` 
      : `${count} views`;
  };

  return (
    <section className="relative">
      <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-[#141414] z-10"></div>
      <div className="relative h-[50vh] md:h-[70vh]">
        <img 
          src={movie.backdropUrl}
          alt={`${movie.title} backdrop`}
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 flex items-end z-20">
          <div className="w-full px-4 md:px-12 py-6 bg-gradient-to-t from-[#141414] to-transparent">
            <div className="max-w-4xl">
              <h1 className="text-4xl md:text-6xl font-bold text-white mb-2">{movie.title}</h1>
              
              <div className="flex flex-wrap items-center mb-3 gap-x-4 gap-y-1">
                {movie.cast && movie.cast.length > 0 && (
                  <span className="text-gray-300 font-medium">
                    {movie.cast.slice(0, 3).join(", ")}
                  </span>
                )}
              </div>
              
              <div className="flex flex-wrap items-center mb-3 gap-x-4 gap-y-1">
                {movie.matchPercentage && (
                  <span className="text-green-500 font-medium">{movie.matchPercentage}% Match</span>
                )}
                <span className="text-gray-300">{movie.releaseYear}</span>
                <span className="border border-gray-600 px-1 text-xs">{movie.rating}</span>
                <span className="text-gray-300">{formatDuration(movie.duration)}</span>
                <span className="text-gray-300 hidden md:inline">HD</span>
                
                <div className="flex items-center text-yellow-500">
                  <Star className="fill-yellow-500 h-4 w-4 mr-1" />
                  <span>{movie.imdbRating || '0'}</span>
                </div>
                
                <div className="flex items-center text-gray-300">
                  <Eye className="h-4 w-4 mr-1" />
                  <span>{formatViewCount(movie.viewCount)}</span>
                </div>
              </div>
              
              <p className="text-gray-300 mb-4 line-clamp-2 md:line-clamp-3 text-sm md:text-base">
                {movie.description}
              </p>
              
              <div className="flex space-x-3">
                <button 
                  onClick={handlePlay}
                  className="flex items-center bg-[#E50914] hover:bg-[#B81D24] rounded px-6 py-2 text-white font-medium transition"
                >
                  <Play className="mr-2 h-5 w-5" /> Play
                </button>
                <button 
                  onClick={handleMoreInfo}
                  className="flex items-center bg-[#6D6D6D] bg-opacity-60 hover:bg-opacity-80 rounded px-6 py-2 text-white font-medium transition"
                >
                  <Info className="mr-2 h-5 w-5" /> More Info
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
