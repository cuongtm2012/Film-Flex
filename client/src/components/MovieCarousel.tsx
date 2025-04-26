import { useState, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import MovieCard from "./MovieCard";
import { Movie } from "@/lib/constants";

interface MovieCarouselProps {
  title: string;
  movies: Movie[];
}

const MovieCarousel = ({ title, movies }: MovieCarouselProps) => {
  const carouselRef = useRef<HTMLDivElement>(null);
  const [showLeftButton, setShowLeftButton] = useState(false);
  
  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -600, behavior: "smooth" });
    }
  };
  
  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 600, behavior: "smooth" });
    }
  };
  
  const handleScroll = () => {
    if (carouselRef.current) {
      setShowLeftButton(carouselRef.current.scrollLeft > 20);
    }
  };

  return (
    <section className="py-4 px-4 md:px-8 group">
      <h2 className="text-lg md:text-xl font-bold text-white mb-3">{title}</h2>
      
      <div className="relative">
        <div
          ref={carouselRef}
          className="flex overflow-x-auto space-x-3 scrollbar-hide pb-3 pl-0.5"
          onScroll={handleScroll}
        >
          {movies.filter(movie => movie.id && movie.id > 0 && movie.id <= 10).map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
        
        {showLeftButton && (
          <button
            className="absolute top-1/2 left-0 -translate-y-1/2 bg-black/60 rounded-r-md p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
            onClick={scrollLeft}
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-6 w-6 text-white" />
          </button>
        )}
        
        <button
          className="absolute top-1/2 right-0 -translate-y-1/2 bg-black/60 rounded-l-md p-3 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          onClick={scrollRight}
          aria-label="Scroll right"
        >
          <ChevronRight className="h-6 w-6 text-white" />
        </button>
      </div>
    </section>
  );
};

export default MovieCarousel;
