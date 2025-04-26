import { useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, SkipBack, Play, Pause, Volume2, VolumeX, X } from "lucide-react";
import { API_BASE_URL } from "@/lib/constants";

const WatchMovie = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/watch/:id");
  const movieId = match ? parseInt(params.id) : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Fetch movie details
  const { data: movie, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/movies/${movieId}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movieId,
  });
  
  const handleClose = () => {
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
  
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
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
      const qualityA = parseInt(a.quality.replace('p', ''));
      const qualityB = parseInt(b.quality.replace('p', ''));
      return qualityB - qualityA;
    });
    
    return sortedSources[0].url;
  };

  return (
    <div className="relative min-h-screen bg-black">
      {/* Video Header */}
      <div className="absolute top-0 left-0 right-0 p-4 z-30 bg-gradient-to-b from-black to-transparent">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleClose}
            className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="text-white text-xl font-medium">{movie.title}</div>
          <button 
            onClick={handleClose}
            className="text-white hover:bg-white/10 p-2 rounded-full transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>
      
      {/* Main Video */}
      <div className="relative h-screen bg-black flex items-center justify-center">
        <video
          ref={videoRef}
          className="w-full h-full object-contain"
          src={getVideoSource()}
          poster={movie.backdropUrl}
          preload="auto"
          onClick={togglePlay}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
        
        {/* Play Overlay */}
        {!isPlaying && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-20">
            <button 
              onClick={togglePlay}
              className="bg-white/20 hover:bg-white/30 rounded-full p-6 transition-colors"
            >
              <Play className="h-16 w-16 text-white fill-white" />
            </button>
          </div>
        )}
        
        {/* Video Controls */}
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black to-transparent z-20">
          <div className="max-w-6xl mx-auto">
            {/* Progress Bar */}
            <div className="w-full bg-white/30 h-1 mb-4 rounded-full overflow-hidden">
              <div className="bg-red-600 h-full w-[10%]"></div>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button 
                  onClick={togglePlay}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {isPlaying ? (
                    <Pause className="h-8 w-8" />
                  ) : (
                    <Play className="h-8 w-8" />
                  )}
                </button>
                <button className="text-white hover:text-gray-300 transition-colors">
                  <SkipBack className="h-6 w-6" />
                </button>
                <button 
                  onClick={toggleMute}
                  className="text-white hover:text-gray-300 transition-colors"
                >
                  {isMuted ? (
                    <VolumeX className="h-6 w-6" />
                  ) : (
                    <Volume2 className="h-6 w-6" />
                  )}
                </button>
                <div className="text-white text-sm">
                  0:00 / {Math.floor(movie.duration / 60)}:{movie.duration % 60 < 10 ? '0' + movie.duration % 60 : movie.duration % 60}
                </div>
              </div>
              
              <div className="text-white text-sm">
                {movie.rating}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WatchMovie;
