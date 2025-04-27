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
  X,
  Heart,
  Share2,
  Plus,
  MessageSquare,
  ThumbsUp
} from "lucide-react";
import { API_BASE_URL, Movie } from "@/lib/constants";
import { getDriveVideoStreamingUrl, extractDriveFileId, isValidDriveFileId } from "@/lib/driveHelper";
import { useLanguage } from "@/hooks/use-language";
import { useAuth } from "@/hooks/use-auth";

// Placeholder subtitles - to be loaded dynamically from the API in the future
const subtitlesData = {
  en: [] as { id: number, start: number, end: number, text: string }[],
  vi: [] as { id: number, start: number, end: number, text: string }[]
};

// Placeholder transcript - to be loaded dynamically from the API in the future
const transcriptData: { id: number, time: number, speaker: string, text: string }[] = [];

// Video playback speeds
const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

// Sample recommended movies - this would come from the API in production
const recommendedMovies = [
  { id: 1, title: "Kung Fu Panda 4", thumbnailUrl: "https://m.media-amazon.com/images/M/MV5BYmFkMDU2NTMtNTQ3Yy00NGQ2LTg5ZTMtZDNjOWY0NjFmZWYyXkEyXkFqcGdeQXVyMTEyNzQ1MTk0._V1_.jpg", duration: "94 min" },
  { id: 2, title: "Godzilla x Kong", thumbnailUrl: "https://m.media-amazon.com/images/M/MV5BNzFkNWNlZTktZjQ5Ni00ZjViLWFkZTUtMzNiMzgwYTgzYWY3XkEyXkFqcGdeQXVyMTU0Mjc4MTY1._V1_.jpg", duration: "115 min" },
  { id: 3, title: "Dune: Part Two", thumbnailUrl: "https://m.media-amazon.com/images/M/MV5BN2QyY2E0NTUtMzA3ZS00MzIzLWJhNDEtNDRlYjEwYzFkZDYxXkEyXkFqcGdeQXVyODk4OTc3MTY@._V1_.jpg", duration: "166 min" },
  { id: 4, title: "Deadpool & Wolverine", thumbnailUrl: "https://m.media-amazon.com/images/M/MV5BMDZiMmE1ODQtZTRjYS00NDA2LWI4NWItODIzODlkZWY4NTIwXkEyXkFqcGdeQXVyMDM2NDM2MQ@@._V1_.jpg", duration: "127 min" },
];

// Sample comments - this would come from the API in production
const comments = [
  { id: 1, user: "MovieFan123", avatar: "M", content: "This was such an amazing movie! The visual effects were spectacular.", timestamp: "2 days ago", likes: 24 },
  { id: 2, user: "CinemaLover", avatar: "C", content: "I'd give it a solid 8/10. Great storyline but the ending felt a bit rushed.", timestamp: "1 week ago", likes: 15 },
  { id: 3, user: "FilmCritic", avatar: "F", content: "The cinematography deserves an award, absolutely stunning visuals throughout.", timestamp: "3 weeks ago", likes: 42 },
];

const MovieStreamingPage = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/movie/:id");
  const movieId = match ? parseInt(params.id) : null;
  const { language } = useLanguage();
  const { user } = useAuth();
  
  // UI state
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isNightMode, setIsNightMode] = useState(true);
  const [showControls, setShowControls] = useState(true);
  const [transcriptOpen, setTranscriptOpen] = useState(false);
  const [controlsTimeout, setControlsTimeout] = useState<NodeJS.Timeout | null>(null);
  const [commentText, setCommentText] = useState("");
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
    queryKey: [`${API_BASE_URL}/movie/${movieId}`],
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
  
  // Get the video source
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
    }
    
    // Check traditional videoSources
    if (movie.videoSources && movie.videoSources.length > 0) {
      try {
        // Sort by quality (assuming higher numbers = better quality)
        const sortedSources = [...movie.videoSources].sort((a, b) => {
          const qualityA = parseInt(a.quality.replace('p', '')) || 0;
          const qualityB = parseInt(b.quality.replace('p', '')) || 0;
          return qualityB - qualityA;
        });
        
        const sourceUrl = sortedSources[0].url;
        if (sourceUrl.includes('drive.google.com')) {
          const fileId = extractDriveFileId(sourceUrl);
          if (fileId) {
            return await getDriveVideoStreamingUrl(fileId);
          }
        }
        
        return sourceUrl;
      } catch (error) {
        console.error('Error processing videoSources:', error);
      }
    }
    
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

  // Handle comment submission
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (commentText.trim()) {
      // Here you would normally send the comment to the API
      alert(`Comment submitted: ${commentText}`);
      setCommentText('');
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
              className="px-4 py-2 bg-zinc-700 text-white rounded hover:bg-zinc-600"
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
      {/* Header/Navigation */}
      <header className="bg-zinc-900 shadow-md py-3">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center">
            <a href="/" className="flex items-center">
              <span className="text-red-600 text-3xl font-bold">FilmFlex</span>
            </a>
            
            {/* Navigation Links - Hidden on mobile */}
            <nav className="hidden md:flex ml-10 space-x-6">
              <a href="/genre" className="text-gray-300 hover:text-white transition-colors">Genre</a>
              <a href="/movies" className="text-gray-300 hover:text-white transition-colors">Movies</a>
              <a href="/series" className="text-gray-300 hover:text-white transition-colors">Series</a>
              <a href="/country" className="text-gray-300 hover:text-white transition-colors">Country</a>
              <a href="/actors" className="text-gray-300 hover:text-white transition-colors">Actors</a>
              <a href="/schedule" className="text-gray-300 hover:text-white transition-colors">Schedule</a>
            </nav>
          </div>
          
          {/* Search Bar */}
          <div className="hidden md:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <input 
                type="text" 
                placeholder="Search movies, actors..."
                className="w-full py-1.5 pl-10 pr-4 rounded-full bg-zinc-800 text-gray-300 focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
          
          {/* User Account & Controls */}
          <div className="flex items-center space-x-4">
            <button className="text-gray-300 hover:text-white md:hidden">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </button>
            <button className="text-gray-300 hover:text-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            <a href="/profile" className="flex items-center space-x-1">
              <div className="w-8 h-8 rounded-full bg-red-600 flex items-center justify-center text-white font-medium">
                U
              </div>
              <span className="hidden md:inline text-sm text-gray-300">Account</span>
            </a>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-6 flex flex-col lg:flex-row">
        {/* Main Content Column */}
        <div className="w-full lg:w-3/4 lg:pr-6">
          {/* Video title and path */}
          <div className="mb-4 text-sm text-gray-400">
            <button onClick={handleBack} className="hover:text-red-500 transition-colors">
              Back to movie
            </button>
            <span> / {movie.title}</span>
          </div>
          
          {/* Main video player with controls */}
          <div 
            ref={containerRef}
            className="relative bg-black mb-4 rounded-lg overflow-hidden shadow-xl"
          >
            <div className="aspect-video w-full relative">
              {/* Video element */}
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                src={videoSrc}
                poster={movie.backdropUrl || movie.posterUrl}
                preload="auto"
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleMetadataLoaded}
                onPlay={() => setIsPlaying(true)}
                onPause={() => setIsPlaying(false)}
                onEnded={() => setIsPlaying(false)}
              />
              
              {/* Subtitles overlay */}
              {subtitleEnabled && currentSubtitle && (
                <div className="absolute bottom-20 left-0 right-0 text-center z-10 pointer-events-none">
                  <div className="inline-block bg-black/70 px-4 py-2 rounded-md text-white text-lg max-w-[80%] mx-auto">
                    {currentSubtitle}
                  </div>
                </div>
              )}
              
              {/* Play overlay */}
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
              
              {/* Video controls bar */}
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
                      className="text-white hover:text-red-500 transition-colors relative"
                    >
                      <ChevronLeft className="h-6 w-6" />
                      <span className="absolute text-xs font-bold">10</span>
                    </button>
                    
                    <button 
                      onClick={() => videoRef.current && (videoRef.current.currentTime += 10)}
                      className="text-white hover:text-red-500 transition-colors relative"
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
                              <span className="text-sm text-gray-300">Subtitle language</span>
                              <button 
                                onClick={toggleSubtitleLanguage}
                                className="px-2 py-1 bg-zinc-700 rounded text-xs text-white"
                              >
                                {subtitleLanguage === 'en' ? 'English' : 'Vietnamese'}
                              </button>
                            </div>
                            
                            {/* Playback speed */}
                            <div className="relative">
                              <div className="flex justify-between items-center p-2 hover:bg-zinc-800 rounded cursor-pointer"
                                onClick={() => setShowSpeedOptions(!showSpeedOptions)}
                              >
                                <span className="text-sm text-gray-300">Playback speed</span>
                                <span className="px-2 py-1 bg-zinc-700 rounded text-xs text-white">
                                  {playbackSpeed}x
                                </span>
                              </div>
                              
                              {/* Speed options dropdown */}
                              {showSpeedOptions && (
                                <div className="absolute right-0 mt-1 bg-zinc-900 shadow-lg rounded-md w-full z-10">
                                  {speeds.map((speed) => (
                                    <button 
                                      key={speed}
                                      className={`block w-full text-left px-4 py-2 text-sm ${playbackSpeed === speed ? 'bg-red-600 text-white' : 'text-gray-300 hover:bg-zinc-800'}`}
                                      onClick={() => changePlaybackSpeed(speed)}
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
          
          {/* Movie actions */}
          <div className="flex items-center justify-between mb-6 bg-zinc-900 p-4 rounded-lg">
            <div className="flex items-center space-x-6">
              <button className="flex items-center space-x-2 text-white hover:text-red-500 transition-colors">
                <ThumbsUp className="h-5 w-5" />
                <span>Like</span>
              </button>
              <button className="flex items-center space-x-2 text-white hover:text-red-500 transition-colors">
                <Share2 className="h-5 w-5" />
                <span>Share</span>
              </button>
              <button className="flex items-center space-x-2 text-white hover:text-red-500 transition-colors">
                <Plus className="h-5 w-5" />
                <span>Add to List</span>
              </button>
            </div>
            <button className="flex items-center space-x-2 text-white hover:text-red-500 transition-colors">
              <Heart className="h-5 w-5" />
              <span>Favorite</span>
            </button>
          </div>
          
          {/* Movie details */}
          <div className="mb-8 bg-zinc-900 p-6 rounded-lg">
            <h1 className="text-2xl font-bold mb-2">{movie.title}</h1>
            <div className="flex flex-wrap items-center text-sm text-gray-400 mb-4">
              <span className="mr-3">{movie.releaseYear}</span>
              <span className="mr-3">{movie.genreIds && movie.genreIds.length > 0 ? `${movie.genreIds.length} genres` : 'No genre info'}</span>
              <span className="bg-red-600 text-white px-2 py-0.5 rounded text-xs">HD</span>
            </div>
            <p className="text-gray-300 mb-4">{movie.description}</p>
            
            <div className="flex flex-col md:flex-row md:space-x-12">
              <div className="mb-4 md:mb-0">
                <h3 className="text-gray-400 font-medium mb-2">Release Year</h3>
                <p className="text-white">{movie.releaseYear || 'Unknown'}</p>
              </div>
              <div className="mb-4 md:mb-0">
                <h3 className="text-gray-400 font-medium mb-2">Duration</h3>
                <p className="text-white">{movie.duration ? `${movie.duration} min` : 'Unknown'}</p>
              </div>
              <div>
                <h3 className="text-gray-400 font-medium mb-2">Genre IDs</h3>
                <p className="text-white">{movie.genreIds?.join(', ') || 'No genre information available'}</p>
              </div>
            </div>
          </div>
          
          {/* Comments section */}
          <div className="mb-8 bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Comments
            </h2>
            
            {/* Comment form */}
            {user ? (
              <form onSubmit={handleCommentSubmit} className="mb-6">
                <div className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                    {user.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <textarea 
                      value={commentText}
                      onChange={(e) => setCommentText(e.target.value)}
                      placeholder="Share your thoughts..."
                      className="w-full bg-zinc-800 border border-zinc-700 rounded-lg p-3 text-white resize-none focus:outline-none focus:ring-1 focus:ring-red-500"
                      rows={3}
                    ></textarea>
                    <button 
                      type="submit"
                      className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      Post Comment
                    </button>
                  </div>
                </div>
              </form>
            ) : (
              <div className="p-4 bg-zinc-800 rounded-lg mb-6 text-center">
                <p className="text-gray-300 mb-2">Sign in to leave a comment</p>
                <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                  Sign In
                </button>
              </div>
            )}
            
            {/* Existing comments */}
            <div className="space-y-6">
              {comments.map((comment) => (
                <div key={comment.id} className="flex items-start space-x-3">
                  <div className="w-10 h-10 rounded-full bg-red-600 flex items-center justify-center flex-shrink-0">
                    {comment.avatar}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center mb-1">
                      <span className="font-medium text-white mr-2">{comment.user}</span>
                      <span className="text-xs text-gray-400">{comment.timestamp}</span>
                    </div>
                    <p className="text-gray-300 mb-2">{comment.content}</p>
                    <div className="flex items-center text-sm text-gray-400">
                      <button className="flex items-center hover:text-red-500 transition-colors">
                        <ThumbsUp className="h-4 w-4 mr-1" />
                        <span>{comment.likes}</span>
                      </button>
                      <button className="ml-4 hover:text-red-500 transition-colors">Reply</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-full lg:w-1/4">
          <div className="bg-zinc-900 p-4 rounded-lg mb-4">
            <h3 className="text-lg font-bold mb-4">Recommended</h3>
            <div className="space-y-4">
              {recommendedMovies.map((rec) => (
                <a 
                  key={rec.id}
                  href={`/movie/${rec.id}`} 
                  className="flex items-start space-x-3 hover:bg-zinc-800 p-2 rounded-lg transition-colors"
                >
                  <div className="w-16 h-24 rounded overflow-hidden flex-shrink-0">
                    <img 
                      src={rec.thumbnailUrl} 
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h4 className="text-white font-medium line-clamp-2">{rec.title}</h4>
                    <p className="text-xs text-gray-400 mt-1">{rec.duration}</p>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-zinc-900 mt-10 py-8">
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-bold mb-3 text-white">FilmFlex</h3>
              <p className="text-gray-400 text-sm">
                The ultimate streaming platform for movie enthusiasts, offering a wide selection of films for every taste.
              </p>
            </div>
            
            <div>
              <h3 className="text-md font-bold mb-3 text-white">Navigation</h3>
              <ul className="space-y-2">
                <li><a href="/" className="text-gray-400 hover:text-white text-sm">Home</a></li>
                <li><a href="/movies" className="text-gray-400 hover:text-white text-sm">Movies</a></li>
                <li><a href="/series" className="text-gray-400 hover:text-white text-sm">TV Series</a></li>
                <li><a href="/genre" className="text-gray-400 hover:text-white text-sm">Categories</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-md font-bold mb-3 text-white">Legal</h3>
              <ul className="space-y-2">
                <li><a href="/terms" className="text-gray-400 hover:text-white text-sm">Terms of Use</a></li>
                <li><a href="/privacy" className="text-gray-400 hover:text-white text-sm">Privacy Policy</a></li>
                <li><a href="/cookie-policy" className="text-gray-400 hover:text-white text-sm">Cookie Policy</a></li>
                <li><a href="/dmca" className="text-gray-400 hover:text-white text-sm">DMCA</a></li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-md font-bold mb-3 text-white">Connect</h3>
              <div className="flex space-x-3 mb-4">
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
                  </svg>
                </a>
                <a href="#" className="text-gray-400 hover:text-white">
                  <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z" />
                  </svg>
                </a>
              </div>
              <p className="text-gray-400 text-sm">
                &copy; 2025 FilmFlex. All rights reserved.
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MovieStreamingPage;