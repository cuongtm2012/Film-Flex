import { useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import VideoPlayer from "@/components/VideoPlayer";
import { API_BASE_URL } from "@/lib/constants";

const WatchMovie = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/watch/:id");
  const movieId = match ? parseInt(params.id) : null;
  
  // Fetch movie details
  const { data: movie, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/movies/${movieId}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movieId,
  });
  
  const handleClose = () => {
    setLocation(`/movie/${movieId}`);
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914] mx-auto mb-4"></div>
          <p className="text-white">Loading video...</p>
        </div>
      </div>
    );
  }
  
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-[#141414] flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Video Not Found</h2>
          <p className="text-gray-300">
            We couldn't load the video you're looking for. Please try again later.
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-[#E50914] text-white rounded"
            onClick={() => setLocation("/")}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  return <VideoPlayer movie={movie} onClose={handleClose} />;
};

export default WatchMovie;
