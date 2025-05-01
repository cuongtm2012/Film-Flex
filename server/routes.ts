import type { Express } from "express";
import { createServer, type Server } from "http";
import express, { Request, Response, NextFunction } from "express";
import axios from "axios";
import { storage } from "./storage";
import { syncMovies, fetchAndStorePage, fetchAndStoreMovieDetail, processPendingDetailFetches, initScheduledSync } from "./services/phimapi/service";
import { getMoviesByCategory } from "./services/category/service";

// Helper function to extract video URL from episodes
function getVideoUrlFromEpisodes(apiMovie: any): string {
  if (!apiMovie.episodes) return '';
  if (!Array.isArray(apiMovie.episodes) || apiMovie.episodes.length === 0) return '';
  const firstEpisode = apiMovie.episodes[0];
  if (!firstEpisode) return '';
  return firstEpisode.streamUrl || firstEpisode.embedUrl || '';
}

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
      console.log("GET /api/movies request with query:", req.query);
      
      // Check if pagination parameters are provided
      const page = req.query.page ? parseInt(req.query.page as string) : 1;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
      const includeApi = req.query.includeApi !== 'false'; // Include API movies by default
      const category = req.query.category as string | undefined;
      const source = req.query.source as string;
      
      console.log(`Parsed params: page=${page}, limit=${limit}, includeApi=${includeApi}, category=${category}, source=${source}`);
      
      // Handle category-based filtering
      if (category && category !== 'all') {
        console.log(`Filtering movies by category slug: ${category}`);
        
        try {
          // Get category from the database
          const categoryObj = await storage.getCategoryBySlug(category);
          if (!categoryObj) {
            console.log(`Category not found with slug: ${category}`);
            return res.json({ 
              data: [], 
              pagination: { 
                current_page: page, 
                total_pages: 0, 
                total: 0, 
                per_page: limit 
              }
            });
          }
          
          console.log(`Found category: ${categoryObj.name} (ID: ${categoryObj.id})`);
          
          // Get regular movies for this category
          const result = await storage.getMoviesByCategoryPaginated(categoryObj.id, page, limit);
          
          let moviesForResponse = result.movies;
          let totalCount = result.total;
          let totalPages = result.totalPages;
          
          // Get API movies if we have room and if including API is requested
          if (includeApi && result.movies.length < limit) {
            const remainingSpace = limit - result.movies.length;
            const offset = (page - 1) * limit;
            
            // Get API movies for this category
            const apiMovies = await storage.getApiMoviesByCategory(
              categoryObj.name,
              remainingSpace,
              offset
            );
            
            console.log(`Got ${apiMovies.length} API movies for category: ${category}`);
            
            if (apiMovies.length > 0) {
              // Transform API movies to regular movie format
              const transformedApiMovies = apiMovies.map(apiMovie => {
                // Default to using the category ID as genre ID
                const genreIds = [categoryObj.id || 1];
                
                // Process other fields
                const castArray = Array.isArray(apiMovie.actors) ? apiMovie.actors : 
                                 (typeof apiMovie.actors === 'string' ? apiMovie.actors.split(',') : []);
                
                // Get video URL from episodes
                const videoUrl = getVideoUrlFromEpisodes(apiMovie);
                
                return {
                  id: apiMovie.id + 10000, // Add 10000 to avoid ID conflicts
                  title: apiMovie.title || 'Unknown Title',
                  description: apiMovie.description || '',
                  releaseYear: parseInt(apiMovie.releaseYear as string) || 2023,
                  duration: apiMovie.duration || 100,
                  rating: "PG-13",
                  videoSources: [],
                  genreIds: genreIds,
                  director: apiMovie.director || "Unknown Director",
                  cast: castArray,
                  posterUrl: apiMovie.posterUrl || '',
                  backdropUrl: apiMovie.backdropUrl || '',
                  videoUrl: videoUrl,
                  trailerUrl: apiMovie.trailerUrl || '',
                  imdbRating: apiMovie.imdbRating || 7.5,
                  viewCount: 0,
                  createdAt: apiMovie.createdAt || new Date().toISOString(),
                  updatedAt: apiMovie.updatedAt || new Date().toISOString()
                };
              });
              
              // Combine regular and API movies
              moviesForResponse = [...result.movies, ...transformedApiMovies];
              
              // Get count of API movies for this category for pagination
              const apiMovieCount = await storage.countApiMoviesByCategory(categoryObj.name);
              totalCount = result.total + apiMovieCount;
              totalPages = Math.ceil(totalCount / limit);
            }
          }
          
          const response = {
            data: moviesForResponse,
            pagination: {
              current_page: page,
              total_pages: totalPages,
              total: totalCount,
              per_page: limit
            }
          };
          
          console.log("Sending category filtered response with movie count:", moviesForResponse.length);
          return res.json(response);
        } catch (error) {
          console.error(`Error filtering by category: ${error}`);
          return res.status(500).json({ 
            message: "Error filtering by category", 
            error: String(error) 
          });
        }
      }
      
      // Handle API-only source filter
      if (source === 'api') {
        console.log("Getting API-only movies");
        const apiMovies = await storage.getApiMovies(undefined, undefined, 'published');
        
        // Transform API movies to regular movie format
        const transformedApiMovies = apiMovies.map(apiMovie => {
          // Map categories to genre IDs
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
          
          const categories: string[] = Array.isArray(apiMovie.categories) ? apiMovie.categories : [];
          const genreIds = categories.length > 0 
            ? categories.map(cat => {
                const genreId = genreMap[cat as keyof typeof genreMap];
                return genreId || 1;
              })
            : [1];
          
          const castArray = Array.isArray(apiMovie.actors) ? apiMovie.actors : 
                         (typeof apiMovie.actors === 'string' ? apiMovie.actors.split(',') : []);
          
          const videoUrl = getVideoUrlFromEpisodes(apiMovie);
          
          return {
            id: apiMovie.id + 10000,
            title: apiMovie.title || 'Unknown Title',
            description: apiMovie.description || '',
            releaseYear: parseInt(apiMovie.releaseYear as string) || 2023,
            duration: apiMovie.duration || 100,
            rating: "PG-13",
            videoSources: [],
            genreIds: genreIds,
            director: apiMovie.director || "Unknown Director",
            cast: castArray,
            posterUrl: apiMovie.posterUrl || '',
            backdropUrl: apiMovie.backdropUrl || '',
            videoUrl: videoUrl,
            trailerUrl: apiMovie.trailerUrl || '',
            imdbRating: apiMovie.imdbRating || 7.5,
            viewCount: 0
          };
        });
        
        return res.json(transformedApiMovies);
      }
      
      // Handle combined source or default (no special filters)
      // Regular pagination
      console.log("Getting paginated movies");
      const result = await storage.getPaginatedMovies(page, limit);
      let moviesForResponse = result.movies;
      let totalCount = result.total;
      let totalPages = result.totalPages;
      
      // Include API movies if requested
      if (includeApi) {
        console.log("Including API movies in response");
        const apiMoviesResult = await storage.getApiMovies(
          limit,
          (page - 1) * limit,
          'published'
        );
        
        const apiMovies = apiMoviesResult || [];
        console.log(`Got ${apiMovies.length} API movies`);
        
        if (apiMovies.length > 0) {
          // Transform API movies to regular movie format
          const transformedApiMovies = apiMovies.map(apiMovie => {
            // Map categories to genre IDs
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
            
            const categories: string[] = Array.isArray(apiMovie.categories) ? apiMovie.categories : [];
            const genreIds = categories.length > 0 
              ? categories.map(cat => {
                  const genreId = genreMap[cat as keyof typeof genreMap];
                  return genreId || 1;
                })
              : [1];
            
            const castArray = Array.isArray(apiMovie.actors) ? apiMovie.actors : 
                           (typeof apiMovie.actors === 'string' ? apiMovie.actors.split(',') : []);
            
            const videoUrl = getVideoUrlFromEpisodes(apiMovie);
            
            return {
              id: apiMovie.id + 10000,
              title: apiMovie.title || 'Unknown Title',
              description: apiMovie.description || '',
              releaseYear: parseInt(apiMovie.releaseYear as string) || 2023,
              duration: apiMovie.duration || 100,
              rating: "PG-13",
              videoSources: [],
              genreIds: genreIds,
              director: apiMovie.director || "Unknown Director",
              cast: castArray,
              posterUrl: apiMovie.posterUrl || '',
              backdropUrl: apiMovie.backdropUrl || '',
              videoUrl: videoUrl,
              trailerUrl: apiMovie.trailerUrl || '',
              imdbRating: apiMovie.imdbRating || 7.5,
              viewCount: 0,
              createdAt: apiMovie.createdAt || new Date().toISOString(),
              updatedAt: apiMovie.updatedAt || new Date().toISOString()
            };
          });
          
          // Combine regular and API movies
          moviesForResponse = [...result.movies, ...transformedApiMovies];
          
          // Update pagination info with API movies count
          const apiMovieCount = await storage.countApiMovies('published');
          totalCount += apiMovieCount;
          totalPages = Math.ceil(totalCount / limit);
        }
      }
      
      const response = {
        data: moviesForResponse,
        pagination: {
          current_page: page,
          total_pages: totalPages,
          total: totalCount,
          per_page: limit
        }
      };
      
      console.log("Sending standard paginated response with movie count:", moviesForResponse.length);
      return res.json(response);
    } catch (error) {
      console.error("Error in /api/movies endpoint:", error);
      return res.status(500).json({ 
        message: "Error fetching movies", 
        error: String(error) 
      });
    }
  });

  // Movie details endpoint
  router.get("/movies/:id", async (req, res) => {
    try {
      const movieId = parseInt(req.params.id);
      console.log(`GET /api/movies/${movieId}`);
      
      // Check if this is an API movie ID (has ID > 10000)
      if (movieId > 10000) {
        const apiMovieId = movieId - 10000;
        console.log(`Fetching API movie with ID: ${apiMovieId}`);
        
        const apiMovie = await storage.getApiMovieById(apiMovieId);
        if (!apiMovie) {
          return res.status(404).json({ message: "API Movie not found" });
        }
        
        // Transform API movie to response format with episodes info
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
        
        const categories: string[] = Array.isArray(apiMovie.categories) ? apiMovie.categories : [];
        const genreIds = categories.length > 0 
          ? categories.map(cat => {
              const genreId = genreMap[cat as keyof typeof genreMap];
              return genreId || 1;
            })
          : [1];
        
        const castArray = Array.isArray(apiMovie.actors) ? apiMovie.actors : 
                       (typeof apiMovie.actors === 'string' ? apiMovie.actors.split(',') : []);
        
        const episodesArray = Array.isArray(apiMovie.episodes) ? apiMovie.episodes : [];
        
        const responseMovie = {
          id: apiMovie.id + 10000,
          title: apiMovie.title || 'Unknown Title',
          description: apiMovie.description || '',
          releaseYear: parseInt(apiMovie.releaseYear as string) || 2023,
          duration: apiMovie.duration || 100,
          rating: "PG-13",
          videoSources: [],
          genreIds: genreIds,
          director: apiMovie.director || "Unknown Director",
          cast: castArray,
          posterUrl: apiMovie.posterUrl || '',
          backdropUrl: apiMovie.backdropUrl || '',
          trailerUrl: apiMovie.trailerUrl || '',
          imdbRating: apiMovie.imdbRating || 7.5,
          viewCount: 0,
          isApiMovie: true,
          episodes: episodesArray,
          createdAt: apiMovie.createdAt || new Date().toISOString(),
          updatedAt: apiMovie.updatedAt || new Date().toISOString()
        };
        
        return res.json(responseMovie);
      }
      
      // Otherwise, it's a regular movie
      console.log(`Fetching regular movie with ID: ${movieId}`);
      const movie = await storage.getMovieById(movieId);
      
      if (!movie) {
        return res.status(404).json({ message: "Movie not found" });
      }
      
      return res.json(movie);
    } catch (error) {
      console.error(`Error fetching movie details: ${error}`);
      return res.status(500).json({ 
        message: "Error fetching movie details", 
        error: String(error) 
      });
    }
  });

  // Categories endpoint
  router.get("/categories", async (req, res) => {
    try {
      console.log("GET /api/categories");
      const categories = await storage.getAllCategories();
      return res.json(categories);
    } catch (error) {
      console.error(`Error fetching categories: ${error}`);
      return res.status(500).json({ 
        message: "Error fetching categories", 
        error: String(error) 
      });
    }
  });

  // Admin routes
  router.post("/admin/sync-movies", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log("POST /api/admin/sync-movies");
      
      // Start movie sync process in the background
      syncMovies().catch(err => console.error("Error in movie sync:", err));
      
      return res.json({ message: "Movie sync started" });
    } catch (error) {
      console.error(`Error starting movie sync: ${error}`);
      return res.status(500).json({ 
        message: "Error starting movie sync", 
        error: String(error) 
      });
    }
  });

  router.post("/admin/fetch-page", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log("POST /api/admin/fetch-page", req.body);
      
      const { page } = req.body;
      if (!page || isNaN(parseInt(page as string))) {
        return res.status(400).json({ message: "Invalid page number" });
      }
      
      const pageNum = parseInt(page as string);
      const result = await fetchAndStorePage(pageNum);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error fetching API page: ${error}`);
      return res.status(500).json({ 
        message: "Error fetching API page", 
        error: String(error) 
      });
    }
  });

  router.post("/admin/fetch-movie-detail", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log("POST /api/admin/fetch-movie-detail", req.body);
      
      const { id, slug, type } = req.body;
      if (!id || !slug) {
        return res.status(400).json({ message: "Missing id or slug" });
      }
      
      const result = await fetchAndStoreMovieDetail(id, slug, type);
      
      return res.json(result);
    } catch (error) {
      console.error(`Error fetching movie detail: ${error}`);
      return res.status(500).json({ 
        message: "Error fetching movie detail", 
        error: String(error) 
      });
    }
  });

  router.post("/admin/process-details", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      console.log("POST /api/admin/process-details");
      
      // Process pending detail fetches in the background
      processPendingDetailFetches().catch(err => console.error("Error processing movie details:", err));
      
      return res.json({ message: "Processing pending movie details" });
    } catch (error) {
      console.error(`Error processing movie details: ${error}`);
      return res.status(500).json({ 
        message: "Error processing movie details", 
        error: String(error) 
      });
    }
  });

  router.post("/admin/publish-movie/:id", async (req, res) => {
    try {
      if (!req.isAuthenticated() || req.user.role !== 'admin') {
        return res.status(403).json({ message: "Unauthorized" });
      }
      
      const id = parseInt(req.params.id);
      console.log(`POST /api/admin/publish-movie/${id}`);
      
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid movie ID" });
      }
      
      const result = await storage.updateApiMovieStatus(id, 'published');
      
      return res.json({
        message: result ? "Movie published successfully" : "Failed to publish movie",
        success: result
      });
    } catch (error) {
      console.error(`Error publishing movie: ${error}`);
      return res.status(500).json({ 
        message: "Error publishing movie", 
        error: String(error) 
      });
    }
  });

  // Register routes
  app.use("/api", router);

  // Initialize the HTTP server
  const httpServer = createServer(app);

  return httpServer;
}