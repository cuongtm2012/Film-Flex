import { useRef, useState, useEffect } from "react";
import { Play, Pause, VolumeX, Volume2 } from "lucide-react";
import { Movie } from "@/lib/constants";
import { convertToDirectStreamingUrl } from "@/lib/googleDriveApi";

interface SimpleVideoPlayerProps {
  movie: Movie;
  onClose: () => void;
}

/**
 * A simple HTML5 video player component with basic controls
 * Used as a fallback if Video.js has issues with Google Drive sources
 */
const SimpleVideoPlayer = ({ movie, onClose }: SimpleVideoPlayerProps) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  
  // Get the source URL
  const getVideoSource = () => {
    if (!movie.videoSources || movie.videoSources.length === 0) {
      return '';
    }
    
    // Sort by quality (higher numbers = better quality)
    const sortedSources = [...movie.videoSources].sort((a, b) => {
      const qualityA = parseInt(a.quality.replace('p', '')) || 0;
      const qualityB = parseInt(b.quality.replace('p', '')) || 0;
      return qualityB - qualityA;
    });
    
    // Convert Google Drive URLs to direct streaming URLs
    return convertToDirectStreamingUrl(sortedSources[0].url);
  };
  
  // Sync the video element state with our component state
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      setProgress((video.currentTime / video.duration) * 100);
    };
    const handleLoadedMetadata = () => {
      setDuration(video.duration);
    };
    
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    
    return () => {
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
    };
  }, []);
  
  // Handle play/pause
  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };
  
  // Handle mute/unmute
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    video.muted = !video.muted;
    setIsMuted(video.muted);
  };
  
  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Handle progress bar click
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const pos = (e.clientX - rect.left) / rect.width;
    
    video.currentTime = pos * video.duration;
  };
  
  return (
    <div className="relative w-full h-full bg-black">
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        src={getVideoSource()}
        poster={movie.backdropUrl}
        controls={false}
        preload="auto"
      />
      
      {/* Custom controls */}
      <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
        {/* Progress bar */}
        <div 
          className="w-full h-1 bg-gray-600 mb-4 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-red-600"
            style={{ width: `${progress}%` }}
          />
        </div>
        
        {/* Control buttons */}
        <div className="flex justify-between items-center">
          <div className="flex space-x-4 items-center">
            <button 
              className="text-white"
              onClick={togglePlay}
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>
            
            <button 
              className="text-white"
              onClick={toggleMute}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
            
            <div className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
          
          <div>
            <button 
              className="text-white px-4 py-1 bg-red-600 rounded"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </div>
      </div>
      
      {/* Play overlay (shown when paused) */}
      {!isPlaying && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-black/50 cursor-pointer"
          onClick={togglePlay}
        >
          <button className="w-20 h-20 bg-red-600 rounded-full flex items-center justify-center">
            <Play className="h-10 w-10 text-white" />
          </button>
        </div>
      )}
    </div>
  );
};

export default SimpleVideoPlayer;