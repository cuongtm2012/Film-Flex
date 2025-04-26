import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Info, Settings, Play, Pause, SkipForward, Volume2, VolumeX, Subtitles, Maximize } from "lucide-react";
import { Movie } from "@shared/schema";
import { useLocation } from "wouter";
import { getDriveVideoStreamingUrl, extractDriveFileId, isValidDriveFileId } from "@/lib/driveHelper";

// Import Video.js styles
import "video.js/dist/video-js.css";

// We use dynamic import to avoid SSR issues
const videojs = async () => {
  const module = await import("video.js");
  return module.default;
};

interface VideoPlayerProps {
  movie: Movie;
  onClose: () => void;
}

const VideoPlayer = ({ movie, onClose }: VideoPlayerProps) => {
  const [, setLocation] = useLocation();
  const videoRef = useRef<HTMLVideoElement>(null);
  const playerRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState("00:00");
  const [duration, setDuration] = useState("00:00");
  const [progress, setProgress] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeout = useRef<NodeJS.Timeout | null>(null);

  // Initialize Video.js player
  useEffect(() => {
    let player: any;
    
    const initPlayer = async () => {
      try {
        setLoading(true);
        const videojs = await import("video.js").then(mod => mod.default);
        
        if (videoRef.current) {
          // Check if this is a Google Drive video (either from videoUrl field or videoSources)
          let sources = [];
          
          if (movie.videoUrl) {
            // If we have a videoUrl that's a Google Drive ID, prioritize it
            if (isValidDriveFileId(movie.videoUrl)) {
              const streamingUrl = await getDriveVideoStreamingUrl(movie.videoUrl);
              sources.push({
                src: streamingUrl,
                type: "video/mp4"
              });
            } else if (extractDriveFileId(movie.videoUrl)) {
              const fileId = extractDriveFileId(movie.videoUrl)!;
              const streamingUrl = await getDriveVideoStreamingUrl(fileId);
              sources.push({
                src: streamingUrl,
                type: "video/mp4"
              });
            }
          }
          
          // If no Drive URL found or we couldn't process it, fall back to videoSources
          // If no Google Drive source found, try to use regular videoSources
          if (sources.length === 0 && movie.videoSources) {
            try {
              const videoSourcesArray = movie.videoSources as any[];
              if (Array.isArray(videoSourcesArray)) {
                sources = videoSourcesArray.map(source => {
                  if (typeof source === 'object' && source.url) {
                    // Determine content type based on URL
                    const sourceUrl = source.url;
                    const isHLS = sourceUrl.includes('.m3u8');
                    
                    // Set appropriate video type
                    let videoType = "video/mp4";
                    if (isHLS) {
                      videoType = "application/x-mpegURL";
                    }
                    
                    return {
                      src: sourceUrl,
                      type: videoType
                    };
                  }
                  return null;
                }).filter(Boolean);
              }
            } catch (error) {
              console.error("Error parsing videoSources:", error);
            }
          }
          
          // Fallback source if all else fails
          if (sources.length === 0) {
            console.warn("No valid video sources found for movie:", movie.title);
            sources = [{
              src: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8",
              type: "application/x-mpegURL"
            }];
          }
          
          player = videojs(videoRef.current, {
            autoplay: true,
            controls: false, // We'll use custom controls
            responsive: true,
            fluid: true,
            sources: sources
          });
          
          playerRef.current = player;
          
          player.on("loadedmetadata", () => {
            setLoading(false);
            setPlaying(true);
            const totalSeconds = Math.floor(player.duration());
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            setDuration(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
          });
          
          player.on("timeupdate", () => {
            const current = Math.floor(player.currentTime());
            const totalSeconds = Math.floor(player.duration());
            const minutes = Math.floor(current / 60);
            const seconds = current % 60;
            setCurrentTime(`${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`);
            setProgress((current / totalSeconds) * 100);
          });
          
          player.on("volumechange", () => {
            setVolume(player.volume());
            setMuted(player.muted());
          });
          
          player.on("play", () => {
            setPlaying(true);
          });
          
          player.on("pause", () => {
            setPlaying(false);
          });
          
          player.on("ended", () => {
            setPlaying(false);
          });
        }
      } catch (error) {
        console.error("Failed to load video player:", error);
        setLoading(false);
      }
    };
    
    initPlayer();
    
    return () => {
      if (playerRef.current) {
        playerRef.current.dispose();
        playerRef.current = null;
      }
    };
  }, [movie]);
  
  // Handle controls visibility
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
      
      controlsTimeout.current = setTimeout(() => {
        if (playing) {
          setShowControls(false);
        }
      }, 3000);
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      if (controlsTimeout.current) {
        clearTimeout(controlsTimeout.current);
      }
    };
  }, [playing]);
  
  const togglePlay = () => {
    if (playerRef.current) {
      if (playing) {
        playerRef.current.pause();
      } else {
        playerRef.current.play();
      }
    }
  };
  
  const toggleMute = () => {
    if (playerRef.current) {
      playerRef.current.muted(!muted);
    }
  };
  
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    if (playerRef.current) {
      playerRef.current.volume(value);
    }
  };
  
  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (playerRef.current) {
      const progressBar = e.currentTarget;
      const rect = progressBar.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      const duration = playerRef.current.duration();
      playerRef.current.currentTime(duration * pos);
    }
  };
  
  const handleFullscreen = () => {
    if (playerRef.current) {
      if (playerRef.current.isFullscreen()) {
        playerRef.current.exitFullscreen();
      } else {
        playerRef.current.requestFullscreen();
      }
    }
  };

  return (
    <section className="fixed inset-0 bg-[#141414] z-50">
      <div className="relative h-full flex flex-col">
        {/* Video player header */}
        <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
          <div className="flex items-center justify-between px-4 py-4">
            <button className="text-white" onClick={onClose}>
              <ArrowLeft className="h-6 w-6" />
            </button>
            <div className="flex items-center space-x-4">
              <button className="text-white">
                <Info className="h-5 w-5" />
              </button>
              <button className="text-white">
                <Settings className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        
        {/* Video player */}
        <div className="w-full h-full flex items-center justify-center bg-black">
          <div className="relative w-full h-full max-h-screen" onClick={togglePlay}>
            {loading ? (
              <div className="w-full h-full bg-[#181818] flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#E50914] mx-auto mb-4"></div>
                  <p className="text-white text-lg">Loading video...</p>
                </div>
              </div>
            ) : (
              <video
                ref={videoRef}
                className="video-js vjs-big-play-centered w-full h-full"
                playsInline
              />
            )}
            
            {/* Custom Play Button (shown when paused) */}
            {!loading && !playing && (
              <div 
                className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center cursor-pointer"
                onClick={togglePlay}
              >
                <button className="w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                  <Play className="h-10 w-10 text-white" />
                </button>
              </div>
            )}
            
            {/* Video Controls (bottom of player) */}
            <div className={`absolute bottom-0 left-0 right-0 px-4 py-3 bg-gradient-to-t from-black to-transparent transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
              {/* Progress bar */}
              <div 
                className="relative w-full h-1 bg-[#6D6D6D] mb-3 cursor-pointer group"
                onClick={handleProgressClick}
              >
                <div 
                  className="absolute left-0 top-0 h-full bg-[#E50914]"
                  style={{ width: `${progress}%` }}
                ></div>
                <div 
                  className="absolute h-3 w-3 rounded-full bg-[#E50914] -top-1 opacity-0 group-hover:opacity-100 transition"
                  style={{ left: `${progress}%`, marginLeft: '-6px' }}
                ></div>
              </div>
              
              {/* Controls */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button className="text-white" onClick={togglePlay}>
                    {playing ? (
                      <Pause className="h-5 w-5" />
                    ) : (
                      <Play className="h-5 w-5" />
                    )}
                  </button>
                  <button className="text-white">
                    <SkipForward className="h-5 w-5" />
                  </button>
                  <button className="text-white" onClick={toggleMute}>
                    {muted ? (
                      <VolumeX className="h-5 w-5" />
                    ) : (
                      <Volume2 className="h-5 w-5" />
                    )}
                  </button>
                  <span className="text-white text-sm">{currentTime} / {duration}</span>
                </div>
                
                <div className="flex items-center space-x-4">
                  <button className="text-white text-sm px-2 py-1 border border-white rounded">
                    HD
                  </button>
                  <button className="text-white">
                    <Subtitles className="h-5 w-5" />
                  </button>
                  <button className="text-white" onClick={handleFullscreen}>
                    <Maximize className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default VideoPlayer;
