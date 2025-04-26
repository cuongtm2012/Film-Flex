import React, { useState, useRef, useEffect } from 'react';
import { Movie } from '@shared/schema';
import { getDriveVideoStreamingUrl, extractDriveFileId } from '@/lib/driveHelper';
import { X, Play, Pause, Volume2, VolumeX, Maximize, SkipForward, SkipBack } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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
  const playerRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  
  useEffect(() => {
    const loadVideo = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        if (!movie.videoUrl) {
          throw new Error("No video URL provided");
        }
        
        // Extract Drive file ID if it's a Drive URL
        const fileId = extractDriveFileId(movie.videoUrl);
        
        if (!fileId) {
          throw new Error("Invalid video URL format");
        }
        
        // Get streaming URL from Drive
        const streamingUrl = await getDriveVideoStreamingUrl(fileId);
        
        if (videoRef.current) {
          videoRef.current.src = streamingUrl;
          videoRef.current.load();
        }
      } catch (error) {
        console.error("Error loading video:", error);
        setError("Failed to load video. Please make sure you are authenticated with Google Drive.");
        toast({
          title: "Video Error",
          description: "Failed to load video. Please authenticate with Google Drive.",
          variant: "destructive"
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadVideo();
    
    // Add event listeners for keyboard controls
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      
      switch (e.key) {
        case ' ':
          togglePlay();
          e.preventDefault();
          break;
        case 'ArrowRight':
          videoRef.current.currentTime += 10;
          e.preventDefault();
          break;
        case 'ArrowLeft':
          videoRef.current.currentTime -= 10;
          e.preventDefault();
          break;
        case 'm':
          toggleMute();
          e.preventDefault();
          break;
        case 'f':
          toggleFullscreen();
          e.preventDefault();
          break;
        case 'Escape':
          if (document.fullscreenElement) {
            document.exitFullscreen();
          } else {
            onClose();
          }
          e.preventDefault();
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [movie.videoUrl]);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const onTimeUpdate = () => setCurrentTime(video.currentTime);
    const onDurationChange = () => setDuration(video.duration);
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onVolumeChange = () => setIsMuted(video.muted);
    const onLoadedMetadata = () => {
      setDuration(video.duration);
      setIsLoading(false);
    };
    const onLoadedData = () => {
      setIsLoading(false);
    };
    const onError = () => {
      setError("Error playing video. Please try again.");
      setIsLoading(false);
    };
    
    video.addEventListener('timeupdate', onTimeUpdate);
    video.addEventListener('durationchange', onDurationChange);
    video.addEventListener('play', onPlay);
    video.addEventListener('pause', onPause);
    video.addEventListener('volumechange', onVolumeChange);
    video.addEventListener('loadedmetadata', onLoadedMetadata);
    video.addEventListener('loadeddata', onLoadedData);
    video.addEventListener('error', onError);
    
    return () => {
      video.removeEventListener('timeupdate', onTimeUpdate);
      video.removeEventListener('durationchange', onDurationChange);
      video.removeEventListener('play', onPlay);
      video.removeEventListener('pause', onPause);
      video.removeEventListener('volumechange', onVolumeChange);
      video.removeEventListener('loadedmetadata', onLoadedMetadata);
      video.removeEventListener('loadeddata', onLoadedData);
      video.removeEventListener('error', onError);
    };
  }, []);
  
  const togglePlay = () => {
    if (!videoRef.current) return;
    
    if (videoRef.current.paused) {
      videoRef.current.play();
    } else {
      videoRef.current.pause();
    }
  };
  
  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
  };
  
  const skipForward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime += 10;
  };
  
  const skipBackward = () => {
    if (!videoRef.current) return;
    videoRef.current.currentTime -= 10;
  };
  
  const toggleFullscreen = () => {
    if (!playerRef.current) return;
    
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      playerRef.current.requestFullscreen();
    }
  };
  
  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };
  
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!videoRef.current) return;
    
    const newTime = parseFloat(e.target.value);
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };
  
  return (
    <div 
      ref={playerRef}
      className="relative bg-black w-full h-full flex items-center justify-center"
    >
      {/* Close button */}
      <button 
        className="absolute top-4 right-4 z-10 bg-black/50 p-2 rounded-full hover:bg-black/70"
        onClick={onClose}
      >
        <X className="text-white h-6 w-6" />
      </button>
      
      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full"
        playsInline
        controls={false}
        onClick={togglePlay}
      >
        <p>Your browser does not support HTML5 video.</p>
      </video>
      
      {/* Loading indicator */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="animate-spin h-12 w-12 border-4 border-white border-t-transparent rounded-full" />
        </div>
      )}
      
      {/* Error message */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 p-6">
          <div className="text-red-500 text-xl font-semibold mb-4">{error}</div>
          <button 
            className="bg-primary hover:bg-primary/90 text-white px-4 py-2 rounded"
            onClick={onClose}
          >
            Close Player
          </button>
        </div>
      )}
      
      {/* Custom controls */}
      <div 
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 opacity-0 hover:opacity-100 transition-opacity"
      >
        {/* Progress bar */}
        <input
          type="range"
          min="0"
          max={duration || 100}
          value={currentTime}
          onChange={handleSeek}
          className="w-full h-2 bg-gray-600 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, #ef4444 ${(currentTime / (duration || 1)) * 100}%, #4b5563 ${(currentTime / (duration || 1)) * 100}%)`
          }}
        />
        
        {/* Time indicators */}
        <div className="flex justify-between text-white text-sm mt-1">
          <span>{formatTime(currentTime)}</span>
          <span>{duration ? formatTime(duration) : '--:--'}</span>
        </div>
        
        {/* Control buttons */}
        <div className="flex items-center justify-center mt-2 space-x-4">
          <button 
            className="text-white hover:text-primary transition-colors"
            onClick={skipBackward}
          >
            <SkipBack className="h-6 w-6" />
          </button>
          
          <button 
            className="text-white hover:text-primary transition-colors"
            onClick={togglePlay}
          >
            {isPlaying ? <Pause className="h-8 w-8" /> : <Play className="h-8 w-8" />}
          </button>
          
          <button 
            className="text-white hover:text-primary transition-colors"
            onClick={skipForward}
          >
            <SkipForward className="h-6 w-6" />
          </button>
          
          <button 
            className="text-white hover:text-primary transition-colors"
            onClick={toggleMute}
          >
            {isMuted ? <VolumeX className="h-6 w-6" /> : <Volume2 className="h-6 w-6" />}
          </button>
          
          <button 
            className="text-white hover:text-primary transition-colors"
            onClick={toggleFullscreen}
          >
            <Maximize className="h-6 w-6" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default SimpleVideoPlayer;