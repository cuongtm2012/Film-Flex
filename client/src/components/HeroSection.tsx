import { useLocation } from "wouter";
import { Play } from "lucide-react";
import { Movie } from "@/lib/constants";

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
      {/* Dark overlay gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black z-10"></div>
      
      {/* Background image */}
      <div className="relative h-[85vh]">
        <img 
          src={movie.backdropUrl}
          alt={`${movie.title} backdrop`}
          className="w-full h-full object-cover"
        />
        
        {/* Content container */}
        <div className="absolute inset-0 flex items-end z-20">
          <div className="w-full px-6 md:px-16 pb-16 md:pb-24">
            <div className="max-w-4xl">
              {/* Movie title */}
              <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">{movie.title}</h1>
              
              {/* Cast info */}
              {movie.cast && movie.cast.length > 0 && (
                <p className="text-white/90 text-xl mb-3">
                  {movie.cast.slice(0, 3).join(", ")}
                </p>
              )}
              
              {/* Movie metadata */}
              <div className="flex items-center mb-6 gap-x-3 text-sm text-white/80">
                <span className="text-green-400">{movie.matchPercentage}% Match</span>
                <span>{movie.releaseYear}</span>
                <span className="border border-white/40 px-1">{movie.rating}</span>
                <span>{movie.duration} min</span>
                <span>HD</span>
              </div>
              
              {/* Short description */}
              <p className="text-white/80 mb-6 max-w-3xl line-clamp-3">
                {movie.description}
              </p>
              
              {/* Action buttons */}
              <div className="flex space-x-3">
                <button 
                  onClick={handlePlay}
                  className="flex items-center bg-white hover:bg-white/90 rounded px-8 py-2 text-black font-medium transition"
                >
                  <Play className="mr-2 h-5 w-5 fill-black" /> Play
                </button>
                <button 
                  onClick={handleMoreInfo}
                  className="flex items-center bg-white/30 hover:bg-white/40 rounded px-8 py-2 text-white font-medium transition"
                >
                  More Info
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
