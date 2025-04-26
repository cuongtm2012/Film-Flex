import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon } from "lucide-react";
import Navbar from "@/components/Navbar";
import MobileNavBar from "@/components/MobileNavBar";
import MovieCard from "@/components/MovieCard";
import { API_BASE_URL, Movie } from "@/lib/constants";

const Search = () => {
  const [location] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  // Extract query from URL
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q");
    if (q) {
      setSearchQuery(q);
    }
  }, [location]);
  
  // Fetch all movies
  const { data: allMovies, isLoading: isLoadingMovies } = useQuery({
    queryKey: [`${API_BASE_URL}/movies`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Search functionality
  const { data: searchResults, isLoading: isSearching } = useQuery({
    queryKey: [`${API_BASE_URL}/movies/search`, searchQuery],
    staleTime: 60 * 1000, // 1 minute
    enabled: searchQuery.length > 0,
  });
  
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };
  
  const isLoading = isLoadingMovies || isSearching;
  const movies = searchQuery ? searchResults : allMovies;

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="px-4 py-6 max-w-7xl mx-auto">
        <div className="relative mb-8">
          <div className="flex items-center">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="Search for movies by title or description..."
                className="w-full py-3 pl-10 pr-4 bg-[#222] text-white rounded-lg focus:outline-none focus:ring-1 focus:ring-[#E50914]"
                value={searchQuery}
                onChange={handleSearchChange}
              />
            </div>
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]"></div>
          </div>
        ) : movies?.length > 0 ? (
          <>
            <h2 className="text-xl font-bold text-white mb-4">
              {searchQuery ? `Results for "${searchQuery}"` : "All Movies"}
            </h2>
            <div className="movie-grid">
              {movies.map((movie: Movie) => (
                <div key={movie.id} className="movie-card">
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-white mb-2">No results found</h2>
            <p className="text-gray-400">
              {searchQuery
                ? `We couldn't find any movies matching "${searchQuery}"`
                : "No movies available at the moment"}
            </p>
          </div>
        )}
      </main>
      <MobileNavBar />
    </div>
  );
};

export default Search;
