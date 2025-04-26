import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Play, TrendingUp, Crown } from "lucide-react";
import { Link } from "wouter";
import Navbar from "@/components/Navbar";
import MobileNavBar from "@/components/MobileNavBar";
import { API_BASE_URL, Movie, MOVIE_GENRES } from "@/lib/constants";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

const Home = () => {
  // Fetch all movies
  const { data: allMovies, isLoading: isLoadingMovies, error: moviesError } = useQuery({
    queryKey: [`${API_BASE_URL}/movies`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Fetch new releases
  const { data: newReleases, isLoading: isLoadingNewReleases } = useQuery({
    queryKey: [`${API_BASE_URL}/new-releases`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  // Format rating as string
  const formatRating = (rating?: string) => {
    if (!rating) return '';
    return rating.includes('.') ? rating : rating + '.0';
  };
  
  if (isLoadingMovies || isLoadingNewReleases) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white">Loading movies...</p>
        </div>
      </div>
    );
  }
  
  if (moviesError || !allMovies) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Oops!</h2>
          <p className="text-gray-300">
            We encountered an error while loading movies. Please try again later.
          </p>
        </div>
      </div>
    );
  }

  // Group movies by genre
  const getMoviesByGenre = (genreId: number) => {
    if (!allMovies) return [];
    return allMovies.filter((movie: Movie) => movie.genreIds.includes(genreId));
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      <main className="pt-4 px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* Featured Movies Carousel */}
        <div className="mb-12">
          {allMovies?.length > 0 && (
            <div className="flex space-x-4 overflow-x-auto pb-4 no-scrollbar">
              {allMovies.slice(0, 5).map((movie: Movie) => (
                <Link key={movie.id} href={`/movie/${movie.id}`}>
                  <div className="flex-shrink-0 w-[250px] md:w-[280px] relative group cursor-pointer">
                    <img 
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full rounded-sm h-[400px] object-cover"
                    />
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-sm">
                      <h3 className="font-semibold text-white">{movie.title}</h3>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
        
        {/* New Releases Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">New Releases</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {newReleases?.slice(0, 5).map((movie: Movie) => (
              <Link key={movie.id} href={`/movie/${movie.id}`}>
                <div className="group relative cursor-pointer">
                  <div className="relative">
                    <img 
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover rounded-sm"
                    />
                    {/* Rating Badge */}
                    <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs font-medium flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span>{formatRating(movie.imdbRating)}</span>
                    </div>
                    {/* Play Button */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/80 rounded-full p-3">
                        <Play className="h-6 w-6 text-black fill-black" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-1 text-sm font-medium truncate">{movie.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
        
        {/* Premium Content Banner */}
        <section className="mb-12">
          <div className="relative overflow-hidden rounded-lg">
            <div className="bg-gradient-to-r from-yellow-600 to-yellow-400 p-6 md:p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                <div className="mb-4 md:mb-0">
                  <h2 className="text-2xl md:text-3xl font-bold text-black mb-2 flex items-center">
                    <Crown className="h-7 w-7 mr-2" />
                    Premium Content
                  </h2>
                  <p className="text-black/80 max-w-2xl">
                    Get access to exclusive trending movies and early releases with our premium membership.
                  </p>
                </div>
                
                <div className="flex space-x-3">
                  <Link href="/profile?tab=premium">
                    <Button
                      className="bg-black text-white hover:bg-black/80 flex items-center"
                    >
                      <Crown className="h-4 w-4 mr-2" />
                      Upgrade Now
                    </Button>
                  </Link>
                  
                  {useAuth().user?.userType === "premium" && (
                    <Link href="/trending">
                      <Button
                        variant="outline"
                        className="border-black text-black hover:bg-black/10 flex items-center"
                      >
                        <TrendingUp className="h-4 w-4 mr-2" />
                        View Trending
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Action Movies Section */}
        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-4">Action</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {getMoviesByGenre(1).slice(0, 5).map((movie: Movie) => (
              <Link key={movie.id} href={`/movie/${movie.id}`}>
                <div className="group relative cursor-pointer">
                  <div className="relative">
                    <img 
                      src={movie.posterUrl}
                      alt={movie.title}
                      className="w-full aspect-[2/3] object-cover rounded-sm"
                    />
                    {/* Rating Badge */}
                    <div className="absolute top-1 left-1 bg-black/70 px-1.5 py-0.5 rounded text-xs font-medium flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span>{formatRating(movie.imdbRating)}</span>
                    </div>
                    {/* Play Button */}
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/80 rounded-full p-3">
                        <Play className="h-6 w-6 text-black fill-black" />
                      </div>
                    </div>
                  </div>
                  <h3 className="mt-1 text-sm font-medium truncate">{movie.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <MobileNavBar />
    </div>
  );
};

export default Home;
