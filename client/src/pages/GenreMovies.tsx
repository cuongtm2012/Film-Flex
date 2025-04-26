import { useRoute } from "wouter";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import MobileNavBar from "@/components/MobileNavBar";
import MovieCard from "@/components/MovieCard";
import { API_BASE_URL, MOVIE_GENRES } from "@/lib/constants";

const GenreMovies = () => {
  const [match, params] = useRoute("/genre/:id");
  const genreId = match ? parseInt(params.id) : null;
  
  // Get genre name
  const genreName = genreId
    ? MOVIE_GENRES.find(g => g.id === genreId)?.name || "Unknown Genre"
    : "Genres";
  
  // Fetch movies by genre
  const { data: movies, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/movies/genre/${genreId}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!genreId,
  });
  
  // Fetch all genres if we're on the main genres page
  const { data: allGenres } = useQuery({
    queryKey: [`${API_BASE_URL}/genres`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !genreId,
  });

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="px-4 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">{genreName}</h1>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-gray-400">
              An error occurred while loading movies. Please try again.
            </p>
          </div>
        ) : genreId && movies?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {movies.map(movie => (
              <div key={movie.id} className="movie-card">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : genreId && movies?.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No movies found in this genre.</p>
          </div>
        ) : (
          // Render all genres if we're on the main genres page
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {MOVIE_GENRES.map(genre => (
              <a
                key={genre.id}
                href={`/genre/${genre.id}`}
                className="bg-[#222] rounded-lg p-6 hover:bg-[#333] transition-colors"
              >
                <h2 className="text-xl font-bold text-white mb-2">{genre.name}</h2>
                <p className="text-gray-400">Browse {genre.name} movies</p>
              </a>
            ))}
          </div>
        )}
      </main>
      <MobileNavBar />
    </div>
  );
};

export default GenreMovies;
