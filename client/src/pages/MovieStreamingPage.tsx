import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useAccessibility } from '@/hooks/use-accessibility';
import {
  Pause, 
  Play,
  ChevronLeft,
  ChevronRight,
  Volume2,
  VolumeX,
  Settings,
  Subtitles,
  X, 
  MessageSquare, 
  ThumbsUp, 
  Share2, 
  Plus, 
  Heart,
  Info,
  CornerUpRight
} from 'lucide-react';

// Custom hook to handle keyboard shortcuts
function useKeyboardShortcuts(handlers: {
  togglePlay?: () => void;
  toggleMute?: () => void;
  seekForward?: () => void;
  seekBackward?: () => void;
  toggleFullscreen?: () => void;
  toggleSubtitles?: () => void;
  escape?: () => void;
}) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture key events if they're in a form field
      if (
        e.target instanceof HTMLInputElement || 
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      switch (e.key.toLowerCase()) {
        case ' ':
        case 'k':
          e.preventDefault();
          handlers.togglePlay?.();
          break;
        case 'm':
          handlers.toggleMute?.();
          break;
        case 'arrowright':
        case 'l':
          handlers.seekForward?.();
          break;
        case 'arrowleft':
        case 'j':
          handlers.seekBackward?.();
          break;
        case 'f':
          handlers.toggleFullscreen?.();
          break;
        case 'c':
          handlers.toggleSubtitles?.();
          break;
        case 'escape':
          handlers.escape?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handlers]);
}

// Helper function to format time
function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
}

const MovieStreamingPage = () => {
  const [, setLocation] = useLocation();
  const { announceToScreenReader } = useAccessibility();

  // Get movie ID from URL
  const movieId = parseInt(window.location.pathname.split('/').pop() || '0');
  
  // Fetch movie data
  const { data: movie, isLoading, error, isError } = useQuery({
    queryKey: [`/api/movies`, movieId],
    staleTime: 30 * 1000,
  });

  // Video player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [subtitleEnabled, setSubtitleEnabled] = useState(false);
  const [subtitleLanguage, setSubtitleLanguage] = useState('en');
  const [currentSubtitle, setCurrentSubtitle] = useState('');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showSpeedOptions, setShowSpeedOptions] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [commentText, setCommentText] = useState('');
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  
  // Hide controls after inactivity
  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(timeout);
      
      timeout = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };
    
    const container = containerRef.current;
    container?.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      container?.removeEventListener('mousemove', handleMouseMove);
      clearTimeout(timeout);
    };
  }, [isPlaying]);
  
  // Update fullscreen state
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);
  
  // Handle metadata loaded
  const handleMetadataLoaded = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
    }
  };
  
  // Update current time
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
      
      // Simulated subtitle display based on time
      if (subtitleEnabled) {
        const time = Math.floor(videoRef.current.currentTime);
        if (time % 10 === 0) {
          setCurrentSubtitle(subtitleLanguage === 'en' 
            ? `Sample subtitle at ${time} seconds` 
            : `Phụ đề mẫu tại giây thứ ${time}`);
        } else if (time % 10 === 5) {
          setCurrentSubtitle('');
        }
      }
    }
  };
  
  // Toggle play/pause
  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        announceToScreenReader('Video paused');
      } else {
        videoRef.current.play();
        announceToScreenReader('Video playing');
      }
    }
  };
  
  // Toggle mute
  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
      announceToScreenReader(muted ? 'Audio unmuted' : 'Audio muted');
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(e.target.value);
    setVolume(value);
    if (videoRef.current) {
      videoRef.current.volume = value;
      if (value === 0) {
        setMuted(true);
        videoRef.current.muted = true;
      } else if (muted) {
        setMuted(false);
        videoRef.current.muted = false;
      }
    }
  };
  
  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (progressRef.current && videoRef.current) {
      const rect = progressRef.current.getBoundingClientRect();
      const pos = (e.clientX - rect.left) / rect.width;
      videoRef.current.currentTime = pos * duration;
    }
  };
  
  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };
  
  // Toggle subtitles
  const toggleSubtitles = () => {
    setSubtitleEnabled(!subtitleEnabled);
    announceToScreenReader(subtitleEnabled ? 'Subtitles disabled' : 'Subtitles enabled');
  };
  
  // Toggle subtitle language
  const toggleSubtitleLanguage = () => {
    setSubtitleLanguage(subtitleLanguage === 'en' ? 'vi' : 'en');
    announceToScreenReader(`Subtitle language set to ${subtitleLanguage === 'en' ? 'Vietnamese' : 'English'}`);
  };
  
  // Change playback speed
  const changePlaybackSpeed = (speed: number) => {
    setPlaybackSpeed(speed);
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
    }
    setShowSpeedOptions(false);
    announceToScreenReader(`Playback speed set to ${speed}`);
  };
  
  // Handle back button
  const handleBack = () => {
    setLocation('/');
  };
  
  // Register keyboard shortcuts
  useKeyboardShortcuts({
    togglePlay,
    toggleMute,
    seekForward: () => videoRef.current && (videoRef.current.currentTime += 10),
    seekBackward: () => videoRef.current && (videoRef.current.currentTime -= 10),
    toggleFullscreen,
    toggleSubtitles,
    escape: () => isFullscreen && document.exitFullscreen(),
  });
  
  // Get video source based on movie data
  const getVideoSource = async () => {
    if (!movie) return '';
    
    if (movie.videoSources && movie.videoSources.length > 0) {
      // Return the highest quality source
      const sortedSources = [...movie.videoSources].sort((a, b) => {
        const qualityA = parseInt(a.quality.replace('p', ''));
        const qualityB = parseInt(b.quality.replace('p', ''));
        return qualityB - qualityA;
      });
      
      return sortedSources[0].url;
    }
    
    if (movie.videoUrl) {
      // If it's a Google Drive ID
      if (movie.videoUrl.match(/^[a-zA-Z0-9_-]{33}$/)) {
        return `https://drive.google.com/uc?export=download&id=${movie.videoUrl}`;
      }
      
      return movie.videoUrl;
    }
    
    return '';
  };
  
  // Current video source state
  const [videoSrc, setVideoSrc] = useState('');
  // Track if it's an embed source (like iframe for API movies)
  const [isEmbedSource, setIsEmbedSource] = useState(false);
  
  // Load video source when movie data changes
  useEffect(() => {
    if (movie) {
      // Handle API movies differently
      if (movie.isApiMovie) {
        console.log('Loading API movie source:', movie.videoUrl);
        setIsEmbedSource(true);
        setVideoSrc(movie.videoUrl || '');
      } else {
        // Regular movies use the existing flow
        setIsEmbedSource(false);
        getVideoSource().then(src => setVideoSrc(src));
      }
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
              {isEmbedSource ? (
                /* Iframe for API movie embeds */
                <iframe
                  src={videoSrc}
                  className="w-full h-full object-contain"
                  allowFullScreen
                  referrerPolicy="no-referrer"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                ></iframe>
              ) : (
                <>
                  {/* Regular video element for standard movies */}
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
                </>
              )}
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
            <form onSubmit={handleCommentSubmit} className="mb-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-red-600 flex-shrink-0 flex items-center justify-center text-white font-medium">
                  U
                </div>
                <div className="flex-1">
                  <textarea
                    className="w-full p-3 bg-zinc-800 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-red-500"
                    placeholder="Add a comment..."
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  ></textarea>
                  <div className="flex justify-end mt-2">
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      disabled={!commentText.trim()}
                    >
                      Comment
                    </button>
                  </div>
                </div>
              </div>
            </form>
            
            {/* Sample comments */}
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-blue-500 flex-shrink-0 flex items-center justify-center text-white font-medium">
                  J
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="font-medium text-white mr-2">John Doe</h4>
                    <span className="text-xs text-gray-400">2 days ago</span>
                  </div>
                  <p className="text-gray-300">
                    This is an amazing movie! The cinematography and acting were outstanding. I would definitely recommend it to anyone who enjoys this genre.
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <button className="flex items-center space-x-1 hover:text-white">
                      <ThumbsUp className="h-4 w-4" />
                      <span>23</span>
                    </button>
                    <button className="hover:text-white flex items-center space-x-1">
                      <CornerUpRight className="h-4 w-4" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-green-500 flex-shrink-0 flex items-center justify-center text-white font-medium">
                  S
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="font-medium text-white mr-2">Sarah Kim</h4>
                    <span className="text-xs text-gray-400">1 week ago</span>
                  </div>
                  <p className="text-gray-300">
                    I had high expectations for this one and it didn't disappoint. The plot twists kept me on the edge of my seat the entire time!
                  </p>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <button className="flex items-center space-x-1 hover:text-white">
                      <ThumbsUp className="h-4 w-4" />
                      <span>15</span>
                    </button>
                    <button className="hover:text-white flex items-center space-x-1">
                      <CornerUpRight className="h-4 w-4" />
                      <span>Reply</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-full lg:w-1/4 mt-6 lg:mt-0">
          {/* Up Next / Recommendations */}
          <div className="bg-zinc-900 p-6 rounded-lg">
            <h2 className="text-xl font-bold mb-4">Recommended For You</h2>
            
            <div className="space-y-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <div key={index} className="flex items-start space-x-3">
                  <div className="w-24 h-16 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                    <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800"></div>
                  </div>
                  <div className="flex-1">
                    <h3 className="text-white font-medium mb-1">Recommended Movie {index + 1}</h3>
                    <p className="text-xs text-gray-400">2023 • Action, Drama</p>
                    <div className="flex items-center mt-1">
                      <div className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-red-600 rounded-full"
                          style={{ width: `${Math.floor(Math.random() * 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400 ml-2">
                        {Math.floor(Math.random() * 120)} min
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            <button className="w-full mt-4 py-2 text-center text-red-600 hover:text-red-500 transition-colors">
              Show more
            </button>
          </div>
          
          {/* Movie Info */}
          <div className="bg-zinc-900 p-6 rounded-lg mt-6">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <Info className="h-5 w-5 mr-2" />
              Movie Info
            </h2>
            
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-gray-400 mb-1">Director</h3>
                <p className="text-white">{movie.director || 'Unknown'}</p>
              </div>
              
              <div>
                <h3 className="text-gray-400 mb-1">Cast</h3>
                <p className="text-white">
                  {movie.cast && movie.cast.length > 0 
                    ? movie.cast.join(', ')
                    : 'No cast information available'}
                </p>
              </div>
              
              <div>
                <h3 className="text-gray-400 mb-1">IMDB Rating</h3>
                <div className="flex items-center">
                  <svg className="w-5 h-5 text-yellow-400 mr-1" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  <span className="text-white">{movie.imdbRating || '7.5'}</span>
                </div>
              </div>
              
              <div>
                <h3 className="text-gray-400 mb-1">Views</h3>
                <p className="text-white">{movie.viewCount?.toLocaleString() || '15,789'} views</p>
              </div>
              
              {movie.trailerUrl && (
                <div>
                  <h3 className="text-gray-400 mb-1">Trailer</h3>
                  <button className="flex items-center space-x-2 text-red-500 hover:text-red-400 transition-colors">
                    <Play className="h-4 w-4" />
                    <span>Watch Trailer</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-zinc-900 py-8 mt-10">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between">
            {/* Logo Section */}
            <div className="mb-6 md:mb-0">
              <span className="text-red-600 text-3xl font-bold">FilmFlex</span>
              <p className="text-gray-400 mt-2 max-w-md">
                FilmFlex: Premium streaming experience with the latest movies and TV shows in high definition.
              </p>
            </div>
            
            {/* Links */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              <div>
                <h3 className="text-white font-medium mb-4">Browse</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Movies</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">TV Shows</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">New Releases</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Trending</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-medium mb-4">Support</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">FAQ</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Help Center</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Contact Us</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Terms of Use</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-medium mb-4">Account</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">My Account</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Watchlist</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Subscriptions</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Settings</a></li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-white font-medium mb-4">Connect</h3>
                <ul className="space-y-2">
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Facebook</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Twitter</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">Instagram</a></li>
                  <li><a href="#" className="text-gray-400 hover:text-white transition-colors">YouTube</a></li>
                </ul>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-zinc-800 text-center">
            <p className="text-gray-400 text-sm">
              © 2025 FilmFlex. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default MovieStreamingPage;