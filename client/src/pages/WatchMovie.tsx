import { useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Play } from "lucide-react";
import Navbar from "@/components/Navbar";
import { API_BASE_URL, Movie } from "@/lib/constants";
import { convertToDirectStreamingUrl } from "@/lib/googleDriveApi";

const WatchMovie = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/watch/:id");
  const movieId = match ? parseInt(params.id) : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch movie details
  const { data: movie, isLoading, error } = useQuery<Movie>({
    queryKey: [`${API_BASE_URL}/movies/${movieId}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movieId,
  });
  
  const handleBack = () => {
    setLocation(`/movie/${movieId}`);
  };
  
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
  
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Video Not Found</h2>
          <p className="text-gray-300">
            We couldn't load the video you're looking for. Please try again later.
          </p>
          <button 
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded"
            onClick={() => setLocation("/")}
          >
            Go to Home
          </button>
        </div>
      </div>
    );
  }

  // Get the highest quality video source
  const getVideoSource = () => {
    if (!movie.videoSources || movie.videoSources.length === 0) {
      return '';
    }
    
    // Sort by quality (assuming higher numbers = better quality)
    const sortedSources = [...movie.videoSources].sort((a, b) => {
      const qualityA = parseInt(a.quality.replace('p', '')) || 0;
      const qualityB = parseInt(b.quality.replace('p', '')) || 0;
      return qualityB - qualityA;
    });
    
    // Convert Google Drive URLs to streaming URLs
    const sourceUrl = sortedSources[0].url;
    return convertToDirectStreamingUrl(sourceUrl);
  };

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Video title and info */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="mb-2 text-2xl font-semibold">{movie.title}</div>
        <div className="text-gray-400 text-sm mb-4">
          {movie.description.slice(0, 100)}...
        </div>
      </div>
      
      {/* Main video player */}
      <div className="relative max-w-7xl mx-auto bg-black mb-4">
        <div className="aspect-video w-full relative">
          {/* Video element */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={getVideoSource()}
            poster={movie.backdropUrl}
            preload="auto"
          />
          
          {/* Play overlay with big centered play button */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer"
              onClick={togglePlay}
            >
              <div className="text-8xl text-white/90 select-none">
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-black/30">
                  <Play className="h-12 w-12 fill-white text-white" />
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-3xl opacity-40 font-light">
                  PLAY VIDEO
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Video stats */}
      <div className="max-w-7xl mx-auto px-4 mb-8">
        <div className="flex gap-2 text-sm">
          <div className="py-1 px-2 bg-red-600 rounded-sm">#1</div>
          <div className="py-1 px-2 bg-zinc-800 rounded-sm">#2</div>
        </div>
        <div className="flex items-center gap-2 mt-3 text-sm text-gray-400">
          <div className="flex items-center">
            <span className="text-white font-medium mr-1">{movie.imdbRating}</span>
            <span className="text-yellow-500">★</span>
          </div>
          <div>{movie.duration} min</div>
          <div>{movie.releaseYear}</div>
        </div>
        
        {/* Movie description */}
        <div className="mt-6">
          <p className="text-gray-300">{movie.description}</p>
        </div>
        
        {/* Movie hashtags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {movie.director && (
            <span className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full text-sm cursor-pointer">
              {movie.director}
            </span>
          )}
          {movie.cast?.slice(0, 2).map((actor: string, index: number) => (
            <span key={index} className="bg-zinc-800 hover:bg-zinc-700 px-3 py-1 rounded-full text-sm cursor-pointer">
              {actor}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchMovie;
