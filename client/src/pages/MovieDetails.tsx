import { useEffect, useState, useRef } from "react";
import { useRoute, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { 
  Play, Plus, Star, Film, ThumbsUp, ThumbsDown, Send, 
  MessageSquare, ThumbsUpIcon, Camera, GitBranch, Users
} from "lucide-react";
import Navbar from "@/components/Navbar";
import GoogleDriveAuth from "@/components/GoogleDriveAuth";
import { API_BASE_URL, Movie, formatDuration, getGenreNames } from "@/lib/constants";
import { convertToDirectStreamingUrl, isGoogleDriveUrl } from "@/lib/googleDriveApi";
import { getDriveVideoStreamingUrl, isValidDriveFileId, extractDriveFileId } from "@/lib/driveHelper";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

const MovieDetails = () => {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/movie/:id");
  const movieId = match ? parseInt(params.id) : null;
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoSrc, setVideoSrc] = useState('');
  const [isLoadingVideo, setIsLoadingVideo] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  // Get authentication state for comments and ratings
  const { user } = useAuth();
  
  // Interactive features state
  const [comments, setComments] = useState<{ id: number; user: string; text: string; timestamp: string; avatarUrl: string }[]>([
    { 
      id: 1, 
      user: "MovieBuff92", 
      text: "This movie is absolutely brilliant! The cinematography and soundtrack blend perfectly.", 
      timestamp: "2 days ago",
      avatarUrl: "https://ui-avatars.com/api/?name=Movie+Buff&background=random" 
    },
    { 
      id: 2, 
      user: "CinematicGenius", 
      text: "The plot twist at 1:24:18 completely blew my mind. Didn't see that coming!", 
      timestamp: "1 day ago",
      avatarUrl: "https://ui-avatars.com/api/?name=Cinematic+Genius&background=random" 
    },
    { 
      id: 3, 
      user: "FilmCritic2025", 
      text: "The character development was a bit rushed, but overall it's worth watching.", 
      timestamp: "12 hours ago",
      avatarUrl: "https://ui-avatars.com/api/?name=Film+Critic&background=random" 
    }
  ]);
  const [newComment, setNewComment] = useState("");
  const [userRating, setUserRating] = useState<number | null>(null);
  const [totalRatings, setTotalRatings] = useState<{ value: number; count: number }>({ value: 4.5, count: 178 });
  const [showComments, setShowComments] = useState(true);
  
  // Multi-angle viewing mode state
  const [viewingAngles, setViewingAngles] = useState([
    { id: 'main', name: 'Main Camera', active: true, thumbnailUrl: 'https://i.ibb.co/6YM5Kj9/angle-main.jpg' },
    { id: 'alt1', name: 'Alternate Angle 1', active: false, thumbnailUrl: 'https://i.ibb.co/j8Dkv8R/angle-side.jpg' },
    { id: 'alt2', name: 'Behind the Scenes', active: false, thumbnailUrl: 'https://i.ibb.co/2PQy1D8/angle-bts.jpg' }
  ]);
  
  // Character interaction state
  const [characterInteractions, setCharacterInteractions] = useState([
    { id: 1, character: 'John Smith', decision: 'Help the stranger?', options: ['Yes, offer help', 'No, move on'], selected: null },
    { id: 2, character: 'Detective Li', decision: 'Investigate the warehouse?', options: ['Enter quietly', 'Call for backup', 'Wait until morning'], selected: null }
  ]);
  const [showInteractions, setShowInteractions] = useState(false);

  // Add a new comment
  const handleAddComment = () => {
    if (newComment.trim() === '') return;
    
    const commentToAdd = {
      id: comments.length + 1,
      user: user?.username || 'Guest',
      text: newComment,
      timestamp: 'Just now',
      avatarUrl: `https://ui-avatars.com/api/?name=${user?.username || 'Guest'}&background=random`
    };
    
    setComments([commentToAdd, ...comments]);
    setNewComment('');
    
    toast({
      title: "Comment Added",
      description: "Your comment has been posted successfully!",
    });
  };
  
  // Submit a rating
  const handleRateMovie = (rating: number) => {
    setUserRating(rating);
    
    // Update total ratings
    const newTotalValue = ((totalRatings.value * totalRatings.count) + rating) / (totalRatings.count + 1);
    setTotalRatings({
      value: parseFloat(newTotalValue.toFixed(1)),
      count: totalRatings.count + 1
    });
    
    toast({
      title: "Rating Submitted",
      description: `You rated this movie ${rating} stars!`,
    });
  };
  
  // Change viewing angle
  const handleChangeAngle = (angleId: string) => {
    setViewingAngles(viewingAngles.map(angle => ({
      ...angle,
      active: angle.id === angleId
    })));
  };
  
  // Make a character decision
  const handleCharacterDecision = (interactionId: number, optionIndex: number) => {
    setCharacterInteractions(characterInteractions.map(interaction => 
      interaction.id === interactionId 
        ? { ...interaction, selected: optionIndex } 
        : interaction
    ));
    
    toast({
      title: "Decision Made",
      description: "Your choice will affect how the story unfolds!",
    });
  };
  
  // Fetch movie details
  const { data: movie, isLoading, error } = useQuery({
    queryKey: [`${API_BASE_URL}/movie/${movieId}`],
    staleTime: 60 * 1000, // 1 minute
    enabled: !!movieId,
  });
  
  // Fetch similar movies (same genres)
  const { data: allMovies } = useQuery({
    queryKey: [`${API_BASE_URL}/movies`],
    staleTime: 60 * 1000, // 1 minute
  });
  
  const [similarMovies, setSimilarMovies] = useState<Movie[]>([]);
  
  useEffect(() => {
    if (movie && allMovies) {
      // Find movies with similar genres
      const filtered = allMovies
        .filter((m: Movie) => 
          m.id !== movie.id && // Exclude current movie
          m.genreIds.some(genre => movie.genreIds.includes(genre)) // Must have at least one matching genre
        )
        .slice(0, 5); // Limit to 5 movies
      
      setSimilarMovies(filtered);
    }
  }, [movie, allMovies]);
  
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

  // Track authentication state
  const [needsGoogleAuth, setNeedsGoogleAuth] = useState(false);
  const { toast } = useToast();
  
  // Handle Google Drive auth success
  const handleAuthSuccess = () => {
    setNeedsGoogleAuth(false);
    toast({
      title: "Authentication successful",
      description: "Loading movie from Google Drive...",
    });
    // Reload the video source after authentication
    if (movie) {
      loadVideoSource(movie);
    }
  };
  
  // Load video source function that can be called from multiple places
  const loadVideoSource = async (movieData: Movie) => {
    setIsLoadingVideo(true);
    try {
      const source = await getVideoSource(movieData);
      setVideoSrc(source);
      setNeedsGoogleAuth(false);
    } catch (error: any) {
      console.error('Error loading video source:', error);
      
      // Check if this is an authentication error
      if (error.message && error.message.includes('Authentication required')) {
        setNeedsGoogleAuth(true);
        toast({
          title: "Authentication Required",
          description: "Please sign in with Google to play this movie",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Playback Error",
          description: "Failed to load video. Please try again later.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoadingVideo(false);
    }
  };
  
  // Load video source when movie data changes
  useEffect(() => {
    if (!movie) return;
    loadVideoSource(movie);
  }, [movie]);
  
  // Get video source with Google Drive integration
  const getVideoSource = async (movie: Movie) => {
    // Try with development mode helper function first, which will handle all the authentication for us
    try {
      // This will handle authentication and return a valid URL in development mode
      // Pass an empty string for a fallback since we'll provide a backup later if all fails
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
      console.error('Error processing Google Drive videoUrl:', error);
      // Fall through to traditional sources if Google Drive fails
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
        if (isGoogleDriveUrl(sourceUrl)) {
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
    
    // Ultimate fallback for development mode: use the BigBuckBunny sample
    try {
      // Get a sample URL from the development mode helper
      return await getDriveVideoStreamingUrl('development-fallback');
    } catch (e) {
      console.warn('Failed to get development fallback video');
    }
    
    // Fallback: No valid source found
    console.warn('No valid video source found for movie:', movie.title);
    return '';
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-white">Loading movie details...</p>
        </div>
      </div>
    );
  }
  
  if (error || !movie) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <h2 className="text-2xl font-bold text-white mb-2">Movie Not Found</h2>
          <p className="text-gray-300">
            We couldn't find the movie you're looking for. Please try another one.
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

  return (
    <div className="min-h-screen bg-black text-white">
      <Navbar />
      
      {/* Movie Title */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <h1 className="text-4xl font-bold mb-4">{movie.title}</h1>
      </div>
      
      {/* Video Player */}
      <div className="relative max-w-7xl mx-auto bg-black mb-6">
        <div className="aspect-video w-full relative">
          {/* Loading state */}
          {isLoadingVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-red-600 mx-auto mb-4"></div>
                <p className="text-white">Preparing video stream...</p>
              </div>
            </div>
          )}
          
          {/* Google Drive Auth Overlay */}
          {needsGoogleAuth && !isLoadingVideo && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-10">
              <div className="text-center max-w-md p-8 bg-zinc-900 rounded-lg shadow-xl">
                <Film className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="text-xl font-semibold mb-2">Google Drive Authentication Required</h3>
                <p className="text-gray-300 mb-6">
                  This movie is hosted on Google Drive. Please authenticate to access the content.
                </p>
                <GoogleDriveAuth 
                  onSuccess={handleAuthSuccess} 
                  size="lg"
                  className="mx-auto" 
                />
              </div>
            </div>
          )}
          
          {/* Video element - changes based on selected angle */}
          {viewingAngles.find(a => a.active && a.id === 'main') && (
            <video
              ref={videoRef}
              className="w-full h-full object-contain"
              src={videoSrc}
              poster={movie.backdropUrl}
              preload="auto"
            />
          )}
          
          {/* Alternate angle 1 */}
          {viewingAngles.find(a => a.active && a.id === 'alt1') && (
            <div className="w-full h-full relative bg-black flex items-center justify-center">
              <img 
                src="https://i.ibb.co/j8Dkv8R/angle-side.jpg" 
                alt="Alternate camera angle"
                className="max-h-full object-contain"
              />
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
                Alternate Angle
              </div>
            </div>
          )}
          
          {/* Behind the scenes angle */}
          {viewingAngles.find(a => a.active && a.id === 'alt2') && (
            <div className="w-full h-full relative bg-black flex items-center justify-center">
              <img 
                src="https://i.ibb.co/2PQy1D8/angle-bts.jpg" 
                alt="Behind the scenes view"
                className="max-h-full object-contain" 
              />
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-md text-sm">
                Behind the Scenes
              </div>
            </div>
          )}
          
          {/* Play overlay with big centered play button */}
          {!isPlaying && !isLoadingVideo && !needsGoogleAuth && videoSrc && (
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
          
          {/* Enhanced Watch Button */}
          <div className="absolute bottom-4 right-4 z-10">
            <button
              onClick={() => setLocation(`/watch/${movie.id}`)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md shadow-lg transition-colors"
            >
              <Play className="h-5 w-5" />
              <span>Watch with Enhanced Player</span>
            </button>
          </div>
        </div>
      </div>
      
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        {/* Interactive Feature Buttons */}
        <div className="mb-6 flex items-center justify-center bg-zinc-900/30 p-3 rounded-lg">
          <div className="flex gap-3 flex-wrap justify-center">
            <button
              onClick={() => setShowComments(!showComments)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${showComments ? 'bg-red-600' : 'bg-zinc-800'} hover:bg-red-700 transition-colors`}
            >
              <MessageSquare className="h-5 w-5" />
              <span>{showComments ? 'Hide Comments' : 'Show Comments'}</span>
            </button>
            
            <button
              onClick={() => handleChangeAngle(viewingAngles.find(a => !a.active)?.id || viewingAngles[0].id)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-zinc-800 hover:bg-zinc-700 transition-colors"
            >
              <Camera className="h-5 w-5" />
              <span>Multi-Angle View</span>
            </button>
            
            <button
              onClick={() => setShowInteractions(!showInteractions)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md ${showInteractions ? 'bg-red-600' : 'bg-zinc-800'} hover:bg-red-700 transition-colors`}
            >
              <GitBranch className="h-5 w-5" />
              <span>{showInteractions ? 'Hide Story Choices' : 'Interactive Story'}</span>
            </button>
          </div>
        </div>

        {/* Multi-angle view selector */}
        {viewingAngles.some(angle => angle.active && angle.id !== 'main') && (
          <div className="mb-6 bg-zinc-900/40 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold">Multi-Angle View</h3>
              <div className="text-sm text-gray-400">Currently watching: {viewingAngles.find(a => a.active)?.name}</div>
            </div>
            
            <div className="flex gap-3 overflow-x-auto pb-2">
              {viewingAngles.map(angle => (
                <div 
                  key={angle.id}
                  onClick={() => handleChangeAngle(angle.id)}
                  className={`flex-shrink-0 cursor-pointer relative ${angle.active ? 'ring-2 ring-red-600' : 'opacity-70 hover:opacity-100'} rounded-md overflow-hidden transition-all`}
                >
                  <img 
                    src={angle.thumbnailUrl} 
                    alt={angle.name}
                    className="w-36 h-20 object-cover"
                  />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <span className="text-xs font-medium bg-black/60 px-2 py-1 rounded">{angle.name}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* Character interaction section */}
        {showInteractions && (
          <div className="mb-6 bg-zinc-900/40 p-4 rounded-lg">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Interactive Story Elements</h3>
              <div className="flex items-center text-sm text-red-400">
                <Users className="h-4 w-4 mr-1" />
                <span>Character Decisions</span>
              </div>
            </div>
            
            <div className="space-y-4">
              {characterInteractions.map(interaction => (
                <div key={interaction.id} className="border border-zinc-800 rounded-lg p-4">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center flex-shrink-0">
                      <span className="text-white font-bold">{interaction.character.charAt(0)}</span>
                    </div>
                    <div>
                      <div className="font-medium text-white">{interaction.character}</div>
                      <div className="text-red-400 mt-1">{interaction.decision}</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 mt-3">
                    {interaction.options.map((option, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleCharacterDecision(interaction.id, idx)}
                        className={`px-3 py-2 text-sm rounded-md border transition-colors ${
                          interaction.selected === idx 
                            ? 'bg-red-600 border-red-700 text-white' 
                            : interaction.selected !== null 
                              ? 'bg-zinc-900 border-zinc-800 text-gray-400' 
                              : 'bg-zinc-900 border-zinc-800 text-white hover:bg-zinc-800'
                        }`}
                        disabled={interaction.selected !== null && interaction.selected !== idx}
                      >
                        {option}
                      </button>
                    ))}
                  </div>
                  
                  {interaction.selected !== null && (
                    <div className="mt-3 text-sm text-gray-400">
                      Your choice has been recorded and will affect the story.
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Stats and Ratings */}
        <div className="mb-8">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div>
              <div className="flex gap-2 text-sm">
                <div className="py-1 px-2 bg-red-600 rounded-sm">#1</div>
                <div className="py-1 px-2 bg-zinc-800 rounded-sm">#2</div>
              </div>
              <div className="flex items-center gap-2 mt-3">
                <div className="flex items-center">
                  <Star className="text-yellow-500 fill-yellow-500 h-5 w-5 mr-1" />
                  <span className="font-semibold">{movie.imdbRating || '0.0'}</span>
                </div>
                <span>{movie.releaseYear}</span>
                <span>{formatDuration(movie.duration)}</span>
                <span className="border border-white/30 px-2 py-0.5">{movie.rating}</span>
              </div>
            </div>
            
            {/* User Rating Component */}
            <div className="bg-zinc-900/50 p-3 rounded-lg">
              <div className="text-sm text-gray-300 mb-2">Rate this movie:</div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => handleRateMovie(star)}
                    className={`p-1 rounded-full transition-colors ${userRating === star ? 'bg-red-600/30' : 'hover:bg-zinc-800'}`}
                  >
                    <Star 
                      className={`h-6 w-6 ${star <= (userRating || 0) ? 'text-yellow-500 fill-yellow-500' : 'text-gray-500'}`} 
                    />
                  </button>
                ))}
              </div>
              <div className="text-xs text-gray-400 mt-1">
                {totalRatings.count} ratings · Average: {totalRatings.value}
              </div>
            </div>
          </div>
        </div>
      
        {/* About the Movie Section */}
        <div className="mb-8">
          <article className="bg-zinc-900/40 p-6 rounded-lg">
            {/* Movie Details */}
            <div>
              <h2 className="text-2xl font-bold mb-4 text-white">About the Movie</h2>
              
              <p className="text-white/80 mb-6 leading-relaxed text-base">
                {movie.description}
              </p>
              
              <div className="flex flex-wrap gap-2 mt-4">
                {movie.director && (
                  <span className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white/90 text-sm font-medium cursor-pointer transition-all hover:shadow-md hover:shadow-red-900/20">
                    #{movie.director.replace(/\s+/g, '')}
                  </span>
                )}
                
                {movie.cast && movie.cast.length > 0 && (
                  <>
                    {movie.cast.map((actor, index) => (
                      <span 
                        key={index}
                        className="px-4 py-1.5 bg-zinc-800 hover:bg-zinc-700 rounded-full text-white/90 text-sm font-medium cursor-pointer transition-all hover:shadow-md hover:shadow-red-900/20"
                      >
                        #{actor.replace(/\s+/g, '')}
                      </span>
                    ))}
                  </>
                )}
              </div>
            </div>
          </article>
        </div>
        
        {/* Live Comments Section */}
        {showComments && (
          <div className="mb-10">
            <div className="bg-zinc-900/40 p-6 rounded-lg">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold">Live Comments ({comments.length})</h2>
                <div className="text-sm text-gray-400">
                  {user ? `Commenting as ${user.username}` : 'Sign in to comment'}
                </div>
              </div>
              
              {/* Comment Input */}
              {user && (
                <div className="mb-6">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 bg-red-600/30 rounded-full flex items-center justify-center">
                      {user.username.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-grow">
                      <input
                        type="text"
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Share your thoughts about the movie..."
                        className="w-full bg-zinc-800/70 border border-zinc-700 text-white px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-600"
                      />
                    </div>
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim()}
                      className="bg-red-600 hover:bg-red-700 disabled:bg-zinc-700 disabled:cursor-not-allowed px-4 rounded-lg transition-colors"
                    >
                      <Send className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              )}
              
              {/* Comment List */}
              <div className="space-y-4">
                {comments.map(comment => (
                  <div key={comment.id} className="flex gap-3">
                    <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden">
                      <img src={comment.avatarUrl} alt={comment.user} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-grow">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{comment.user}</span>
                        <span className="text-xs text-gray-400">{comment.timestamp}</span>
                      </div>
                      <p className="mt-1 text-gray-200">{comment.text}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
                          <ThumbsUp className="h-3 w-3" />
                          Like
                        </button>
                        <button className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
                          <ThumbsDown className="h-3 w-3" />
                          Dislike
                        </button>
                        <button className="text-gray-400 hover:text-white flex items-center gap-1 text-xs">
                          Reply
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        
        {/* Recommended Films */}
        {similarMovies.length > 0 && (
          <div className="mb-16">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">Recommended Films</h2>
              <button className="text-white/70 hover:text-white text-sm flex items-center gap-1 hover:gap-2 transition-all duration-300">
                See All <span className="text-red-500">→</span>
              </button>
            </div>
            
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
              {similarMovies.map(similarMovie => (
                <div 
                  key={similarMovie.id}
                  className="group cursor-pointer transition-all duration-300"
                  onClick={() => setLocation(`/movie/${similarMovie.id}`)}
                >
                  <div className="relative overflow-hidden rounded-lg">
                    <img 
                      src={similarMovie.posterUrl}
                      alt={`${similarMovie.title} movie poster`}
                      className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-500"
                      loading="lazy"
                    />
                    <div className="absolute top-2 left-2 bg-black/70 px-2 py-0.5 rounded text-xs font-medium flex items-center">
                      <span className="text-yellow-500 mr-1">★</span>
                      <span>{similarMovie.imdbRating || '0.0'}</span>
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                      <h3 className="text-sm font-medium text-white leading-tight">
                        {similarMovie.title}
                      </h3>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MovieDetails;
