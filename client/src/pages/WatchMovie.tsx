import { useRef, useState, useEffect } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Subtitles, 
  Moon, 
  Sun, 
  ChevronLeft, 
  ChevronRight,
  Settings,
  List,
  X
} from "lucide-react";
import Navbar from "@/components/Navbar";
import { API_BASE_URL, Movie } from "@/lib/constants";
import { convertToDirectStreamingUrl } from "@/lib/googleDriveApi";
import { getDriveVideoStreamingUrl, extractDriveFileId, isValidDriveFileId } from "@/lib/driveHelper";
import { useLanguage } from "@/hooks/use-language";

// Placeholder subtitles - this will be loaded dynamically from the API in the future
const subtitlesData = {
  en: [] as { id: number, start: number, end: number, text: string }[],
  vi: [] as { id: number, start: number, end: number, text: string }[]
};

// Placeholder transcript - this will be loaded dynamically from the API in the future
const transcriptData: { id: number, time: number, speaker: string, text: string }[] = [];

// Video playback speeds
const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

const WatchMovie = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/watch/:id");
  const movieId = match ? parseInt(params.id) : null;
  const { language } = useLanguage();
  
  // UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isNightMode, setIsNightMode] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Advanced features state
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [subtitleLanguage, setSubtitleLanguage] = useState<'en' | 'vi'>('en');
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  // References
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  
  // Fetch movie details
  const { data: movie, isLoading, error, isError } = useQuery<Movie>({
    queryKey: [`${API_BASE_URL}/movie/${movieId}`], // Fixed incorrect endpoint
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movieId,
  });
  
  // Handle going back to movie details
  const handleBack = () => {
    setLocation(`/movie/${movieId}`);
  };
  
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
  
  // Handle video progress updates
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Find current subtitle
      if (subtitleEnabled) {
        const currentSubs = subtitlesData[subtitleLanguage];
        if (currentSubs.length > 0) {
          const activeSub = currentSubs.find(
            sub => videoRef.current!.currentTime >= sub.start && videoRef.current!.currentTime <= sub.end
          );
          setCurrentSubtitle(activeSub ? activeSub.text : '');
        }
      } else {
        setCurrentSubtitle('');
      }
    }
  };
  
  // Handle video metadata load
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };
  
  // Change volume
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
      setMuted(newVolume === 0);
    }
  };
  
  // Seek video to a specific time
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (videoRef.current && progressRef.current) {
      const progressRect = progressRef.current.getBoundingClientRect();
      const seekPosition = (e.clientX - progressRect.left) / progressRect.width;
      const seekTime = seekPosition * duration;
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  };
  
  // Format time for display (mm:ss)
  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
  };
  
  // Toggle night mode
  const toggleNightMode = () => {
    setIsNightMode(!isNightMode);
  };
  
  // Toggle subtitles
  const toggleSubtitles = () => {
    setSubtitleEnabled(!subtitleEnabled);
  };
  
  // Change subtitle language
  const toggleSubtitleLanguage = () => {
    setSubtitleLanguage(subtitleLanguage === 'en' ? 'vi' : 'en');
  };
  
  // Set playback speed
  const changePlaybackSpeed = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
      setShowSpeedOptions(false);
    }
  };
  
  // Auto-hide controls after inactivity
  useEffect(() => {
    const hideControls = () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      
      if (isPlaying) {
        const timeout = setTimeout(() => {
          setShowControls(false);
        }, 3000);
        setControlsTimeout(timeout);
      }
    };
    
    const handleMouseMove = () => {
      setShowControls(true);
      hideControls();
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('mousemove', handleMouseMove);
    }
    
    hideControls();
    
    return () => {
      if (controlsTimeout) {
        clearTimeout(controlsTimeout);
      }
      if (container) {
        container.removeEventListener('mousemove', handleMouseMove);
      }
    };
  }, [isPlaying, controlsTimeout]);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (videoRef.current) {
        switch (e.key) {
          case ' ': // Space - play/pause
            togglePlay();
            break;
          case 'ArrowRight': // Right arrow - forward 10s
            videoRef.current.currentTime += 10;
            break;
          case 'ArrowLeft': // Left arrow - back 10s
            videoRef.current.currentTime -= 10;
            break;
          case 'm': // M - mute/unmute
            toggleMute();
            break;
          case 'f': // F - fullscreen
            if (document.fullscreenElement) {
              document.exitFullscreen();
            } else {
              containerRef.current?.requestFullscreen();
            }
            break;
          case 's': // S - toggle subtitles
            toggleSubtitles();
            break;
          case 'n': // N - toggle night mode
            toggleNightMode();
            break;
          case 't': // T - toggle transcript
            setTranscriptOpen(!transcriptOpen);
            break;
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isPlaying, muted, transcriptOpen]);
  
  // Get the highest quality video source
  const getVideoSource = async () => {
    if (!movie) return '';
    
    try {
      // Check if we have videoUrl from the database
      if (movie.videoUrl) {
        // Case 1: Direct Google Drive file ID
        if (isValidDriveFileId(movie.videoUrl)) {
          return await getDriveVideoStreamingUrl(movie.videoUrl);
        }
        
        // Case 2: Google Drive URL that needs extraction
        const fileId = extractDriveFileId(movie.videoUrl);
        if (fileId) {
          return await getDriveVideoStreamingUrl(fileId);
        }
        
        // Case 3: Direct video URL (not Google Drive)
        if (movie.videoUrl.startsWith('http')) {
          return movie.videoUrl;
        }
      }
    } catch (error) {
      console.error('Error processing video source:', error);
      // Fall through to videoSources if primary source fails
    }
    
    // Second priority: Check traditional videoSources
    if (movie.videoSources && movie.videoSources.length > 0) {
      try {
        // Sort by quality (assuming higher numbers = better quality)
        const sortedSources = [...movie.videoSources].sort((a, b) => {
          const qualityA = parseInt(a.quality.replace('p', '')) || 0;
          const qualityB = parseInt(b.quality.replace('p', '')) || 0;
          return qualityB - qualityA;
        });
        
        // Convert to direct streaming URL if it's a Google Drive link
        const sourceUrl = sortedSources[0].url;
        if (sourceUrl.includes('drive.google.com')) {
          try {
            // Use our development-mode friendly function for Google Drive URLs
            const fileId = extractDriveFileId(sourceUrl);
            if (fileId) {
              return await getDriveVideoStreamingUrl(fileId);
            }
            return convertToDirectStreamingUrl(sourceUrl);
          } catch (e) {
            console.error('Error converting Google Drive URL:', e);
            return sourceUrl; // Use original URL as fallback
          }
        }
        
        return sourceUrl;
      } catch (error) {
        console.error('Error processing videoSources:', error);
      }
    }
    
    // No hardcoded fallback - rely on the database data
    console.warn('No video source found for this movie');
    
    return '';
  };
  
  // Current video source state
  const [videoSrc, setVideoSrc] = useState('');
  
  // Load video source when movie data changes
  useEffect(() => {
    if (movie) {
      getVideoSource().then(src => setVideoSrc(src));
    }
  }, [movie]);
  
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
            {movieId && movieId > 10 
              ? "This movie is no longer available or might have been removed from our catalog." 
              : "We couldn't load the movie you're looking for. Please try again later."}
          </p>
          <div className="flex gap-4 justify-center">
            <button 
              className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
              onClick={() => setLocation("/movie/" + movieId)}
            >
              Back to Details
            </button>
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
    <div className={`min-h-screen ${isNightMode ? 'bg-black' : 'bg-zinc-100'} transition-colors duration-300`}>
      <Navbar />
      
      {/* Video title and info */}
      <div className={`max-w-7xl mx-auto px-4 py-4 ${isNightMode ? 'text-white' : 'text-black'}`}>
        <div className="mb-2 text-2xl font-semibold">{movie.title}</div>
        <div className={`${isNightMode ? 'text-gray-400' : 'text-gray-600'} text-sm mb-4`}>
          {movie.description.slice(0, 100)}...
        </div>
      </div>
      
      {/* Main video player with controls */}
      <div 
        ref={containerRef}
        className={`relative max-w-7xl mx-auto ${isNightMode ? 'bg-black' : 'bg-zinc-900'} mb-4`}
      >
        <div className="aspect-video w-full relative">
          {/* Video element */}
          <video
            ref={videoRef}
            className="w-full h-full object-contain"
            src={videoSrc}
            poster={movie.backdropUrl}
            preload="auto"
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleMetadataLoaded}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
          />
          
          {/* Subtitles overlay - centered at bottom of video */}
          {subtitleEnabled && currentSubtitle && (
            <div className="absolute bottom-20 left-0 right-0 text-center z-10 pointer-events-none">
              <div className="inline-block bg-black/70 px-4 py-2 rounded-md text-white text-lg max-w-[80%] mx-auto">
                {currentSubtitle}
              </div>
            </div>
          )}
          
          {/* Play overlay with big centered play button */}
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer z-10"
              onClick={togglePlay}
            >
              <div className="text-8xl text-white/90 select-none">
                <div className="flex items-center justify-center w-24 h-24 rounded-full bg-black/30">
                  <Play className="h-12 w-12 fill-white text-white" />
                </div>
              </div>
            </div>
          )}
          
          {/* Video controls bar - shows when mouse moves or paused */}
          <div className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent pt-10 pb-2 px-4 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
            {/* Progress bar */}
            <div 
              ref={progressRef}
              className="h-2 bg-gray-600 rounded-full mb-4 cursor-pointer relative"
              onClick={handleSeek}
            >
              <div 
                className="absolute top-0 left-0 h-full bg-red-600 rounded-full"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
              <div 
                className="absolute top-0 h-4 w-4 bg-red-600 rounded-full -mt-1 shadow"
                style={{ left: `${(currentTime / duration) * 100}%` }}
              />
            </div>
            
            {/* Controls row */}
            <div className="flex items-center justify-between">
              {/* Left side controls */}
              <div className="flex items-center space-x-4">
                {/* Play/Pause button */}
                <button onClick={togglePlay} className="text-white hover:text-red-500 transition-colors">
                  {isPlaying ? (
                    <Pause className="h-6 w-6" />
                  ) : (
                    <Play className="h-6 w-6" />
                  )}
                </button>
                
                {/* Skip backward/forward */}
                <button 
                  onClick={() => videoRef.current && (videoRef.current.currentTime -= 10)}
                  className="text-white hover:text-red-500 transition-colors"
                >
                  <ChevronLeft className="h-6 w-6" />
                  <span className="absolute text-xs font-bold">10</span>
                </button>
                
                <button 
                  onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
                  className="text-white hover:text-red-500 transition-colors"
                >
                  <ChevronRight className="h-6 w-6" />
                  <span className="absolute text-xs font-bold">10</span>
                </button>
                
                {/* Volume control */}
                <div className="flex items-center space-x-2">
                  <button onClick={toggleMute} className="text-white hover:text-red-500 transition-colors">
                    {muted || volume === 0 ? (
                      <VolumeX className="h-6 w-6" />
                    ) : (
                      <Volume2 className="h-6 w-6" />
                    )}
                  </button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={muted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 accent-red-600"
                  />
                </div>
                
                {/* Time display */}
                <div className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>
              </div>
              
              {/* Right side controls */}
              <div className="flex items-center space-x-3">
                {/* Subtitle toggle */}
                <button 
                  onClick={toggleSubtitles}
                  className={`p-2 rounded-full ${subtitleEnabled ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} hover:bg-red-700 transition-colors`}
                  title={subtitleEnabled ? 'Disable subtitles' : 'Enable subtitles'}
                >
                  <Subtitles className="h-4 w-4" />
                </button>
                
                {/* Transcript toggle */}
                <button 
                  onClick={() => setTranscriptOpen(!transcriptOpen)}
                  className={`p-2 rounded-full ${transcriptOpen ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} hover:bg-red-700 transition-colors`}
                  title="Toggle transcript"
                >
                  <List className="h-4 w-4" />
                </button>
                
                {/* Night mode toggle */}
                <button 
                  onClick={toggleNightMode}
                  className={`p-2 rounded-full ${isNightMode ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} hover:bg-red-700 transition-colors`}
                  title={isNightMode ? 'Disable night mode' : 'Enable night mode'}
                >
                  {isNightMode ? (
                    <Sun className="h-4 w-4" />
                  ) : (
                    <Moon className="h-4 w-4" />
                  )}
                </button>
                
                {/* Settings button */}
                <div className="relative">
                  <button 
                    onClick={() => setIsSettingsOpen(!isSettingsOpen)}
                    className={`p-2 rounded-full ${isSettingsOpen ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'} hover:bg-red-700 transition-colors`}
                    title="Settings"
                  >
                    <Settings className="h-4 w-4" />
                  </button>
                  
                  {/* Settings dropdown */}
                  {isSettingsOpen && (
                    <div className="absolute bottom-full right-0 mb-2 bg-zinc-900 shadow-lg rounded-md w-56 overflow-hidden z-30">
                      <div className="px-4 py-2 border-b border-zinc-800 flex justify-between items-center">
                        <h3 className="text-white font-medium">Settings</h3>
                        <button onClick={() => setIsSettingsOpen(false)} className="text-gray-400 hover:text-white">
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Setting options */}
                      <div className="p-2">
                        {/* Subtitle language */}
                        <div className="flex justify-between items-center p-2 hover:bg-zinc-800 rounded">
                          <span className="text-white text-sm">Subtitle Language</span>
                          <button 
                            onClick={toggleSubtitleLanguage}
                            className="px-2 py-1 bg-zinc-700 rounded text-xs text-white"
                          >
                            {subtitleLanguage === 'en' ? 'English' : 'Vietnamese'}
                          </button>
                        </div>
                        
                        {/* Playback speed */}
                        <div className="flex justify-between items-center p-2 hover:bg-zinc-800 rounded relative">
                          <span className="text-white text-sm">Playback Speed</span>
                          <button 
                            onClick={() => setShowSpeedOptions(!showSpeedOptions)}
                            className="px-2 py-1 bg-zinc-700 rounded text-xs text-white"
                          >
                            {playbackSpeed}x
                          </button>
                          
                          {/* Speed options */}
                          {showSpeedOptions && (
                            <div className="absolute right-0 bottom-full mb-2 bg-zinc-900 rounded shadow-lg z-20 p-1">
                              {speeds.map(speed => (
                                <button
                                  key={speed}
                                  onClick={() => changePlaybackSpeed(speed)}
                                  className={`block w-full text-left px-3 py-2 text-sm ${playbackSpeed === speed ? 'bg-red-600 text-white' : 'text-white hover:bg-zinc-800'} rounded`}
                                >
                                  {speed}x
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Transcript panel - slides in from right */}
      <div 
        className={`fixed top-16 right-0 bottom-0 w-80 bg-zinc-900 text-white transform transition-transform duration-300 ease-in-out overflow-y-auto z-20 ${
          transcriptOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="sticky top-0 bg-zinc-900 border-b border-zinc-800 p-4 flex justify-between items-center">
          <h3 className="font-semibold">Transcript</h3>
          <button 
            onClick={() => setTranscriptOpen(false)}
            className="text-gray-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="p-4">
          {mockTranscript.map(entry => (
            <div 
              key={entry.id} 
              className={`mb-4 p-3 rounded ${currentTime >= entry.time && currentTime < entry.time + 15 ? 'bg-red-600/20 border-l-2 border-red-600' : 'hover:bg-zinc-800'} cursor-pointer`}
              onClick={() => videoRef.current && (videoRef.current.currentTime = entry.time)}
            >
              <div className="flex justify-between text-xs text-gray-400 mb-1">
                <span>{entry.speaker}</span>
                <span>{formatTime(entry.time)}</span>
              </div>
              <p className="text-sm">{entry.text}</p>
            </div>
          ))}
        </div>
      </div>
      
      {/* Video stats */}
      <div className={`max-w-7xl mx-auto px-4 mb-8 ${isNightMode ? 'text-white' : 'text-black'}`}>
        <div className="flex gap-2 text-sm">
          <div className="py-1 px-2 bg-red-600 text-white rounded-sm">#1</div>
          <div className={`py-1 px-2 ${isNightMode ? 'bg-zinc-800 text-white' : 'bg-zinc-200 text-black'} rounded-sm`}>#2</div>
        </div>
        <div className={`flex items-center gap-2 mt-3 text-sm ${isNightMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <div className="flex items-center">
            <span className={isNightMode ? 'text-white' : 'text-black'} style={{fontWeight: 500, marginRight: '4px'}}>{movie.imdbRating || '0.0'}</span>
            <span className="text-yellow-500">★</span>
          </div>
          <div>{movie.duration} min</div>
          <div>{movie.releaseYear}</div>
        </div>
        
        {/* Movie description */}
        <div className="mt-6">
          <p className={isNightMode ? 'text-gray-300' : 'text-gray-700'}>{movie.description}</p>
        </div>
        
        {/* Movie hashtags */}
        <div className="mt-6 flex flex-wrap gap-2">
          {movie.director && (
            <span className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
              isNightMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-black'
            }`}>
              {movie.director}
            </span>
          )}
          {movie.cast?.slice(0, 2).map((actor: string, index: number) => (
            <span 
              key={index} 
              className={`px-3 py-1 rounded-full text-sm cursor-pointer ${
                isNightMode ? 'bg-zinc-800 hover:bg-zinc-700 text-white' : 'bg-zinc-200 hover:bg-zinc-300 text-black'
              }`}
            >
              {actor}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default WatchMovie;
