import { useState } from "react";
import { useLocation } from "wouter";
import { Play, Info } from "lucide-react";
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

  return (
    <section className="relative">
      <div className="absolute inset-0 bg-gradient-to-t from-[#141414] to-transparent z-10"></div>
      <div className="relative h-[60vh] md:h-[80vh]">
        <img 
          src={movie.backdropUrl}
          alt={`${movie.title} backdrop`}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-0 left-0 right-0 px-4 md:px-12 py-10 z-20 hero-gradient">
          <div className="max-w-xl">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">{movie.title}</h1>
            <div className="flex items-center mb-4 space-x-4">
              {movie.matchPercentage && (
                <span className="text-green-500 font-medium">{movie.matchPercentage}% Match</span>
              )}
              <span className="text-gray-300">{movie.releaseYear}</span>
              <span className="border border-gray-600 px-1 text-xs">{movie.rating}</span>
              <span className="text-gray-300">{formatDuration(movie.duration)}</span>
              <span className="text-gray-300 hidden md:inline">HD</span>
            </div>
            <p className="text-gray-300 mb-6 line-clamp-3 md:line-clamp-none">
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
    </section>
  );
};

export default HeroSection;
