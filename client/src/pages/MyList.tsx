import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Navbar from "@/components/Navbar";
import MobileNavBar from "@/components/MobileNavBar";
import MovieCard from "@/components/MovieCard";
import { API_BASE_URL } from "@/lib/constants";

const MyList = () => {
  // For demonstration purposes, we'll use a hard-coded user ID
  // In a real application, this would come from authentication
  const userId = 1;
  
  // Fetch favorites for the user
  const { data: favorites, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/users/${userId}/favorites`],
    staleTime: 60 * 1000, // 1 minute
  });

  return (
    <div className="min-h-screen bg-[#141414]">
      <Navbar />
      <main className="px-4 py-6 max-w-7xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-6">My List</h1>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914]"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-white mb-2">Error</h2>
            <p className="text-gray-400">
              An error occurred while loading your favorites. Please try again.
            </p>
          </div>
        ) : favorites?.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {favorites.map(movie => (
              <div key={movie.id} className="movie-card">
                <MovieCard movie={movie} />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <h2 className="text-xl font-bold text-white mb-2">Your list is empty</h2>
            <p className="text-gray-400">
              Add movies to your list by clicking the '+' button on any movie card.
            </p>
          </div>
        )}
      </main>
      <MobileNavBar />
    </div>
  );
};

export default MyList;
