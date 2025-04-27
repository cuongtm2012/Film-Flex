import { useRef, useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Play, Pause } from "lucide-react";
import { API_BASE_URL, Movie } from "@/lib/constants";

const WatchMovie = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/watch/:id");
  const movieId = match ? parseInt(params.id) : null;
  
  // Simple state
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch movie details
  const { data: movie, isLoading, error, isError } = useQuery<Movie>({
    queryKey: [`${API_BASE_URL}/movie/${movieId}`],
    staleTime: 60 * 1000,
    enabled: !!movieId,
  });
  
  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  // Get video source - simplified for now
  const getVideoSource = () => {
    if (!movie) return '';
    return movie.videoUrl || '';
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white">Loading video...</p>
        </div>
      </div>
    );
  }
  
  if (error || isError || !movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md px-6 py-8 bg-zinc-900 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-white mb-4">Movie Not Found</h2>
          <p className="text-gray-300 mb-6">
            We couldn't load the movie you're looking for. Please try again later.
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              onClick={() => setLocation("/")}
            >
              Go to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-2xl font-bold mb-4">{movie.title}</h1>
        
        <div className="relative aspect-video bg-black mb-6">
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={getVideoSource()}
            poster={movie.backdropUrl}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
          />
          
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="text-8xl text-white/90">
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-black/30">
                  <Play className="h-12 w-12 fill-white text-white" />
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="bg-zinc-900 p-6 rounded-lg mb-6">
          <p className="text-gray-300 mb-4">{movie.description}</p>
          
          <div className="text-sm text-gray-400">
            {movie.releaseYear && <span className="mr-4">Released: {movie.releaseYear}</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchMovie;