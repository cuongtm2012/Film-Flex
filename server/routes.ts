import type { Express } from "express";
import { createServer, type Server } from "http";
import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { storage } from "./storage";
import { syncMovies, fetchAndStorePage, fetchAndStoreMovieDetail, processPendingDetailFetches, initScheduledSync } from "./services/phimapi/service";

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up auth routes
  if (process.env.NODE_ENV !== 'test') {
    try {
      const { setupAuth } = await import('./auth');
      setupAuth(app);
    } catch (error) {
      console.error('Failed to set up authentication:', error);
    }
  }

  const router = express.Router();

  // API routes
  router.get("/movies", async (req, res) => {
    try {
      const movies = await storage.getAllMovies();
      
      // If source parameter is provided, filter by source
      const source = req.query.source as string;
      if (source === 'api') {
        // Get API movies that are in published state
        const apiMovies = await storage.getApiMovies(undefined, undefined, 'published');
        
        // Transform API movies to regular movie format
        const transformedApiMovies = apiMovies.map(apiMovie => {
          // Transform categories to genreIds by mapping to corresponding genre numbers
          const genreMap: Record<string, number> = {
            "Action": 1,
            "Adventure": 2,
            "Comedy": 3,
            "Drama": 4,
            "Horror": 5,
            "Science Fiction": 6,
            "Thriller": 7,
            "Documentary": 8,
            "Animation": 9
          };
          
          // Extract categories from API movie and ensure it's an array
          const categories: string[] = Array.isArray(apiMovie.categories) ? apiMovie.categories : [];
          // Map them to genre IDs or use default genre 1 (Action) if not found
          const genreIds = categories.length > 0 
            ? categories.map(cat => {
                const genreId = genreMap[cat as keyof typeof genreMap];
                return genreId || 1;
              })
            : [1]; // Default to Action genre if no categories
        
          // Handle various fields that might be missing or in different formats
          const castArray = (() => {
            if (!apiMovie.actors) return [];
            if (Array.isArray(apiMovie.actors)) return apiMovie.actors;
            if (typeof apiMovie.actors === 'string') return apiMovie.actors.split(',');
            return [];
          })();
          
          // Handle episodes
          const videoUrl = (() => {
            if (!apiMovie.episodes) return '';
            if (!Array.isArray(apiMovie.episodes) || apiMovie.episodes.length === 0) return '';
            const firstEpisode = apiMovie.episodes[0];
            if (!firstEpisode) return '';
            return firstEpisode.streamUrl || firstEpisode.embedUrl || '';
          })();
          
          return {
            id: apiMovie.id,
            title: apiMovie.title || 'Unknown Title',
            description: apiMovie.description || '',
            releaseYear: parseInt(apiMovie.releaseYear as string) || 2023,
            duration: apiMovie.duration || '100 min',
            rating: "PG-13",
            videoSources: [],
            genreIds: genreIds,
            director: "Unknown Director",
            cast: castArray,
            posterUrl: apiMovie.posterUrl || '',
            backdropUrl: apiMovie.backdropUrl || '',
            videoUrl: videoUrl,
            trailerUrl: apiMovie.trailerUrl || '',
            imdbRating: "7.5",
            viewCount: 0
          };
        });
        
        return res.json(transformedApiMovies);
      } else if (source === 'all') {
        // Get API movies that are in published state
        const apiMovies = await storage.getApiMovies(undefined, undefined, 'published');
        
        // Transform API movies to regular movie format
        const transformedApiMovies = apiMovies.map(apiMovie => {
          // Transform categories to genreIds by mapping to corresponding genre numbers
          const genreMap: Record<string, number> = {
            "Action": 1,
            "Adventure": 2,
            "Comedy": 3,
            "Drama": 4,
            "Horror": 5,
            "Science Fiction": 6,
            "Thriller": 7,
            "Documentary": 8,
            "Animation": 9
          };
          
          // Extract categories from API movie and ensure it's an array
          const categories: string[] = Array.isArray(apiMovie.categories) ? apiMovie.categories : [];
          // Map them to genre IDs or use default genre 1 (Action) if not found
          const genreIds = categories.length > 0 
            ? categories.map(cat => {
                const genreId = genreMap[cat as keyof typeof genreMap];
                return genreId || 1;
              })
            : [1]; // Default to Action genre if no categories
          
          // Handle various fields that might be missing or in different formats
          const castArray = (() => {
            if (!apiMovie.actors) return [];
            if (Array.isArray(apiMovie.actors)) return apiMovie.actors;
            if (typeof apiMovie.actors === 'string') return apiMovie.actors.split(',');
            return [];
          })();
          
          // Handle episodes
          const videoUrl = (() => {
            if (!apiMovie.episodes) return '';
            if (!Array.isArray(apiMovie.episodes) || apiMovie.episodes.length === 0) return '';
            const firstEpisode = apiMovie.episodes[0];
            if (!firstEpisode) return '';
            return firstEpisode.streamUrl || firstEpisode.embedUrl || '';
          })();
          
          return {
            id: apiMovie.id + 10000, // Avoid ID conflicts with regular movies
            title: apiMovie.title || 'Unknown Title',
            description: apiMovie.description || '',
            releaseYear: parseInt(apiMovie.releaseYear as string) || 2023,
            duration: apiMovie.duration || '100 min',
            rating: "PG-13",
            videoSources: [],
            genreIds: genreIds,
            director: "Unknown Director",
            cast: castArray,
            posterUrl: apiMovie.posterUrl || '',
            backdropUrl: apiMovie.backdropUrl || '',
            videoUrl: videoUrl,
            trailerUrl: apiMovie.trailerUrl || '',
            imdbRating: "7.5",
            viewCount: 0
          };
        });
        
        // Combine both movie sources
        return res.json([...movies, ...transformedApiMovies]);
      }
      
      // Default: return only regular movies
      res.json(movies);
    } catch (error) {
      console.error('Error fetching movies:', error);
      res.status(500).json({ message: "Failed to retrieve movies" });
    }
  });
  


  router.get("/movie/:id", async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      // Check if it's an API movie (ID > 10000)
      if (movieId >= 10000) {
        // Try to find an API movie with ID - 10000 (since we added 10000 to API movie IDs)
        const apiMovieId = movieId - 10000;
        const apiMovieResult = await storage.getApiMovies(1, 0, 'published', apiMovieId);
        
        if (apiMovieResult && Array.isArray(apiMovieResult) && apiMovieResult.length > 0) {
          // Transform the API movie to regular movie format
          const movie = apiMovieResult[0];
          
          // Transform categories to genreIds
          const genreMap: Record<string, number> = {
            "Action": 1,
            "Adventure": 2,
            "Comedy": 3,
            "Drama": 4,
            "Horror": 5,
            "Science Fiction": 6,
            "Thriller": 7,
            "Documentary": 8,
            "Animation": 9
          };
          
          // Extract categories from API movie and ensure it's an array
          const categories: string[] = Array.isArray(movie.categories) ? movie.categories : [];
          // Map them to genre IDs or use default genre 1 (Action) if not found
          const genreIds = categories.length > 0 
            ? categories.map(cat => {
                const genreId = genreMap[cat as keyof typeof genreMap];
                return genreId || 1;
              })
            : [1]; // Default to Action genre if no categories
          
          // Handle various fields that might be missing or in different formats
          const castArray = (() => {
            if (!movie.actors) return [];
            if (Array.isArray(movie.actors)) return movie.actors;
            if (typeof movie.actors === 'string') return movie.actors.split(',');
            return [];
          })();
          
          // Handle episodes
          const videoUrl = (() => {
            if (!movie.episodes) return '';
            if (!Array.isArray(movie.episodes) || movie.episodes.length === 0) return '';
            const firstEpisode = movie.episodes[0];
            if (!firstEpisode) return '';
            return firstEpisode.streamUrl || firstEpisode.embedUrl || '';
          })();
          
          const transformedMovie = {
            id: movieId, // Keep the same ID that was requested
            title: movie.title || 'Unknown Title',
            description: movie.description || '',
            releaseYear: parseInt(movie.releaseYear as string) || 2023,
            duration: movie.duration || '100 min',
            rating: "PG-13",
            videoSources: [],
            genreIds: genreIds,
            director: "Unknown Director",
            cast: castArray,
            posterUrl: movie.posterUrl || '',
            backdropUrl: movie.backdropUrl || '',
            videoUrl: videoUrl,
            trailerUrl: movie.trailerUrl || '',
            imdbRating: "7.5",
            viewCount: 0,
            isApiMovie: true // Add a flag to indicate this is an API movie
          };
          
          return res.json(transformedMovie);
        }
      }
      
      // If not an API movie or API movie wasn't found, check regular movies
      const movie = await storage.getMovie(movieId);
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      res.json(movie);
    } catch (error) {
      console.error('Error fetching movie:', error);
      res.status(500).json({ message: "Failed to retrieve movie" });
    }
  });

  router.get("/genres", async (req, res) => {
    try {
      const genres = await storage.getAllGenres();
      res.json(genres);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve genres" });
    }
  });

  router.get("/genre/:id/movies", async (req, res) => {
    try {
      const genreId = parseInt(req.params.id);
      if (isNaN(genreId)) {
        return res.status(400).json({ message: "Invalid genre ID" });
      }
      
      const movies = await storage.getMoviesByGenre(genreId);
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve movies by genre" });
    }
  });

  router.get("/search", async (req, res) => {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const movies = await storage.searchMovies(query);
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to search movies" });
    }
  });

  router.get("/featured", async (req, res) => {
    try {
      const featuredMovies = await storage.getFeaturedMovies();
      res.json(featuredMovies);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve featured movies" });
    }
  });

  router.get("/new-releases", async (req, res) => {
    try {
      const newReleases = await storage.getNewReleases();
      res.json(newReleases);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve new releases" });
    }
  });

  router.get("/trending", async (req, res) => {
    try {
      // Check if user is premium (would normally be handled with auth middleware)
      const isPremium = req.query.premium === 'true';
      
      if (!isPremium) {
        return res.status(403).json({ 
          message: "Access denied", 
          details: "Trending movies are only available for premium users" 
        });
      }
      
      const trendingMovies = await storage.getTrendingMovies();
      res.json(trendingMovies);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve trending movies" });
    }
  });

  // User routes (favorites, watchlist, etc.)
  router.get("/user/:userId/favorites", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve user favorites" });
    }
  });

  router.post("/user/:userId/favorites", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const movieId = parseInt(req.body.movieId);
      
      if (isNaN(userId) || isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid user ID or movie ID" });
      }
      
      const favorite = await storage.addFavorite({ userId, movieId });
      res.status(201).json(favorite);
    } catch (error) {
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  router.delete("/user/:userId/favorites/:movieId", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const movieId = parseInt(req.params.movieId);
      
      if (isNaN(userId) || isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid user ID or movie ID" });
      }
      
      await storage.removeFavorite(userId, movieId);
      res.sendStatus(204);
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  router.get("/user/:userId/history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      if (isNaN(userId)) {
        return res.status(400).json({ message: "Invalid user ID" });
      }
      
      const history = await storage.getUserViewHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve view history" });
    }
  });

  router.post("/user/:userId/history", async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      const movieId = parseInt(req.body.movieId);
      const progress = parseInt(req.body.progress);
      
      if (isNaN(userId) || isNaN(movieId) || isNaN(progress)) {
        return res.status(400).json({ message: "Invalid parameters" });
      }
      
      const history = await storage.addOrUpdateViewHistory({ 
        userId, 
        movieId, 
        progress,
        watchedAt: new Date() 
      });
      res.status(201).json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to update view history" });
    }
  });

  // Google Drive files endpoint
  router.get("/drive/files", async (req, res) => {
    try {
      const { folderId } = req.query;
      
      if (!folderId) {
        return res.status(400).json({ message: "Folder ID is required" });
      }
      
      // Check if API key is configured
      console.log(`GOOGLE_API_KEY exists: ${!!process.env.GOOGLE_API_KEY}`);
      
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({
          error: "Missing Google API Key",
          message: "The Google API key is not configured. Please contact the administrator."
        });
      }
      
      console.log("Attempting to fetch files from Google Drive folder:", folderId);
      
      try {
        // Use the Google Drive API to list files in the folder
        const response = await axios.get(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}' in parents and trashed=false&fields=files(id,name,mimeType,size,thumbnailLink,webContentLink)&key=${process.env.GOOGLE_API_KEY}`
        );
        
        // Filter to only include video files
        const videoFiles = response.data.files.filter((file: any) => 
          file.mimeType.includes('video/') || 
          /\.(mp4|webm|mkv|avi|mov)$/i.test(file.name)
        );
        
        // Log success (for admin tracking)
        if (req.user) {
          await storage.logAdminActivity({
            adminId: req.user.id,
            action: 'DRIVE_FILES_FETCH',
            entityType: 'DRIVE',
            details: `Successfully fetched ${videoFiles.length} video files from Drive folder: ${folderId}`
          });
        }
        
        return res.json({
          success: true,
          files: videoFiles
        });
      } catch (apiError: any) {
        console.error("Error fetching files from Drive API:", apiError.message);
        
        // Log the error (for admin tracking)
        if (req.user) {
          await storage.logAdminActivity({
            adminId: req.user.id,
            action: 'DRIVE_FILES_ERROR',
            entityType: 'DRIVE',
            details: `Error fetching files from Drive folder ${folderId}: ${apiError.message}`
          });
        }
        
        return res.status(500).json({
          error: "Failed to fetch files from Google Drive",
          message: apiError.message
        });
      }
    } catch (error: any) {
      console.error('Error processing Drive files request:', error);
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Google Drive movies endpoint
  router.get("/drive/movies/:folderId", async (req, res) => {
    try {
      const { folderId } = req.params;
      
      if (!folderId) {
        return res.status(400).json({ message: "Folder ID is required" });
      }
      
      // Check if API key is configured
      console.log(`GOOGLE_API_KEY exists: ${!!process.env.GOOGLE_API_KEY}`);
      
      if (!process.env.GOOGLE_API_KEY) {
        return res.status(500).json({
          error: "Missing Google API Key",
          message: "The Google API key is not configured. Please contact the administrator."
        });
      }
      
      console.log("Attempting to access Google Drive folder:", folderId);
      
      // Try to fetch folder metadata
      let folderName = "Unknown";
      try {
        const folderResponse = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${folderId}?key=${process.env.GOOGLE_API_KEY}&fields=name,mimeType`
        );
        
        if (folderResponse.data && folderResponse.data.mimeType === 'application/vnd.google-apps.folder') {
          folderName = folderResponse.data.name;
          console.log("Folder found:", folderName);
        } else {
          return res.status(400).json({
            error: "Not a folder",
            message: "The provided ID is not a Google Drive folder."
          });
        }
      } catch (folderError: any) {
        console.error("Error accessing folder metadata:", folderError.message);
        // Continue anyway, as we might still be able to list files
      }
      
      // Fetch files from the folder
      const filesResponse = await axios.get(
        `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${process.env.GOOGLE_API_KEY}&fields=files(id,name,mimeType,videoMediaMetadata,fileExtension,size,createdTime,thumbnailLink)&orderBy=name`
      );
      
      if (!filesResponse.data.files || filesResponse.data.files.length === 0) {
        return res.json([]); // Empty array if no files found
      }
      
      // Filter video files
      const videoFiles = filesResponse.data.files.filter((file: any) => 
        file.mimeType.includes('video') || 
        (file.fileExtension && ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(file.fileExtension.toLowerCase()))
      );
      
      if (videoFiles.length === 0) {
        return res.json([]); // Empty array if no video files found
      }
      
      // Convert to movie objects for the frontend
      const movies = videoFiles.map((file: any) => convertDriveFileToMovie(file));
      
      res.json(movies);
    } catch (error: any) {
      console.error("Error fetching Google Drive content:", error);
      res.status(500).json({ 
        error: "Failed to fetch Google Drive content", 
        details: error.message || 'Unknown error',
        apiKeyExists: !!process.env.GOOGLE_API_KEY 
      });
    }
  });
  
  // Helper function to parse movie info from filename
  function parseMovieInfo(filename: string): { 
    title: string; 
    year?: number;
    additionalInfo?: string;
  } {
    // Remove file extension
    const nameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
    
    // Extract year if present in format (YYYY)
    const yearMatch = nameWithoutExtension.match(/\((\d{4})\)/);
    let year: number | undefined = undefined;
    if (yearMatch && yearMatch[1]) {
      year = parseInt(yearMatch[1], 10);
    }
    
    // Extract additional info in square brackets [INFO]
    const additionalInfoMatch = nameWithoutExtension.match(/\[(.*?)\]/);
    let additionalInfo: string | undefined = undefined;
    if (additionalInfoMatch && additionalInfoMatch[1]) {
      additionalInfo = additionalInfoMatch[1];
    }
    
    // Get title by removing year and additional info
    let title = nameWithoutExtension
      .replace(/\(\d{4}\)/, '')  // Remove year
      .replace(/\[.*?\]/, '')    // Remove additional info
      .trim();
      
    return { title, year, additionalInfo };
  }
  
  // Helper function to convert Drive file to Movie format
  function convertDriveFileToMovie(file: any): any {
    const { title, year } = parseMovieInfo(file.name);
    
    // Generate a stream URL
    const streamUrl = `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media&key=${process.env.GOOGLE_API_KEY}`;
    
    // Generate a movie object compatible with our app's Movie type
    return {
      id: parseInt(file.id.substring(0, 8), 16) % 10000, // Generate a numeric ID from Drive ID
      title,
      description: `Watch ${title} on FilmFlex.`,
      releaseYear: year || new Date().getFullYear(),
      duration: file.videoMediaMetadata 
        ? Math.floor(parseInt(file.videoMediaMetadata.durationMillis) / 60000) 
        : 120, // Duration in minutes or default
      posterUrl: file.thumbnailLink || 'https://via.placeholder.com/300x450?text=No+Thumbnail',
      backdropUrl: file.thumbnailLink || 'https://via.placeholder.com/1280x720?text=No+Preview',
      rating: 'PG-13',
      videoSources: [
        {
          quality: 'HD',
          url: streamUrl
        }
      ],
      genreIds: [1], // Default to Action genre
      director: 'Unknown Director',
      cast: ['Actor 1', 'Actor 2'],
      imdbRating: '7.5',
      viewCount: 0
    };
  }
  
  // Debug route to check API key status
  router.get("/drive/status", (req, res) => {
    try {
      const apiKeyExists = !!process.env.GOOGLE_API_KEY;
      res.json({
        status: "ok",
        googleApiKeyExists: apiKeyExists,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: "Error checking status" });
    }
  });
  
  // Fetch information about Drive movies (alternative to direct Drive API usage)
  router.post("/drive/copy", isAdmin, async (req, res) => {
    try {
      const { sourceFolderId, destinationFolderId } = req.body;
      
      if (!sourceFolderId) {
        return res.status(400).json({ message: "Source folder ID is required" });
      }
      
      // Log the attempt (for admin tracking)
      if (req.user) {
        await storage.logAdminActivity({
          adminId: req.user.id,
          action: 'DRIVE_FETCH_ATTEMPT',
          entityType: 'DRIVE',
          details: `Attempted to fetch movies from Drive folder: ${sourceFolderId}`
        });
      }
      
      // Instead of trying to use Google Drive API which requires OAuth 2.0,
      // provide instructions for using the URL-based approach
      
      // Log a message with the folder ID
      if (req.user) {
        await storage.logAdminActivity({
          adminId: req.user.id,
          action: 'DRIVE_URL_SUGGESTION',
          entityType: 'DRIVE',
          details: `Suggested URL-based approach for folder: ${sourceFolderId}`
        });
      }
      
      // Return helpful instructions instead
      res.json({
        success: true,
        message: "We recommend using the 'Add from URL' approach for Google Drive files",
        note: "The Google Drive API requires OAuth 2.0 authentication which isn't implemented in this version.",
        instructions: [
          "1. Open your Google Drive folder in a browser",
          "2. Click on each video file you want to add",
          "3. Click the 'More actions' menu (three dots) and select 'Get link'",
          "4. Copy the link and use it in the 'Add from URL' feature",
          "5. Repeat for each video you want to add"
        ],
        alternativeMethod: "Use the 'Add from URL' button to add movies directly",
        details: [{
          originalFolder: sourceFolderId,
          success: true,
          message: "Please use the URL method instead"
        }]
      });
    } catch (error) {
      console.error('Error processing Drive request:', error);
      
      // Log the error for admin tracking
      if (req.user) {
        await storage.logAdminActivity({
          adminId: req.user.id,
          action: 'DRIVE_ERROR',
          entityType: 'DRIVE',
          details: `Error with Drive operation: ${(error as any).message}`
        });
      }
      
      // Return a helpful error message with instructions
      res.status(500).json({
        success: false, 
        message: "We encountered an issue with the Google Drive integration",
        error: (error as any).message,
        solution: "Please use the 'Add from URL' button to add movies directly",
        instructions: [
          "1. Open your Google Drive folder in a browser",
          "2. Click on each video file you want to add",
          "3. Click the 'More actions' menu (three dots) and select 'Get link'",
          "4. Copy the link and use it in the 'Add from URL' feature"
        ]
      });
    }
  });
  
  // Google Drive streaming
  router.get("/drive/stream/:fileId", async (req, res) => {
    try {
      const { fileId } = req.params;
      
      if (!fileId) {
        return res.status(400).json({ message: "File ID is required" });
      }
      
      // Return a direct link to stream from Google Drive
      res.json({ 
        url: `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${process.env.GOOGLE_API_KEY}`,
        mimeType: "video/mp4" 
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to generate streaming URL" });
    }
  });
  
  // Proxy for video streaming
  router.get("/stream/:movieId", async (req, res) => {
    try {
      const movieId = parseInt(req.params.movieId);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const movie = await storage.getMovie(movieId);
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      // For a real implementation, you would want to validate the user's access,
      // check for any subscription status, etc.
      
      // Return the video sources
      res.json(movie.videoSources);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve streaming sources" });
    }
  });

  // ==== ADMIN ROUTES ====
  
  // Middleware to check if user is admin
  function isAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = req.user as any;
    if (user.role !== "admin" && user.role !== "sub-admin") {
      return res.status(403).json({ error: "Forbidden - Admin access required" });
    }
    
    next();
  }
  
  // Admin User Management Routes
  const adminRouter = express.Router();
  
  adminRouter.get('/users', isAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });
  
  adminRouter.get('/users/role/:role', isAdmin, async (req, res) => {
    try {
      const users = await storage.getUsersByRole(req.params.role);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch users by role" });
    }
  });
  
  adminRouter.post('/users', isAdmin, async (req, res) => {
    try {
      const user = await storage.createAdminUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to create admin user" });
    }
  });
  
  adminRouter.patch('/users/:id/role', isAdmin, async (req, res) => {
    try {
      const adminUser = req.user as any;
      const userId = parseInt(req.params.id);
      const { role } = req.body;
      
      const user = await storage.updateUserRole(userId, role, adminUser.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to update user role" });
    }
  });
  
  adminRouter.patch('/users/:id/deactivate', isAdmin, async (req, res) => {
    try {
      const adminUser = req.user as any;
      const userId = parseInt(req.params.id);
      
      const user = await storage.deactivateUser(userId, adminUser.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to deactivate user" });
    }
  });
  
  adminRouter.patch('/users/:id/reactivate', isAdmin, async (req, res) => {
    try {
      const adminUser = req.user as any;
      const userId = parseInt(req.params.id);
      
      const user = await storage.reactivateUser(userId, adminUser.id);
      res.json(user);
    } catch (error) {
      res.status(500).json({ error: "Failed to reactivate user" });
    }
  });
  
  // Admin Movie Management Routes
  adminRouter.get('/movie-uploads', isAdmin, async (req, res) => {
    try {
      const uploads = await storage.getPendingMovieUploads();
      res.json(uploads);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending movie uploads" });
    }
  });
  
  adminRouter.get('/movie-uploads/:id', isAdmin, async (req, res) => {
    try {
      const uploadId = parseInt(req.params.id);
      const upload = await storage.getMovieUpload(uploadId);
      
      if (!upload) {
        return res.status(404).json({ error: "Movie upload not found" });
      }
      
      res.json(upload);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch movie upload" });
    }
  });
  
  adminRouter.post('/movie-uploads', isAdmin, async (req, res) => {
    try {
      const movieUpload = await storage.createMovieUpload(req.body);
      res.status(201).json(movieUpload);
    } catch (error) {
      res.status(500).json({ error: "Failed to create movie upload" });
    }
  });
  
  adminRouter.patch('/movie-uploads/:id/status', isAdmin, async (req, res) => {
    try {
      const adminUser = req.user as any;
      const uploadId = parseInt(req.params.id);
      const { status, notes } = req.body;
      
      const updatedUpload = await storage.updateMovieUploadStatus(
        uploadId, 
        status, 
        adminUser.id, 
        notes
      );
      
      res.json(updatedUpload);
    } catch (error) {
      res.status(500).json({ error: "Failed to update movie upload status" });
    }
  });
  
  adminRouter.post('/movies', isAdmin, async (req, res) => {
    try {
      const movie = await storage.createMovie(req.body);
      
      // Log the activity
      await storage.logAdminActivity({
        adminId: req.user!.id,
        action: 'CREATE_MOVIE',
        entityId: movie.id,
        entityType: 'MOVIE',
        details: `Created new movie '${movie.title}'`
      });
      
      res.status(201).json(movie);
    } catch (error) {
      res.status(500).json({ error: "Failed to create movie" });
    }
  });
  
  // Update movie
  adminRouter.patch('/movies/:id', isAdmin, async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      
      // Get the existing movie first
      const existingMovie = await storage.getMovie(movieId);
      
      if (!existingMovie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      
      // Update the movie
      const updatedMovie = await storage.updateMovie(movieId, req.body);
      
      // Log the activity
      await storage.logAdminActivity({
        adminId: req.user!.id,
        action: 'UPDATE_MOVIE',
        entityId: movieId,
        entityType: 'MOVIE',
        details: `Updated movie '${updatedMovie.title}'`
      });
      
      res.json(updatedMovie);
    } catch (error) {
      res.status(500).json({ error: "Failed to update movie" });
    }
  });
  
  // Delete movie
  adminRouter.delete('/movies/:id', isAdmin, async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      
      // Get the movie first for logging
      const movie = await storage.getMovie(movieId);
      
      if (!movie) {
        return res.status(404).json({ error: "Movie not found" });
      }
      
      // Delete the movie
      await storage.deleteMovie(movieId);
      
      // Log the activity
      await storage.logAdminActivity({
        adminId: req.user!.id,
        action: 'DELETE_MOVIE',
        entityId: movieId,
        entityType: 'MOVIE',
        details: `Deleted movie '${movie.title}'`
      });
      
      res.json({ success: true, message: "Movie deleted successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete movie" });
    }
  });
  
  // Import movies from Google Drive
  adminRouter.post('/movies/import', isAdmin, async (req, res) => {
    try {
      const { movies } = req.body;
      
      if (!movies || !Array.isArray(movies) || movies.length === 0) {
        return res.status(400).json({ error: "No movies to import" });
      }
      
      console.log(`Importing ${movies.length} movies from Google Drive`);
      
      // Track successfully imported movies
      const importedMovies = [];
      
      // Process each movie
      for (const movieData of movies) {
        try {
          // Prepare movie data for database
          const movieToCreate = {
            title: movieData.title,
            description: movieData.description || `Watch ${movieData.title} on FilmFlex.`,
            releaseYear: movieData.releaseYear || new Date().getFullYear(),
            duration: movieData.duration || 90,
            posterUrl: movieData.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster',
            backdropUrl: movieData.backdropUrl || 'https://via.placeholder.com/1280x720?text=No+Backdrop',
            videoUrl: movieData.videoUrl || movieData.id,
            rating: movieData.rating || 'PG-13',
            genreIds: movieData.genreIds || [1],
            director: movieData.director || 'Unknown Director',
            cast: movieData.cast || [],
            videoSources: [{
              quality: 'HD',
              url: movieData.videoUrl || `https://drive.google.com/uc?export=download&id=${movieData.id}`
            }]
          };
          
          // Create the movie in the database
          const createdMovie = await storage.createMovie(movieToCreate);
          importedMovies.push(createdMovie);
          
          // Log the activity
          await storage.logAdminActivity({
            adminId: req.user!.id,
            action: 'IMPORT_MOVIE',
            entityId: createdMovie.id,
            entityType: 'MOVIE',
            details: `Imported movie '${createdMovie.title}' from Google Drive (ID: ${movieData.id})`
          });
        } catch (movieError: any) {
          console.error(`Error importing movie ${movieData.title}:`, movieError.message);
        }
      }
      
      res.json({
        success: true,
        count: importedMovies.length,
        message: `Successfully imported ${importedMovies.length} of ${movies.length} movies`
      });
    } catch (error: any) {
      console.error('Error importing movies:', error);
      res.status(500).json({ error: "Failed to import movies from Google Drive" });
    }
  });
  
  // These routes are already defined above with proper logging
  
  // Admin Financial Routes
  adminRouter.get('/transactions', isAdmin, async (req, res) => {
    try {
      const { limit, offset } = req.query;
      const limitNum = limit ? parseInt(limit as string) : undefined;
      const offsetNum = offset ? parseInt(offset as string) : undefined;
      
      const transactions = await storage.getAllTransactions(limitNum, offsetNum);
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch transactions" });
    }
  });
  
  adminRouter.get('/transactions/pending', isAdmin, async (req, res) => {
    try {
      const transactions = await storage.getPendingTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch pending transactions" });
    }
  });
  
  adminRouter.patch('/transactions/:id/process', isAdmin, async (req, res) => {
    try {
      const adminUser = req.user as any;
      const transactionId = parseInt(req.params.id);
      const { status } = req.body;
      
      const transaction = await storage.processTransaction(
        transactionId,
        status,
        adminUser.id
      );
      
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ error: "Failed to process transaction" });
    }
  });
  
  adminRouter.get('/income-statistics', isAdmin, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      let startDateObj: Date | undefined;
      let endDateObj: Date | undefined;
      
      if (startDate) {
        startDateObj = new Date(startDate as string);
      }
      
      if (endDate) {
        endDateObj = new Date(endDate as string);
      }
      
      const stats = await storage.getIncomeStatistics(startDateObj, endDateObj);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch income statistics" });
    }
  });
  
  // Admin Activity Logs
  adminRouter.get('/activity-logs', isAdmin, async (req, res) => {
    try {
      const { adminId, limit, offset } = req.query;
      const adminIdNum = adminId ? parseInt(adminId as string) : undefined;
      const limitNum = limit ? parseInt(limit as string) : undefined;
      const offsetNum = offset ? parseInt(offset as string) : undefined;
      
      const logs = await storage.getAdminLogs(adminIdNum, limitNum, offsetNum);
      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch admin activity logs" });
    }
  });
  
  // Admin Dashboard Overview
  adminRouter.get('/dashboard', isAdmin, async (req, res) => {
    try {
      // Fetch statistics for dashboard
      const allUsers = await storage.getAllUsers();
      const premiumUsers = allUsers.filter(user => user.userType === 'premium');
      const movies = await storage.getAllMovies();
      
      // Calculate total income from transactions
      const recentTransactions = await storage.getAllTransactions(100); // Get last 100 transactions
      const totalIncome = recentTransactions.reduce((sum, t) => 
        t.status === 'completed' ? sum + t.amount : sum, 0);
      
      // Return dashboard statistics
      res.json({
        stats: {
          totalUsers: allUsers.length,
          premiumUsers: premiumUsers.length,
          totalIncome,
          totalMovies: movies.length
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({ error: "Failed to fetch dashboard data" });
    }
  });
  

  
  // Mount admin routes
  app.use("/api/admin", adminRouter);
  
  // Mount regular API routes
  app.use("/api", router);
  
  // Utility endpoint for updating test movies with video URLs
  app.patch("/api/movies/:id", async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      if (isNaN(movieId)) {
        return res.status(400).json({ error: "Invalid movie ID" });
      }
      
      const updatedMovie = await storage.updateMovie(movieId, req.body);
      res.json(updatedMovie);
    } catch (error) {
      res.status(500).json({ error: "Failed to update movie" });
    }
  });

  // PhimAPI movie data integration routes
  app.get("/api/api-movies", async (req, res) => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
      const status = req.query.status as string | undefined;

      const apiMovies = await storage.getApiMovies(limit, offset, status);
      const total = await storage.countApiMovies(status);
      
      res.json({
        data: apiMovies,
        pagination: {
          total,
          limit,
          offset,
          pages: Math.ceil(total / limit)
        }
      });
    } catch (error) {
      console.error("Failed to fetch API movies:", error);
      res.status(500).json({ message: "Failed to fetch movies from API" });
    }
  });

  app.get("/api/api-movies/:slug", async (req, res) => {
    try {
      const { slug } = req.params;
      
      const apiMovie = await storage.getApiMovieBySlug(slug);
      if (!apiMovie) {
        return res.status(404).json({ message: "API movie not found" });
      }
      
      res.json(apiMovie);
    } catch (error) {
      console.error(`Failed to fetch API movie ${req.params.slug}:`, error);
      res.status(500).json({ message: "Failed to fetch movie details from API" });
    }
  });
  
  // Get API movie sync status - Public endpoint
  app.get("/api/api-movies-sync-status", async (req, res) => {
    try {
      // Get latest sync job logs
      const latestJobs = await storage.getApiMovieJobLogs(5, 0);
      
      // Get movie counts by status
      const draftCount = await storage.countApiMovies('draft');
      const pendingCount = await storage.countApiMovies('pending_review');
      const publishedCount = await storage.countApiMovies('published');
      const totalCount = await storage.countApiMovies();
      
      res.json({
        syncJobs: latestJobs,
        counts: {
          total: totalCount,
          draft: draftCount,
          pending: pendingCount,
          published: publishedCount
        },
        lastSync: latestJobs.length > 0 ? latestJobs[0] : null
      });
    } catch (error) {
      console.error('Error fetching API movie sync status:', error);
      res.status(500).json({ message: "Failed to retrieve API movie sync status" });
    }
  });

  // Admin-only routes for managing PhimAPI data sync
  app.post("/api/admin/api-sync", async (req, res) => {
    // This would typically have authentication/authorization middleware
    try {
      const startPage = req.body.startPage || 1;
      const endPage = req.body.endPage || 5;
      const detailBatchSize = req.body.detailBatchSize || 10;
      
      // Start sync process asynchronously (non-blocking)
      syncMovies(startPage, endPage, detailBatchSize)
        .then(count => {
          console.log(`Successfully synced ${count} new movies from API`);
        })
        .catch(error => {
          console.error("Error during API sync:", error);
        });
      
      // Respond immediately
      res.json({ 
        message: "API sync started", 
        details: `Syncing pages ${startPage} to ${endPage} with batch size ${detailBatchSize}` 
      });
    } catch (error) {
      console.error("Failed to start API sync:", error);
      res.status(500).json({ message: "Failed to start API sync process" });
    }
  });

  app.get("/api/admin/api-sync/status", async (req, res) => {
    // This would typically have authentication/authorization middleware
    try {
      const jobType = req.query.jobType as string | undefined;
      const latestJob = await storage.getLatestApiMovieJobLog(jobType);
      
      if (!latestJob) {
        return res.json({ message: "No sync jobs found" });
      }
      
      // Get count of movies in different statuses
      const draftCount = await storage.countApiMovies("draft");
      const pendingCount = await storage.countApiMovies("pending_review");
      const publishedCount = await storage.countApiMovies("published");
      const totalCount = await storage.countApiMovies();
      
      res.json({
        latestJob,
        stats: {
          total: totalCount,
          draft: draftCount,
          pending_review: pendingCount,
          published: publishedCount
        }
      });
    } catch (error) {
      console.error("Failed to fetch API sync status:", error);
      res.status(500).json({ message: "Failed to fetch API sync status" });
    }
  });

  app.post("/api/admin/api-movies/:id/status", async (req, res) => {
    // This would typically have authentication/authorization middleware
    try {
      const movieId = parseInt(req.params.id);
      const { status } = req.body;
      
      if (!movieId || isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      if (!status || !["draft", "pending_review", "published", "rejected"].includes(status)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      
      // Update the movie status
      const updatedMovie = await storage.updateApiMovie(movieId, { status });
      
      res.json(updatedMovie);
    } catch (error) {
      console.error(`Failed to update API movie status for ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to update movie status" });
    }
  });

  app.post("/api/admin/api-movies/import-to-catalog/:id", async (req, res) => {
    // This would typically have authentication/authorization middleware
    try {
      const movieId = parseInt(req.params.id);
      
      if (!movieId || isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      // Get the API movie by ID
      const [apiMovie] = await storage.getApiMovies(1, 0);
      const actualMovie = apiMovie?.id === movieId ? apiMovie : null;
      if (!actualMovie) {
        return res.status(404).json({ message: "API movie not found" });
      }
      
      // Convert API movie to catalog movie
      const catalogMovie = {
        title: actualMovie.title,
        description: actualMovie.description,
        releaseYear: actualMovie.releaseYear || new Date().getFullYear(),
        duration: actualMovie.duration ? parseInt(actualMovie.duration) : 120, // Default to 2 hours if unknown
        posterUrl: actualMovie.posterUrl,
        backdropUrl: actualMovie.backdropUrl || actualMovie.posterUrl,
        rating: "PG-13", // Default
        genreIds: [1], // Default - would be mapped from categories in a full implementation
        videoSources: actualMovie.episodes.map(episode => ({
          type: "embed",
          url: episode.embedUrl,
          label: episode.name,
          quality: actualMovie.quality || "HD"
        })),
      };
      
      // Create the new catalog movie
      const newMovie = await storage.createMovie(catalogMovie);
      
      // Create movie upload record
      const admin = req.user?.id || 1; // Default to ID 1 if not authenticated
      await storage.createMovieUpload({
        movieId: newMovie.id,
        uploadedBy: admin,
        status: "published",
        approvedBy: admin,
        reviewNotes: `Imported from PhimAPI (ID: ${apiMovie.id}, Slug: ${apiMovie.slug})`,
        publishedAt: new Date()
      });
      
      // Update API movie status to published
      await storage.updateApiMovie(movieId, { status: "published" });
      
      res.json({
        message: "Movie successfully imported to catalog",
        apiMovie,
        catalogMovie: newMovie
      });
    } catch (error) {
      console.error(`Failed to import API movie ID ${req.params.id}:`, error);
      res.status(500).json({ message: "Failed to import movie to catalog" });
    }
  });
  
  // Initialize the scheduled movie sync if not in test environment
  if (process.env.NODE_ENV !== 'test') {
    initScheduledSync();
  }

  const httpServer = createServer(app);
  return httpServer;
}