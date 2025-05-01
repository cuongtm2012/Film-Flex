import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
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
    queryKey: [`/api/movies/${movieId}`],
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
  const [isLiked, setIsLiked] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [showMoreRecommendations, setShowMoreRecommendations] = useState(false);
  const speeds = [0.5, 0.75, 1, 1.25, 1.5, 2];
  
  // Toast hook
  const { toast } = useToast();
  
  // Fetch recommended movies
  const { 
    data: recommendedMovies = [], 
    isLoading: isLoadingRecommendations 
  } = useQuery({
    queryKey: [`/api/movies/${movieId}/recommendations`],
    staleTime: 60 * 1000,
    // Only fetch if we have the movie data
    enabled: !!movie?.id,
  });
  
  // Like movie mutation
  const likeMovieMutation = useMutation({
    mutationFn: async (like: boolean) => {
      const res = await apiRequest("POST", `/api/movies/${movieId}/like`, { like });
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: isLiked ? "Removed from favorites" : "Added to favorites",
        description: isLiked 
          ? "This movie has been removed from your favorites" 
          : "This movie has been added to your favorites",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update favorite status",
        variant: "destructive",
      });
      // Reset the like state
      setIsLiked(!isLiked);
    },
  });
  
  // Handle comment submission
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!commentText.trim()) return;
    
    // Here you would typically submit the comment to the server
    // For now just show a toast and clear the input
    toast({
      title: "Comment posted",
      description: "Your comment has been posted successfully",
    });
    
    setCommentText('');
  };
  
  // Calculate displayed recommendations based on "show more" state
  const displayedRecommendations = showMoreRecommendations 
    ? recommendedMovies 
    : recommendedMovies.slice(0, 4);
  
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
  // Track currently selected episode and server
  const [selectedEpisode, setSelectedEpisode] = useState(0);
  const [selectedServer, setSelectedServer] = useState(0);
  
  // Load video source when movie data changes
  useEffect(() => {
    if (movie) {
      console.log('Movie data loaded:', movie);
      
      // Handle API movies differently
      if (movie.isApiMovie) {
        console.log('Loading API movie source:', movie.embedUrl || movie.videoUrl);
        setIsEmbedSource(true);
        
        // Reset selected episode and server when movie changes
        setSelectedEpisode(0);
        setSelectedServer(0);
        
        // If the movie has episodes, we'll set the source through the episode selection effect
        // Otherwise, use the default embedUrl
        if (!movie.episodes || !Array.isArray(movie.episodes) || movie.episodes.length === 0) {
          const sourceUrl = movie.embedUrl || movie.videoUrl || '';
          console.log('Setting video source to:', sourceUrl);
          setVideoSrc(sourceUrl);
        }
      } else {
        // Regular movies use the existing flow
        setIsEmbedSource(false);
        getVideoSource().then(src => {
          console.log('Regular movie source:', src);
          setVideoSrc(src);
        });
      }
    }
  }, [movie]);
  
  // Handle episode selection for API movies
  useEffect(() => {
    if (movie?.isApiMovie && movie.episodes && Array.isArray(movie.episodes)) {
      try {
        console.log('Processing episodes:', movie.episodes);
        
        // The episodes data structure can be complex with servers and multiple episodes
        // We need to find the appropriate embed URL based on the selected server and episode
        let allEpisodes: any[] = [];
        let currentEpisodeUrl = '';
        
        // PhimAPI format has servers with arrays of episodes
        if (movie.episodes.some((ep: any) => ep.server_name)) {
          console.log('Episodes have server_name format', selectedServer);
          // Get the server based on selectedServer index
          const server = movie.episodes[selectedServer];
          console.log('Selected server:', server);
          
          if (server && server.server_data && Array.isArray(server.server_data)) {
            allEpisodes = server.server_data;
            console.log('Server episodes:', allEpisodes);
            
            if (allEpisodes[selectedEpisode]) {
              currentEpisodeUrl = allEpisodes[selectedEpisode].link_embed;
              console.log('Found embed URL in server_data:', currentEpisodeUrl);
            } else {
              console.log('No episode found at index', selectedEpisode);
            }
          } else {
            console.log('Server data is invalid:', server);
          }
        } else if (Array.isArray(movie.episodes)) {
          // Simple array of episodes
          console.log('Episodes as simple array');
          allEpisodes = movie.episodes;
          if (allEpisodes[selectedEpisode]) {
            console.log('Selected episode:', allEpisodes[selectedEpisode]);
            if (allEpisodes[selectedEpisode].link_embed) {
              currentEpisodeUrl = allEpisodes[selectedEpisode].link_embed;
              console.log('Found embed URL in episode:', currentEpisodeUrl);
            } else {
              console.log('Episode has no link_embed property:', allEpisodes[selectedEpisode]);
            }
          } else {
            console.log('No episode found at index', selectedEpisode);
          }
        }
        
        if (currentEpisodeUrl) {
          console.log(`Setting episode URL from server ${selectedServer}, episode ${selectedEpisode}:`, currentEpisodeUrl);
          setVideoSrc(currentEpisodeUrl);
        } else {
          console.warn('No valid embed URL found for current episode');
          
          // Try to use fallback from the movie object itself
          if (movie.embedUrl) {
            console.log('Using fallback embed URL from movie object:', movie.embedUrl);
            setVideoSrc(movie.embedUrl);
          } else if (movie.videoUrl) {
            console.log('Using fallback video URL from movie object:', movie.videoUrl);
            setVideoSrc(movie.videoUrl);
          } else {
            console.error('No valid video source found for movie:', movie.id);
          }
        }
      } catch (error) {
        console.error('Error processing episodes:', error);
      }
    }
  }, [movie, selectedEpisode, selectedServer]);

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
          
          {/* Episode and Server Selection for API movies */}
          {movie.isApiMovie && movie.episodes && Array.isArray(movie.episodes) && (
            <div className="mb-6 bg-zinc-900 p-4 rounded-lg">
              {/* Server selection tabs - only show if there are multiple servers */}
              {movie.episodes.some((ep: any) => ep.server_name) && movie.episodes.length > 1 && (
                <div className="mb-4">
                  <h3 className="text-lg font-semibold text-white mb-2">Audio/Subtitles</h3>
                  <div className="flex flex-wrap gap-2">
                    {movie.episodes.map((server: any, idx: number) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedServer(idx);
                          setSelectedEpisode(0); // Reset episode when switching servers
                        }}
                        className={`px-4 py-2 rounded text-sm font-medium transition-colors ${
                          selectedServer === idx
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                        }`}
                      >
                        {server.server_name.replace('#', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Episode selection */}
              <div>
                <h3 className="text-lg font-semibold text-white mb-3">Episodes</h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10 gap-2">
                  {(() => {
                    // Get episodes from the currently selected server
                    let episodeList: any[] = [];
                    
                    // Handle phimapi.com format with servers
                    if (movie.episodes.some((ep: any) => ep.server_name)) {
                      const server = movie.episodes[selectedServer];
                      if (server && server.server_data) {
                        episodeList = server.server_data;
                      }
                    } else if (Array.isArray(movie.episodes)) {
                      episodeList = movie.episodes;
                    }
                    
                    return episodeList.map((episode, index) => (
                      <button
                        key={index}
                        onClick={() => setSelectedEpisode(index)}
                        className={`px-3 py-2 rounded text-center text-sm font-medium transition-colors ${
                          selectedEpisode === index
                            ? 'bg-red-600 text-white'
                            : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                        }`}
                      >
                        <span className="flex items-center justify-center">
                          {selectedEpisode === index && (
                            <span className="mr-1 text-xs">▶</span>
                          )}
                          {episode.name || `Ep ${index + 1}`}
                        </span>
                      </button>
                    ));
                  })()}
                </div>
              </div>
            </div>
          )}

          {/* Movie actions */}
          <div className="flex items-center justify-between mb-6 bg-zinc-900 p-4 rounded-lg">
            <div className="flex items-center space-x-6">
              <button 
                className={`flex items-center space-x-2 ${isLiked ? 'text-red-500' : 'text-white hover:text-red-500'} transition-colors`}
                onClick={() => {
                  likeMovieMutation.mutate(!isLiked);
                  setIsLiked(!isLiked);
                }}
                disabled={likeMovieMutation.isPending}
              >
                <ThumbsUp className={`h-5 w-5 ${likeMovieMutation.isPending ? 'animate-pulse' : ''}`} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>
              
              <div className="relative">
                <button 
                  className={`flex items-center space-x-2 ${shareOpen ? 'text-blue-500' : 'text-white hover:text-red-500'} transition-colors`}
                  onClick={() => setShareOpen(!shareOpen)}
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
                
                {shareOpen && (
                  <div className="absolute top-full left-0 mt-2 p-3 bg-zinc-800 rounded-lg shadow-xl z-50 w-72">
                    <h4 className="font-medium text-white mb-2">Share this movie</h4>
                    <div className="flex space-x-3 mb-3">
                      <button className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"></path></svg>
                      </button>
                      <button className="bg-blue-400 text-white p-2 rounded-full hover:bg-blue-500">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"></path></svg>
                      </button>
                      <button className="bg-green-600 text-white p-2 rounded-full hover:bg-green-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M20 10.8044C20 15.1235 16.5956 18.6088 12 18.6088C10.5346 18.6088 9.1571 18.1885 8 17.4568L4 18.6088L5.15217 15.3035C4.36285 14.0479 3.91304 12.5034 3.91304 10.8731C3.91304 6.55404 7.31739 3 11.913 3C16.5087 3 20 6.48539 20 10.8044ZM12 4.24705C8.0326 4.24705 4.82609 7.20264 4.82609 10.8731C4.82609 12.4862 5.35869 13.9621 6.25 15.0254L5.55435 17.0611L7.73913 16.3979C8.80435 17.1297 10.4174 17.5501 12.0087 17.5501C15.9761 17.5501 19.0913 14.5258 19.0913 10.8553C19.0826 7.1337 15.9674 4.24705 12 4.24705ZM16.0304 12.8377C16.2913 12.9065 16.4695 12.9409 16.5304 13.0441C16.5826 13.1473 16.5826 13.6708 16.3304 14.2973C16.0783 14.9237 14.9043 15.5501 14.4261 15.603C13.9478 15.6707 13.5391 15.6707 13.0957 15.5329C12.8 15.4502 12.4174 15.3419 11.9391 15.1681C9.93043 14.3331 8.66087 12.4862 8.47826 12.2437C8.29565 12.0012 7.4 10.8221 7.4 9.5946C7.4 8.36712 8.02174 7.78101 8.24348 7.54852C8.46522 7.31603 8.7391 7.24737 8.9043 7.24737C9.06956 7.24737 9.2348 7.24737 9.38261 7.2561C9.53913 7.26483 9.73913 7.26483 9.93913 7.81768C10.1478 8.38791 10.6957 9.62412 10.7652 9.72605C10.8348 9.828 10.8348 9.94737 10.7826 10.0665C10.7304 10.1857 10.6783 10.3221 10.5565 10.459C10.4348 10.5958 10.3043 10.7584 10.1957 10.8644C10.087 10.9703 9.97391 11.0934 10.1 11.3014C10.2261 11.5095 10.6957 12.2524 11.4 12.8721C12.2957 13.6535 13.0435 13.911 13.2522 14.0144C13.4609 14.1179 13.5826 14.0919 13.7043 13.9581C13.8261 13.8243 14.2696 13.3009 14.4174 13.0684C14.5652 12.8358 14.713 12.8721 14.9043 12.9237C15.0957 12.9753 16.3391 13.5799 16.5478 13.688C16.7565 13.7961 16.8957 13.8473 16.9652 13.9063C17.0348 13.9495 17.0348 14.419 16.8174 14.9718C16.6 15.5247 15.6739 16.0309 15.1304 16.0309C14.587 16.0309 12.0435 15.1441 10.0087 13.2454C9.36522 12.6408 8.83913 11.9534 8.43478 11.2316C8.03913 10.5195 7.71739 9.76339 7.4 9.01112C7.06956 8.15582 7.86956 7.50603 8.24348 7.24737L8.25217 7.24737C8.47391 7.02362 8.73043 6.95496 8.9043 6.95496H9.38261C9.54783 6.95496 9.73913 6.95496 9.93913 7.50781C10.1478 8.07801 10.6957 9.31424 10.7652 9.41617C10.8261 9.50056 10.8348 9.62848 10.7826 9.7477C10.7478 9.82072 10.7304 9.88938 10.6783 9.96677C10.5478 10.1575 10.4348 10.3027 10.3217 10.4159C10.213 10.5219 10.1 10.6537 10.2261 10.8618C10.3522 11.0699 10.8217 11.8127 11.5261 12.4324L11.5261 12.4325C12.4217 13.2139 13.1696 13.4714 13.3696 13.5748L13.3783 13.5748C13.587 13.6783 13.7087 13.6522 13.8304 13.5184C13.9522 13.3847 14.3957 12.8612 14.5435 12.6287C14.6913 12.3962 14.8391 12.4324 15.0304 12.484L16.0304 12.8377Z"></path></svg>
                      </button>
                      <button className="bg-pink-600 text-white p-2 rounded-full hover:bg-pink-700">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.5 2 2 6.5 2 12a10 10 0 0 0 10 10c5.5 0 10-4.5 10-10S17.5 2 12 2zm5.75 11.9c-.15.3-.47.5-.85.5H7.1c-.38 0-.7-.2-.85-.5-.16-.31-.16-.7.01-1l4.08-8.5c.14-.31.47-.5.84-.5s.7.19.85.5l4.08 8.5c.16.3.16.69-.01 1z"></path></svg>
                      </button>
                    </div>
                    <div className="relative flex items-center">
                      <input 
                        type="text" 
                        readOnly
                        value={window.location.href}
                        className="w-full px-3 py-2 bg-zinc-700 rounded text-white text-sm"
                      />
                      <button 
                        className="absolute right-2 text-xs text-gray-300 hover:text-white"
                        onClick={() => {
                          navigator.clipboard.writeText(window.location.href);
                          toast({
                            title: "Copied!",
                            description: "Link copied to clipboard",
                          });
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <a 
                href="#comments"
                className="flex items-center space-x-2 text-white hover:text-red-500 transition-colors"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Comment</span>
              </a>
            </div>
            <button 
              className={`flex items-center space-x-2 ${isLiked ? 'text-red-500' : 'text-white hover:text-red-500'} transition-colors`}
              onClick={() => {
                likeMovieMutation.mutate(!isLiked);
                setIsLiked(!isLiked);
              }}
              disabled={likeMovieMutation.isPending}
            >
              <Heart className={`h-5 w-5 ${likeMovieMutation.isPending ? 'animate-pulse' : ''} ${isLiked ? 'fill-current' : ''}`} />
              <span>{isLiked ? 'Favorited' : 'Favorite'}</span>
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
              {isLoadingRecommendations ? (
                <div className="py-8 flex justify-center">
                  <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : recommendedMovies.length === 0 ? (
                <div className="py-4 text-center text-gray-400">
                  No recommendations available
                </div>
              ) : (
                displayedRecommendations.map((recMovie: any) => (
                  <div 
                    key={recMovie.id} 
                    className="flex items-start space-x-3 cursor-pointer"
                    onClick={() => setLocation(`/watch/${recMovie.id}`)}
                  >
                    <div className="w-24 h-16 rounded bg-zinc-800 overflow-hidden flex-shrink-0">
                      {recMovie.posterUrl ? (
                        <img 
                          src={recMovie.posterUrl} 
                          alt={recMovie.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800"></div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1 truncate">{recMovie.title}</h3>
                      <p className="text-xs text-gray-400">
                        {recMovie.releaseYear} • {recMovie.categories ? recMovie.categories.slice(0, 2).join(', ') : 'Action'}
                      </p>
                      <div className="flex items-center mt-1">
                        <div className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className="h-full bg-red-600 rounded-full"
                            style={{ width: '65%' }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-400 ml-2">
                          {typeof recMovie.duration === 'number' ? `${recMovie.duration} min` : recMovie.duration || '90 min'}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            {recommendedMovies.length > 4 && (
              <button 
                onClick={() => setShowMoreRecommendations(!showMoreRecommendations)}
                className="w-full mt-4 py-2 text-center text-red-600 hover:text-red-500 transition-colors"
              >
                {showMoreRecommendations ? 'Show less' : 'Show more'}
              </button>
            )}
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