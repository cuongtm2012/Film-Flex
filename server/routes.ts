import type { Express } from "express";
import { createServer, type Server } from "http";
import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { storage } from "./storage";

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
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to retrieve movies" });
    }
  });
  


  router.get("/movie/:id", async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const movie = await storage.getMovie(movieId);
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      res.json(movie);
    } catch (error) {
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
      res.status(201).json(movie);
    } catch (error) {
      res.status(500).json({ error: "Failed to create movie" });
    }
  });
  
  adminRouter.patch('/movies/:id', isAdmin, async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      const updatedMovie = await storage.updateMovie(movieId, req.body);
      res.json(updatedMovie);
    } catch (error) {
      res.status(500).json({ error: "Failed to update movie" });
    }
  });
  
  adminRouter.delete('/movies/:id', isAdmin, async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      await storage.deleteMovie(movieId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: "Failed to delete movie" });
    }
  });
  
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
  
  // Mount admin routes
  app.use("/api/admin", adminRouter);
  
  // Mount regular API routes
  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}