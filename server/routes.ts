import express, { type Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertMovieSchema, insertUserSchema, insertFavoriteSchema, insertViewHistorySchema } from "@shared/schema";
import { setupAuth } from "./auth";
import axios from "axios";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);
  
  const router = express.Router();

  // Movies routes
  router.get("/movies", async (req, res) => {
    try {
      const movies = await storage.getAllMovies();
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch movies" });
    }
  });

  router.get("/movies/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const movie = await storage.getMovie(id);
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      res.json(movie);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch movie" });
    }
  });

  router.get("/movies/genre/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid genre ID" });
      }
      
      const movies = await storage.getMoviesByGenre(id);
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch movies by genre" });
    }
  });

  router.get("/movies/search", async (req, res) => {
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

  router.get("/featured-movies", async (req, res) => {
    try {
      const movies = await storage.getFeaturedMovies();
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch featured movies" });
    }
  });

  router.get("/new-releases", async (req, res) => {
    try {
      const movies = await storage.getNewReleases();
      res.json(movies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch new releases" });
    }
  });

  router.post("/movies", async (req, res) => {
    try {
      const movieData = insertMovieSchema.parse(req.body);
      const movie = await storage.createMovie(movieData);
      res.status(201).json(movie);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid movie data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create movie" });
    }
  });

  // Genres routes
  router.get("/genres", async (req, res) => {
    try {
      const genres = await storage.getAllGenres();
      res.json(genres);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch genres" });
    }
  });

  router.get("/genres/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid genre ID" });
      }
      
      const genre = await storage.getGenre(id);
      if (!genre) {
        return res.status(404).json({ message: "Genre not found" });
      }
      
      res.json(genre);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch genre" });
    }
  });

  // User routes
  router.post("/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if username already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(409).json({ message: "Username already taken" });
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json({ id: user.id, username: user.username });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Favorites routes - Protected routes
  router.get("/favorites", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const favorites = await storage.getUserFavorites(userId);
      res.json(favorites);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch favorites" });
    }
  });

  router.post("/favorites", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      // Add the user ID from the authenticated session
      const userId = req.user!.id;
      const movieId = req.body.movieId;
      
      if (!movieId) {
        return res.status(400).json({ message: "Movie ID is required" });
      }
      
      const favorite = await storage.addFavorite({
        userId,
        movieId,
        createdAt: new Date()
      });
      
      res.status(201).json(favorite);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid favorite data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to add favorite" });
    }
  });

  router.delete("/favorites/:movieId", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const movieId = parseInt(req.params.movieId);
      
      if (isNaN(movieId)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      await storage.removeFavorite(userId, movieId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to remove favorite" });
    }
  });

  // View history routes - Protected routes
  router.get("/history", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const history = await storage.getUserViewHistory(userId);
      res.json(history);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch view history" });
    }
  });

  router.post("/history", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const { movieId, progress } = req.body;
      
      if (!movieId) {
        return res.status(400).json({ message: "Movie ID is required" });
      }
      
      const history = await storage.addOrUpdateViewHistory({
        userId,
        movieId,
        progress: progress || 0,
        watchedAt: new Date()
      });
      
      res.status(201).json(history);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid history data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update view history" });
    }
  });

  // User Profile Management
  router.get("/profile", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Return user details without sensitive information
      res.json({
        id: user.id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        walletBalance: user.walletBalance,
        walletAddress: user.walletAddress,
        premiumExpiresAt: user.premiumExpiresAt,
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Update wallet address
  router.put("/profile/wallet-address", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const { walletAddress } = req.body;
      
      if (!walletAddress) {
        return res.status(400).json({ message: "Wallet address is required" });
      }
      
      // Update wallet address in the database
      const updatedUser = await storage.updateUser(userId, { walletAddress });
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        walletAddress: updatedUser.walletAddress
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to update wallet address" });
    }
  });

  // Deposit funds via USDT
  router.post("/profile/deposit", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const { amount, transactionHash } = req.body;
      
      if (!amount || !transactionHash) {
        return res.status(400).json({ message: "Amount and transaction hash are required" });
      }
      
      // In a real implementation, you would verify the transaction on the blockchain
      // For this demo, we'll assume the transaction is valid
      
      // Update user's wallet balance
      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      const updatedUser = await storage.updateUser(userId, {
        walletBalance: user.walletBalance + parseInt(amount)
      });
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        walletBalance: updatedUser.walletBalance,
        message: `Successfully deposited ${amount} USDT`
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to process deposit" });
    }
  });

  // Upgrade to premium
  router.post("/profile/upgrade", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Premium membership costs 100 USDT for 30 days
      const premiumCost = 10000; // 100 USDT in cents
      
      if (user.walletBalance < premiumCost) {
        return res.status(400).json({ 
          message: "Insufficient funds",
          walletBalance: user.walletBalance,
          premiumCost
        });
      }
      
      // Calculate premium expiration date
      const now = new Date();
      const expiresAt = new Date(now.setDate(now.getDate() + 30));
      
      // Update user to premium status and deduct balance
      const updatedUser = await storage.updateUser(userId, {
        userType: "premium",
        walletBalance: user.walletBalance - premiumCost,
        premiumExpiresAt: expiresAt
      });
      
      res.json({
        id: updatedUser.id,
        username: updatedUser.username,
        userType: updatedUser.userType,
        walletBalance: updatedUser.walletBalance,
        premiumExpiresAt: updatedUser.premiumExpiresAt,
        message: "Successfully upgraded to premium membership"
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to upgrade to premium" });
    }
  });

  // Get premium content (trending movies)
  router.get("/premium/trending", async (req, res) => {
    try {
      // Check if user is authenticated
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in" });
      }
      
      const userId = req.user!.id;
      const user = await storage.getUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Check if user is premium
      if (user.userType !== "premium") {
        return res.status(403).json({ message: "This content is only available for premium users" });
      }
      
      // Check if premium subscription is still valid
      if (user.premiumExpiresAt && new Date() > user.premiumExpiresAt) {
        // Update user to normal if premium has expired
        await storage.updateUser(userId, {
          userType: "normal",
          premiumExpiresAt: null
        });
        return res.status(403).json({ message: "Your premium subscription has expired" });
      }
      
      // For this demo, we'll return the top 5 movies by view count as trending
      const trendingMovies = await storage.getTrendingMovies();
      res.json(trendingMovies);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trending movies" });
    }
  });

  // Google Drive integration
  router.get("/drive/folder/:folderId", async (req, res) => {
    try {
      const { folderId } = req.params;
      
      if (!folderId) {
        return res.status(400).json({ message: "Folder ID is required" });
      }
      
      try {
        // Log environment variable presence without revealing the key
        console.log(`GOOGLE_API_KEY exists: ${!!process.env.GOOGLE_API_KEY}`);
        
        // Fetch files from the folder
        const filesResponse = await axios.get(
          `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${process.env.GOOGLE_API_KEY}&fields=files(id,name,mimeType,videoMediaMetadata,fileExtension,size,createdTime,thumbnailLink)&orderBy=name`
        );
        
        // Fetch folder name
        const folderResponse = await axios.get(
          `https://www.googleapis.com/drive/v3/files/${folderId}?key=${process.env.GOOGLE_API_KEY}&fields=name`
        );
        
        // Filter video files
        const videoFiles = filesResponse.data.files.filter((file: any) => 
          file.mimeType.includes('video') || 
          (file.fileExtension && ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(file.fileExtension.toLowerCase()))
        );
        
        res.json({
          id: folderId,
          name: folderResponse.data.name || 'Movies Folder',
          files: videoFiles
        });
      } catch (error) {
        console.error("Error fetching Google Drive content:", error);
        res.status(500).json({ 
          error: "Failed to fetch Google Drive content", 
          details: error.message,
          apiKeyExists: !!process.env.GOOGLE_API_KEY 
        });
      }
    } catch (error) {
      res.status(500).json({ message: "Failed to process Google Drive request" });
    }
  });
  
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

  app.use("/api", router);

  const httpServer = createServer(app);
  return httpServer;
}
