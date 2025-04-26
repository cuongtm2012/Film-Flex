import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import MovieCarousel from "@/components/MovieCarousel";
import MobileNavBar from "@/components/MobileNavBar";
import { API_BASE_URL, Movie, MOVIE_GENRES } from "@/lib/constants";

const Home = () => {
  const [featuredMovie, setFeaturedMovie] = useState<Movie | null>(null);
  
  // Fetch all movies
  const { data: allMovies, isLoading: isLoadingMovies, error: moviesError } = useQuery({
    queryKey: [`${API_BASE_URL}/movies`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Fetch featured movies
  const { data: featuredMovies, isLoading: isLoadingFeatured } = useQuery({
    queryKey: [`${API_BASE_URL}/featured-movies`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Fetch new releases
  const { data: newReleases, isLoading: isLoadingNewReleases } = useQuery({
    queryKey: [`${API_BASE_URL}/new-releases`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Select a random featured movie for the hero section
  useEffect(() => {
    if (featuredMovies && featuredMovies.length > 0) {
      const randomIndex = Math.floor(Math.random() * featuredMovies.length);
      setFeaturedMovie(featuredMovies[randomIndex]);
    }
  }, [featuredMovies]);
  
  // Group movies by genre
  const getMoviesByGenre = (genreId: number) => {
    if (!allMovies) return [];
    return allMovies.filter((movie: Movie) => movie.genreIds.includes(genreId));
  };
  
  if (isLoadingMovies || isLoadingFeatured || isLoadingNewReleases) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914] mx-auto mb-4"></div>
          <p className="text-white">Loading movies...</p>
        </div>
      </div>
    );
  }
  
  if (moviesError || !featuredMovie) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-gray-300">
            We encountered an error while loading movies. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main>
        <HeroSection movie={featuredMovie} />
        
        {featuredMovies?.length > 0 && (
          <MovieCarousel title="Featured Movies" movies={featuredMovies} />
        )}
        
        {newReleases?.length > 0 && (
          <MovieCarousel title="New Releases" movies={newReleases} />
        )}
        
        {/* Genre-based movie sections */}
        {MOVIE_GENRES.map(genre => {
          const moviesInGenre = getMoviesByGenre(genre.id);
          if (moviesInGenre.length > 0) {
            return (
              <MovieCarousel 
                key={genre.id} 
                title={genre.name} 
                movies={moviesInGenre}
              />
            );
          }
          return null;
        })}
      </main>
      <MobileNavBar />
    </div>
  );
};

export default Home;
