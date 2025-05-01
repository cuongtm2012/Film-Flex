import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useAccessibility } from '@/hooks/use-accessibility';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
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
  CornerUpRight,
  ChevronUp,
  Copy,
  CheckCircle,
  AlertTriangle
} from 'lucide-react';

// Define types for our movie data
interface Episode {
  name: string;
  url?: string;
  index?: number;
  slug?: string;
  filename?: string;
  link_embed?: string;
  link_m3u8?: string;
}

interface Server {
  name: string;
  server_name?: string;
  server_data?: Episode[];
  episodes?: Episode[];
}

interface ApiMovie {
  id: number;
  title: string;
  slug: string;
  description: string;
  releaseYear: string;
  duration: number;
  posterUrl: string;
  backdropUrl: string;
  categories: string[];
  status: string;
  origin: string;
  country: string;
  type: string;
  quality: string;
  lang: string;
  actors: string[];
  director: string;
  episodes: Server[];
  embedUrl: string | null;
  videoUrl: string | null;
  videoSources?: {
    url: string;
    quality: string;
    type: string;
  }[];
  isApiMovie: boolean;
  viewCount: number;
  likesCount: number;
  imdbRating: number;
  trailerUrl: string | null;
  cast: string[];
  genreIds: number[];
  createdAt: string;
  updatedAt: string;
}

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
  const { data: movie, isLoading, error, isError } = useQuery<ApiMovie>({
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
    data: recommendedMovies = [] as ApiMovie[], 
    isLoading: isLoadingRecommendations 
  } = useQuery<ApiMovie[]>({
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
            <div className="flex flex-wrap gap-3">
              <button 
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${isLiked ? 'bg-red-600 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'} transition-colors`}
                onClick={() => {
                  likeMovieMutation.mutate(!isLiked);
                  setIsLiked(!isLiked);
                }}
                disabled={likeMovieMutation.isPending}
                aria-label={isLiked ? "Remove from favorites" : "Add to favorites"}
              >
                <Heart className={`h-5 w-5 ${isLiked ? 'fill-white' : ''} ${likeMovieMutation.isPending ? 'animate-pulse' : ''}`} />
                <span>{isLiked ? 'Liked' : 'Like'}</span>
              </button>
              
              <div className="relative">
                <button 
                  className={`flex items-center space-x-2 px-3 py-1.5 rounded-full ${shareOpen ? 'bg-blue-600 text-white' : 'bg-zinc-800 text-white hover:bg-zinc-700'} transition-colors`}
                  onClick={() => setShareOpen(!shareOpen)}
                  aria-label="Share this movie"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Share</span>
                </button>
                
                {shareOpen && (
                  <div className="absolute top-full left-0 mt-2 p-3 bg-zinc-800 rounded-lg shadow-xl z-50 w-72">
                    <h4 className="font-medium text-white mb-2">Share this movie</h4>
                    <div className="flex space-x-3 mb-3">
                      <a 
                        href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors"
                        aria-label="Share on Facebook"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-2c-.55 0-1 .45-1 1v2h3v3h-3v6.95c5.05-.5 9-4.76 9-9.95z"></path></svg>
                      </a>
                      
                      <a 
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(`Watching ${movie?.title || 'this movie'} on FilmFlex`)}&url=${encodeURIComponent(window.location.href)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-blue-400 text-white p-2 rounded-full hover:bg-blue-500 transition-colors"
                        aria-label="Share on Twitter"
                      >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M22.162 5.656a8.384 8.384 0 0 1-2.402.658A4.196 4.196 0 0 0 21.6 4c-.82.488-1.719.83-2.656 1.015a4.182 4.182 0 0 0-7.126 3.814 11.874 11.874 0 0 1-8.62-4.37 4.168 4.168 0 0 0-.566 2.103c0 1.45.738 2.731 1.86 3.481a4.168 4.168 0 0 1-1.894-.523v.052a4.185 4.185 0 0 0 3.355 4.101 4.21 4.21 0 0 1-1.89.072A4.185 4.185 0 0 0 7.97 16.65a8.394 8.394 0 0 1-6.191 1.732 11.83 11.83 0 0 0 6.41 1.88c7.693 0 11.9-6.373 11.9-11.9 0-.18-.005-.362-.013-.54a8.496 8.496 0 0 0 2.087-2.165z"></path></svg>
                      </a>
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
                            title: "Link copied",
                            description: "Movie link copied to clipboard"
                          });
                          setShareOpen(false);
                        }}
                      >
                        Copy
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <button 
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                onClick={() => {
                  toast({
                    title: "Added to list",
                    description: "Movie has been added to your watchlist"
                  });
                }}
                aria-label="Add to watchlist"
              >
                <Plus className="h-5 w-5" />
                <span>Add to List</span>
              </button>
              
              <a 
                href="#comments"
                className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                aria-label="Go to comments"
              >
                <MessageSquare className="h-5 w-5" />
                <span>Comment</span>
              </a>
              
              {movie?.trailerUrl && (
                <button 
                  className="flex items-center space-x-2 px-3 py-1.5 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition-colors"
                  onClick={() => {
                    window.open(movie.trailerUrl || '', '_blank');
                  }}
                  aria-label="Watch trailer"
                >
                  <Play className="h-5 w-5" />
                  <span>Trailer</span>
                </button>
              )}
            </div>
              
            <div className="hidden md:flex items-center space-x-2">
              {movie?.imdbRating > 0 && (
                <div className="flex items-center space-x-1 bg-yellow-500 text-black px-2 py-1 rounded text-sm font-medium">
                  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                  </svg>
                  <span>{movie.imdbRating.toFixed(1)}</span>
                </div>
              )}
              
              <div className="flex items-center space-x-1 bg-zinc-700 text-white px-2 py-1 rounded text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                <span>{movie.viewCount || 0}</span>
              </div>
            </div>
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
          <div id="comments" className="mb-8 bg-zinc-900 p-6 rounded-lg scroll-mt-20">
            <h2 className="text-xl font-bold mb-4 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2" />
              Comments and Reviews
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
                    placeholder="Add a comment or review..."
                    rows={3}
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    aria-label="Add your comment"
                  ></textarea>
                  
                  <div className="flex justify-between items-center mt-2">
                    <div className="flex items-center text-gray-400 text-sm">
                      <span>Remember to follow community guidelines</span>
                    </div>
                    <button 
                      type="submit"
                      className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors flex items-center space-x-1"
                      disabled={!commentText.trim()}
                    >
                      <MessageSquare className="h-4 w-4" />
                      <span>Comment</span>
                    </button>
                  </div>
                </div>
              </div>
            </form>
            
            {/* Comment filters */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-800">
              <div className="flex space-x-2">
                <button className="px-3 py-1 bg-zinc-800 rounded-full text-white text-sm hover:bg-zinc-700 transition-colors">
                  All Comments
                </button>
                <button className="px-3 py-1 text-gray-400 text-sm hover:text-white transition-colors">
                  Top Rated
                </button>
                <button className="px-3 py-1 text-gray-400 text-sm hover:text-white transition-colors">
                  Newest
                </button>
              </div>
              <div className="text-sm text-gray-400">
                <span>25 comments</span>
              </div>
            </div>
            
            {/* Comments list */}
            <div className="space-y-6">
              {/* Comment with replies */}
              <div className="space-y-4">
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
                      <button className="flex items-center space-x-1 hover:text-white transition-colors">
                        <ThumbsUp className="h-4 w-4" />
                        <span>23</span>
                      </button>
                      <button className="flex items-center space-x-1 hover:text-white transition-colors">
                        <CornerUpRight className="h-4 w-4" />
                        <span>Reply</span>
                      </button>
                      <button className="hover:text-white transition-colors">
                        <span>Report</span>
                      </button>
                    </div>
                    
                    {/* Reply */}
                    <div className="pl-8 mt-4 space-y-4">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 rounded-full bg-purple-500 flex-shrink-0 flex items-center justify-center text-white font-medium text-sm">
                          M
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center mb-1">
                            <h4 className="font-medium text-white mr-2">Mike Johnson</h4>
                            <span className="text-xs text-gray-400">1 day ago</span>
                          </div>
                          <p className="text-gray-300 text-sm">
                            I agree! The director really outdid themselves on this one. The score was phenomenal too!
                          </p>
                          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-400">
                            <button className="flex items-center space-x-1 hover:text-white transition-colors">
                              <ThumbsUp className="h-3 w-3" />
                              <span>7</span>
                            </button>
                            <button className="hover:text-white transition-colors">
                              <span>Report</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Regular comment */}
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
                    <button className="flex items-center space-x-1 hover:text-white transition-colors">
                      <ThumbsUp className="h-4 w-4" />
                      <span>15</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-white transition-colors">
                      <CornerUpRight className="h-4 w-4" />
                      <span>Reply</span>
                    </button>
                    <button className="hover:text-white transition-colors">
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              </div>
              
              {/* Additional comment with spoiler warning */}
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 rounded-full bg-yellow-500 flex-shrink-0 flex items-center justify-center text-white font-medium">
                  R
                </div>
                <div className="flex-1">
                  <div className="flex items-center mb-1">
                    <h4 className="font-medium text-white mr-2">Robert Chen</h4>
                    <span className="text-xs bg-red-600 text-white px-2 py-0.5 rounded-full mr-2">Spoiler Alert</span>
                    <span className="text-xs text-gray-400">3 days ago</span>
                  </div>
                  <div className="p-3 bg-zinc-800 rounded-md">
                    <p className="text-gray-300">
                      Click to reveal spoiler content
                    </p>
                  </div>
                  <div className="flex items-center space-x-4 mt-2 text-sm text-gray-400">
                    <button className="flex items-center space-x-1 hover:text-white transition-colors">
                      <ThumbsUp className="h-4 w-4" />
                      <span>9</span>
                    </button>
                    <button className="flex items-center space-x-1 hover:text-white transition-colors">
                      <CornerUpRight className="h-4 w-4" />
                      <span>Reply</span>
                    </button>
                    <button className="hover:text-white transition-colors">
                      <span>Report</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Load more button */}
            <div className="mt-8 flex justify-center">
              <button className="px-4 py-2 bg-zinc-800 rounded-full text-white hover:bg-zinc-700 transition-colors">
                Load More Comments
              </button>
            </div>
          </div>
        </div>
        
        {/* Sidebar */}
        <div className="w-full lg:w-1/4 mt-6 lg:mt-0">
          {/* Up Next / Recommendations */}
          <div className="bg-zinc-900 p-6 rounded-lg mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Recommended For You</h2>
              {recommendedMovies.length > 0 && (
                <div className="flex items-center gap-2">
                  <button 
                    className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
                    aria-label="View as grid"
                  >
                    <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 4h7v7H4V4zm9 0h7v7h-7V4zm-9 9h7v7H4v-7zm9 0h7v7h-7v-7z" />
                    </svg>
                  </button>
                  <button 
                    className="p-1 rounded-full hover:bg-zinc-800 transition-colors"
                    aria-label="View as list"
                  >
                    <svg className="w-5 h-5 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M4 6h16v2H4V6zm0 5h16v2H4v-2zm0 5h16v2H4v-2z" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
            
            <div className="space-y-4">
              {isLoadingRecommendations ? (
                <div className="py-8 flex justify-center">
                  <div className="w-8 h-8 border-4 border-red-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : recommendedMovies.length === 0 ? (
                <div className="py-8 text-center text-gray-400 flex flex-col items-center">
                  <AlertTriangle className="w-10 h-10 mb-2 text-gray-500" />
                  <p>No recommendations available</p>
                  <p className="text-sm mt-1">Try exploring our categories</p>
                </div>
              ) : (
                displayedRecommendations.map((recMovie: any) => (
                  <div 
                    key={recMovie.id} 
                    className="flex items-start space-x-3 hover:bg-zinc-800 p-2 rounded-lg cursor-pointer transition-colors"
                    onClick={() => setLocation(`/watch/${recMovie.id}`)}
                  >
                    <div className="w-24 h-16 rounded-md bg-zinc-800 overflow-hidden flex-shrink-0 relative group">
                      {recMovie.posterUrl ? (
                        <img 
                          src={recMovie.posterUrl} 
                          alt={recMovie.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-zinc-700 to-zinc-800 flex items-center justify-center">
                          <Info className="w-6 h-6 text-gray-400" />
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 flex items-center justify-center transition-all duration-200 opacity-0 group-hover:opacity-100">
                        <Play className="w-8 h-8 text-white" />
                      </div>
                      {recMovie.quality === 'HD' && (
                        <span className="absolute bottom-1 right-1 bg-red-600 text-white text-xs px-1 rounded">HD</span>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-white font-medium mb-1 truncate hover:text-red-500 transition-colors">{recMovie.title}</h3>
                      <div className="flex items-center text-xs text-gray-400 space-x-2 mb-1">
                        <span>{recMovie.releaseYear || 'Unknown'}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-500"></span>
                        <span>{recMovie.categories ? recMovie.categories.slice(0, 2).join(', ') : 'Action'}</span>
                      </div>
                      <div className="flex items-center mt-1">
                        {recMovie.imdbRating > 0 ? (
                          <div className="flex items-center">
                            <svg className="w-3 h-3 text-yellow-500" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                            <span className="text-xs text-gray-300 ml-1">{recMovie.imdbRating.toFixed(1)}</span>
                          </div>
                        ) : (
                          <div className="h-1.5 w-20 bg-gray-700 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-red-600 rounded-full"
                              style={{ width: `${recMovie.viewCount ? Math.min(recMovie.viewCount/10, 100) : 65}%` }}
                            ></div>
                          </div>
                        )}
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
                className="w-full mt-4 py-2 text-center bg-zinc-800 rounded-lg text-sm text-gray-300 hover:text-white hover:bg-zinc-700 transition-colors"
              >
                {showMoreRecommendations ? (
                  <span className="flex items-center justify-center">
                    <ChevronUp className="w-4 h-4 mr-1" />
                    Show less
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    <ChevronRight className="w-4 h-4 mr-1" />
                    Show more ({recommendedMovies.length - 4} more)
                  </span>
                )}
              </button>
            )}
          </div>
          
          {/* Related Categories */}
          <div className="bg-zinc-900 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Browse Categories</h2>
            <div className="flex flex-wrap gap-2">
              {movie?.categories ? movie.categories.map((category, index) => (
                <a
                  key={index}
                  href={`/category/${category.toLowerCase().replace(/\s+/g, '-')}`}
                  className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-white transition-colors"
                >
                  {category}
                </a>
              )) : (
                ['Action', 'Drama', 'Comedy'].map((category, index) => (
                  <a
                    key={index}
                    href={`/category/${category.toLowerCase()}`}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-sm text-white transition-colors"
                  >
                    {category}
                  </a>
                ))
              )}
              <a
                href="/categories"
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 rounded-full text-sm text-white transition-colors flex items-center"
              >
                <span>View All</span>
                <ChevronRight className="w-4 h-4 ml-1" />
              </a>
            </div>
          </div>
          
          {/* Recently Viewed */}
          <div className="bg-zinc-900 p-6 rounded-lg mb-6">
            <h2 className="text-xl font-bold mb-4">Recently Viewed</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-center py-6 text-gray-400 text-sm">
                <div className="flex flex-col items-center">
                  <CheckCircle className="w-10 h-10 mb-2 text-gray-500" />
                  <p>Sign in to see your watch history</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Movie Info */}
          <div className="bg-zinc-900 p-6 rounded-lg">
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