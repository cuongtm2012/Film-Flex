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
  
  const scrollLeft = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: -800, behavior: "smooth" });
    }
  };
  
  const scrollRight = () => {
    if (carouselRef.current) {
      carouselRef.current.scrollBy({ left: 800, behavior: "smooth" });
    }
  };

  return (
    <section className="py-6 px-4 md:px-8">
      <h2 className="text-xl md:text-2xl font-bold text-white mb-4">{title}</h2>
      
      <div className="relative">
        <div
          ref={carouselRef}
          className="flex overflow-x-auto space-x-4 scrollbar-hide pb-6"
        >
          {movies.map((movie) => (
            <MovieCard key={movie.id} movie={movie} />
          ))}
        </div>
        
        <button
          className="absolute top-1/2 left-0 -translate-y-1/2 bg-black bg-opacity-50 rounded-r-md p-4 hidden md:block"
          onClick={scrollLeft}
          aria-label="Scroll left"
        >
          <ChevronLeft className="h-6 w-6 text-white" />
        </button>
        
        <button
          className="absolute top-1/2 right-0 -translate-y-1/2 bg-black bg-opacity-50 rounded-l-md p-4 hidden md:block"
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
