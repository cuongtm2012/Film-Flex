import {
  users, type User, type InsertUser,
  genres, type Genre, type InsertGenre,
  movies, type Movie, type InsertMovie,
  favorites, type Favorite, type InsertFavorite,
  viewHistory, type ViewHistory, type InsertViewHistory,
  transactions, type Transaction, type InsertTransaction,
  adminLogs, type AdminLog, type InsertAdminLog,
  movieUploads, type MovieUpload, type InsertMovieUpload
} from "@shared/schema";
import memorystore from 'memorystore';
import session from 'express-session';

// Create memory store for sessions
const MemoryStore = memorystore(session);

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<Omit<User, 'id' | 'username' | 'password'>>): Promise<User>;
  
  // Genre methods
  getAllGenres(): Promise<Genre[]>;
  getGenre(id: number): Promise<Genre | undefined>;
  createGenre(genre: InsertGenre): Promise<Genre>;
  
  // Movie methods
  getAllMovies(): Promise<Movie[]>;
  getMovie(id: number): Promise<Movie | undefined>;
  getMoviesByGenre(genreId: number): Promise<Movie[]>;
  searchMovies(query: string): Promise<Movie[]>;
  getFeaturedMovies(): Promise<Movie[]>;
  getNewReleases(): Promise<Movie[]>;
  getTrendingMovies(): Promise<Movie[]>; // For premium users
  createMovie(movie: InsertMovie): Promise<Movie>;
  updateMovie(id: number, updates: Partial<Omit<Movie, 'id'>>): Promise<Movie>;
  deleteMovie(id: number): Promise<void>;
  
  // Favorites methods
  getUserFavorites(userId: number): Promise<Movie[]>;
  addFavorite(favorite: InsertFavorite): Promise<Favorite>;
  removeFavorite(userId: number, movieId: number): Promise<void>;
  
  // View history methods
  getUserViewHistory(userId: number): Promise<ViewHistory[]>;
  addOrUpdateViewHistory(history: InsertViewHistory): Promise<ViewHistory>;
  
  // Session store for authentication
  sessionStore: any;
  
  // ========== ADMIN METHODS ==========
  
  // Admin User Management
  getAllUsers(): Promise<User[]>;
  getUsersByRole(role: string): Promise<User[]>;
  createAdminUser(user: InsertUser): Promise<User>;
  updateUserRole(userId: number, role: string, adminId: number): Promise<User>;
  deactivateUser(userId: number, adminId: number): Promise<User>;
  reactivateUser(userId: number, adminId: number): Promise<User>;
  
  // Admin Movie Management
  createMovieUpload(movieUpload: InsertMovieUpload): Promise<MovieUpload>;
  getMovieUpload(id: number): Promise<MovieUpload | undefined>;
  getPendingMovieUploads(): Promise<MovieUpload[]>;
  updateMovieUploadStatus(id: number, status: string, adminId: number, notes?: string): Promise<MovieUpload>;
  getMoviesByUploader(uploaderId: number): Promise<Movie[]>;
  
  // Financial Management
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getUserTransactions(userId: number): Promise<Transaction[]>;
  getAllTransactions(limit?: number, offset?: number): Promise<Transaction[]>;
  getPendingTransactions(): Promise<Transaction[]>;
  processTransaction(id: number, status: string, adminId: number): Promise<Transaction>;
  getIncomeStatistics(startDate?: Date, endDate?: Date): Promise<{
    totalIncome: number;
    subscriptions: number;
    deposits: number;
    refunds: number;
  }>;
  
  // Admin Activity Logging
  logAdminActivity(log: InsertAdminLog): Promise<AdminLog>;
  getAdminLogs(adminId?: number, limit?: number, offset?: number): Promise<AdminLog[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private genres: Map<number, Genre>;
  private movies: Map<number, Movie>;
  private favorites: Map<number, Favorite>;
  private viewHistory: Map<number, ViewHistory>;
  private transactions: Map<number, Transaction>;
  private adminLogs: Map<number, AdminLog>;
  private movieUploads: Map<number, MovieUpload>;
  
  currentUserId: number;
  currentGenreId: number;
  currentMovieId: number;
  currentFavoriteId: number;
  currentViewHistoryId: number;
  currentTransactionId: number;
  currentAdminLogId: number;
  currentMovieUploadId: number;
  
  // Session store for authentication
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.genres = new Map();
    this.movies = new Map();
    this.favorites = new Map();
    this.viewHistory = new Map();
    this.transactions = new Map();
    this.adminLogs = new Map();
    this.movieUploads = new Map();
    
    this.currentUserId = 1;
    this.currentGenreId = 1;
    this.currentMovieId = 1;
    this.currentFavoriteId = 1;
    this.currentViewHistoryId = 1;
    this.currentTransactionId = 1;
    this.currentAdminLogId = 1;
    this.currentMovieUploadId = 1;
    
    // Initialize session store
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    });
    
    // Add some initial genres
    this.initializeGenres();
    
    // Add some initial movies
    this.initializeMovies();
    
    // Add admin user
    this.initializeAdminUser();
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    
    // Ensure all optional fields have proper default values
    const user: User = { 
      ...insertUser, 
      id, 
      email: insertUser.email || null,
      userType: insertUser.userType || "normal",
      walletBalance: insertUser.walletBalance || 0,
      walletAddress: insertUser.walletAddress || null,
      premiumExpiresAt: insertUser.premiumExpiresAt || null,
      role: insertUser.role || "user",
      isActive: insertUser.isActive !== undefined ? insertUser.isActive : true,
      lastLogin: null,
      createdBy: insertUser.createdBy || null
    };
    
    this.users.set(id, user);
    return user;
  }
  
  // Genre methods
  async getAllGenres(): Promise<Genre[]> {
    return Array.from(this.genres.values());
  }
  
  async getGenre(id: number): Promise<Genre | undefined> {
    return this.genres.get(id);
  }
  
  async createGenre(insertGenre: InsertGenre): Promise<Genre> {
    const id = this.currentGenreId++;
    const genre: Genre = { ...insertGenre, id };
    this.genres.set(id, genre);
    return genre;
  }
  
  // Movie methods
  async getAllMovies(): Promise<Movie[]> {
    return Array.from(this.movies.values());
  }
  
  async getMovie(id: number): Promise<Movie | undefined> {
    return this.movies.get(id);
  }
  
  async getMoviesByGenre(genreId: number): Promise<Movie[]> {
    return Array.from(this.movies.values()).filter(movie => 
      movie.genreIds.includes(genreId)
    );
  }
  
  async searchMovies(query: string): Promise<Movie[]> {
    const lowerQuery = query.toLowerCase();
    return Array.from(this.movies.values()).filter(movie => 
      movie.title.toLowerCase().includes(lowerQuery) || 
      movie.description.toLowerCase().includes(lowerQuery)
    );
  }
  
  async getFeaturedMovies(): Promise<Movie[]> {
    // For this demo, we'll return the first 5 movies as featured
    return Array.from(this.movies.values()).slice(0, 5);
  }
  
  async getNewReleases(): Promise<Movie[]> {
    // For this demo, we'll sort by releaseYear and return the most recent ones
    return Array.from(this.movies.values())
      .sort((a, b) => b.releaseYear - a.releaseYear)
      .slice(0, 5);
  }
  
  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const id = this.currentMovieId++;
    const movie: Movie = { 
      ...insertMovie, 
      id,
      matchPercentage: insertMovie.matchPercentage || null,
      videoUrl: insertMovie.videoUrl || null,
      director: insertMovie.director || null,
      cast: insertMovie.cast || null,
      imdbRating: insertMovie.imdbRating || null,
      viewCount: insertMovie.viewCount || 0
    };
    this.movies.set(id, movie);
    return movie;
  }
  
  async getTrendingMovies(): Promise<Movie[]> {
    // Return movies sorted by view count (most viewed first)
    return Array.from(this.movies.values())
      .sort((a, b) => (b.viewCount || 0) - (a.viewCount || 0))
      .slice(0, 5);
  }
  
  async updateMovie(id: number, updates: Partial<Omit<Movie, 'id'>>): Promise<Movie> {
    const movie = this.movies.get(id);
    
    if (!movie) {
      throw new Error(`Movie with ID ${id} not found`);
    }
    
    const updatedMovie = {
      ...movie,
      ...updates
    };
    
    this.movies.set(id, updatedMovie);
    return updatedMovie;
  }
  
  async deleteMovie(id: number): Promise<void> {
    if (!this.movies.has(id)) {
      throw new Error(`Movie with ID ${id} not found`);
    }
    
    this.movies.delete(id);
    
    // Also delete related data (favorites, view history)
    Array.from(this.favorites.values())
      .filter(fav => fav.movieId === id)
      .forEach(fav => this.favorites.delete(fav.id));
      
    Array.from(this.viewHistory.values())
      .filter(history => history.movieId === id)
      .forEach(history => this.viewHistory.delete(history.id));
  }
  
  async updateUser(
    id: number, 
    updates: Partial<Omit<User, 'id' | 'username' | 'password'>>
  ): Promise<User> {
    const user = this.users.get(id);
    
    if (!user) {
      throw new Error(`User with ID ${id} not found`);
    }
    
    const updatedUser = {
      ...user,
      ...updates
    };
    
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  // Favorites methods
  async getUserFavorites(userId: number): Promise<Movie[]> {
    const userFavorites = Array.from(this.favorites.values())
      .filter(favorite => favorite.userId === userId);
    
    return userFavorites.map(favorite => 
      this.movies.get(favorite.movieId)!
    ).filter(Boolean);
  }
  
  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const id = this.currentFavoriteId++;
    const favorite: Favorite = { 
      ...insertFavorite, 
      id, 
      createdAt: new Date() 
    };
    this.favorites.set(id, favorite);
    return favorite;
  }
  
  async removeFavorite(userId: number, movieId: number): Promise<void> {
    const favoriteToRemove = Array.from(this.favorites.values()).find(
      favorite => favorite.userId === userId && favorite.movieId === movieId
    );
    
    if (favoriteToRemove) {
      this.favorites.delete(favoriteToRemove.id);
    }
  }
  
  // View history methods
  async getUserViewHistory(userId: number): Promise<ViewHistory[]> {
    return Array.from(this.viewHistory.values())
      .filter(history => history.userId === userId)
      .sort((a, b) => {
        const aTime = a.watchedAt?.getTime() || 0;
        const bTime = b.watchedAt?.getTime() || 0;
        return bTime - aTime;
      });
  }
  
  async addOrUpdateViewHistory(insertHistory: InsertViewHistory): Promise<ViewHistory> {
    // Check if there's already an entry for this user and movie
    const existingHistory = Array.from(this.viewHistory.values()).find(
      history => history.userId === insertHistory.userId && history.movieId === insertHistory.movieId
    );
    
    // Increment movie view count
    const movie = this.movies.get(insertHistory.movieId);
    if (movie && (!existingHistory || (existingHistory.progress ?? 0) < 10)) {
      // Only count as a new view if it's a new history entry or previous progress was minimal
      const updatedMovie = { 
        ...movie, 
        viewCount: (movie.viewCount || 0) + 1 
      };
      this.movies.set(movie.id, updatedMovie);
    }
    
    if (existingHistory) {
      // Update the existing entry
      const updatedHistory: ViewHistory = {
        ...existingHistory,
        progress: insertHistory.progress || existingHistory.progress,
        watchedAt: new Date()
      };
      this.viewHistory.set(existingHistory.id, updatedHistory);
      return updatedHistory;
    } else {
      // Create a new entry
      const id = this.currentViewHistoryId++;
      const history: ViewHistory = { 
        ...insertHistory, 
        id, 
        watchedAt: new Date(),
        progress: insertHistory.progress || 0
      };
      this.viewHistory.set(id, history);
      return history;
    }
  }
  
  // Helper methods to initialize sample data
  private initializeGenres() {
    const genreNames = [
      "Action", "Adventure", "Comedy", "Drama", "Horror", 
      "Science Fiction", "Thriller", "Documentary", "Animation"
    ];
    
    genreNames.forEach(name => {
      const genre: Genre = {
        id: this.currentGenreId++,
        name
      };
      this.genres.set(genre.id, genre);
    });
  }
  
  // ========== ADMIN USER MANAGEMENT ==========
  
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }
  
  async getUsersByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.role === role);
  }
  
  async createAdminUser(user: InsertUser): Promise<User> {
    // Same as createUser but with role set to admin or sub-admin
    const adminUser = { ...user, role: user.role || "admin" };
    return this.createUser(adminUser);
  }
  
  async updateUserRole(userId: number, role: string, adminId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Log the admin action
    await this.logAdminActivity({
      adminId,
      action: "update_user_role",
      entityId: userId,
      entityType: "user",
      details: { oldRole: user.role, newRole: role }
    });
    
    return this.updateUser(userId, { role: role as "user" | "admin" | "sub-admin" });
  }
  
  async deactivateUser(userId: number, adminId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Log the admin action
    await this.logAdminActivity({
      adminId,
      action: "deactivate_user",
      entityId: userId,
      entityType: "user",
      details: { reason: "Admin deactivation" }
    });
    
    return this.updateUser(userId, { isActive: false });
  }
  
  async reactivateUser(userId: number, adminId: number): Promise<User> {
    const user = await this.getUser(userId);
    if (!user) {
      throw new Error(`User with ID ${userId} not found`);
    }
    
    // Log the admin action
    await this.logAdminActivity({
      adminId,
      action: "reactivate_user",
      entityId: userId,
      entityType: "user",
      details: { reason: "Admin reactivation" }
    });
    
    return this.updateUser(userId, { isActive: true });
  }
  
  // ========== ADMIN MOVIE MANAGEMENT ==========
  
  async createMovieUpload(movieUpload: InsertMovieUpload): Promise<MovieUpload> {
    const id = this.currentMovieUploadId++;
    
    const upload: MovieUpload = {
      ...movieUpload,
      id,
      status: movieUpload.status || "draft",
      uploadedAt: new Date(),
      publishedAt: movieUpload.publishedAt || null,
      approvedBy: movieUpload.approvedBy || null,
      reviewNotes: movieUpload.reviewNotes || null
    };
    
    this.movieUploads.set(id, upload);
    return upload;
  }
  
  async getMovieUpload(id: number): Promise<MovieUpload | undefined> {
    return this.movieUploads.get(id);
  }
  
  async getPendingMovieUploads(): Promise<MovieUpload[]> {
    return Array.from(this.movieUploads.values())
      .filter(upload => upload.status === "pending_review");
  }
  
  async updateMovieUploadStatus(
    id: number, 
    status: string, 
    adminId: number, 
    notes?: string
  ): Promise<MovieUpload> {
    const upload = this.movieUploads.get(id);
    
    if (!upload) {
      throw new Error(`Movie upload with ID ${id} not found`);
    }
    
    const updatedUpload: MovieUpload = {
      ...upload,
      status: status as "draft" | "published" | "pending_review" | "rejected",
      approvedBy: status === "published" ? adminId : upload.approvedBy,
      publishedAt: status === "published" ? new Date() : upload.publishedAt,
      reviewNotes: notes || upload.reviewNotes
    };
    
    this.movieUploads.set(id, updatedUpload);
    
    // Log the admin action
    await this.logAdminActivity({
      adminId,
      action: "update_movie_status",
      entityId: id,
      entityType: "movie_upload",
      details: { 
        oldStatus: upload.status, 
        newStatus: status,
        movieId: upload.movieId
      }
    });
    
    return updatedUpload;
  }
  
  async getMoviesByUploader(uploaderId: number): Promise<Movie[]> {
    const uploaderMovieIds = Array.from(this.movieUploads.values())
      .filter(upload => upload.uploadedBy === uploaderId)
      .map(upload => upload.movieId);
    
    return Array.from(this.movies.values())
      .filter(movie => uploaderMovieIds.includes(movie.id));
  }
  
  // ========== FINANCIAL MANAGEMENT ==========
  
  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentTransactionId++;
    
    const newTransaction: Transaction = {
      ...transaction,
      id,
      status: transaction.status || "pending",
      createdAt: transaction.createdAt || new Date(),
      processedAt: transaction.processedAt || null,
      processedBy: transaction.processedBy || null,
      description: transaction.description || null,
      txHash: transaction.txHash || null
    };
    
    this.transactions.set(id, newTransaction);
    return newTransaction;
  }
  
  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }
  
  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  
  async getAllTransactions(limit?: number, offset?: number): Promise<Transaction[]> {
    let transactions = Array.from(this.transactions.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (offset) {
      transactions = transactions.slice(offset);
    }
    
    if (limit) {
      transactions = transactions.slice(0, limit);
    }
    
    return transactions;
  }
  
  async getPendingTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .filter(tx => tx.status === "pending")
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  
  async processTransaction(
    id: number, 
    status: string, 
    adminId: number
  ): Promise<Transaction> {
    const transaction = this.transactions.get(id);
    
    if (!transaction) {
      throw new Error(`Transaction with ID ${id} not found`);
    }
    
    const updatedTransaction: Transaction = {
      ...transaction,
      status: status as "pending" | "completed" | "failed" | "refunded",
      processedAt: new Date(),
      processedBy: adminId
    };
    
    this.transactions.set(id, updatedTransaction);
    
    // If the transaction is completed and it's a deposit or subscription
    // Update the user's wallet balance
    if (status === "completed" && 
        (transaction.type === "deposit" || transaction.type === "subscription")) {
      const user = await this.getUser(transaction.userId);
      if (user) {
        await this.updateUser(user.id, { 
          walletBalance: user.walletBalance + transaction.amount 
        });
        
        // If it's a subscription, also update the premium status
        if (transaction.type === "subscription") {
          const premiumExpiresAt = new Date();
          premiumExpiresAt.setMonth(premiumExpiresAt.getMonth() + 1); // 1 month subscription
          
          await this.updateUser(user.id, {
            userType: "premium",
            premiumExpiresAt
          });
        }
      }
    }
    
    // Log the admin action
    await this.logAdminActivity({
      adminId,
      action: "process_transaction",
      entityId: id,
      entityType: "transaction",
      details: { 
        oldStatus: transaction.status, 
        newStatus: status,
        amount: transaction.amount,
        userId: transaction.userId
      }
    });
    
    return updatedTransaction;
  }
  
  async getIncomeStatistics(
    startDate?: Date, 
    endDate?: Date
  ): Promise<{
    totalIncome: number;
    subscriptions: number;
    deposits: number;
    refunds: number;
  }> {
    const completedTransactions = Array.from(this.transactions.values())
      .filter(tx => tx.status === "completed")
      .filter(tx => {
        if (!startDate && !endDate) return true;
        
        const txDate = tx.processedAt || tx.createdAt;
        
        if (startDate && endDate) {
          return txDate >= startDate && txDate <= endDate;
        }
        
        if (startDate) {
          return txDate >= startDate;
        }
        
        if (endDate) {
          return txDate <= endDate;
        }
        
        return true;
      });
    
    const refunds = Array.from(this.transactions.values())
      .filter(tx => tx.status === "refunded")
      .filter(tx => {
        if (!startDate && !endDate) return true;
        
        const txDate = tx.processedAt || tx.createdAt;
        
        if (startDate && endDate) {
          return txDate >= startDate && txDate <= endDate;
        }
        
        if (startDate) {
          return txDate >= startDate;
        }
        
        if (endDate) {
          return txDate <= endDate;
        }
        
        return true;
      });
    
    const subscriptions = completedTransactions
      .filter(tx => tx.type === "subscription")
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const deposits = completedTransactions
      .filter(tx => tx.type === "deposit")
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const refundAmount = refunds
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    return {
      totalIncome: subscriptions + deposits - refundAmount,
      subscriptions,
      deposits,
      refunds: refundAmount
    };
  }
  
  // ========== ADMIN ACTIVITY LOGGING ==========
  
  async logAdminActivity(log: InsertAdminLog): Promise<AdminLog> {
    const id = this.currentAdminLogId++;
    
    const adminLog: AdminLog = {
      ...log,
      id,
      createdAt: log.createdAt || new Date(),
      details: log.details || {},
      entityId: log.entityId || null,
      entityType: log.entityType || null,
      ipAddress: log.ipAddress || null
    };
    
    this.adminLogs.set(id, adminLog);
    return adminLog;
  }
  
  async getAdminLogs(
    adminId?: number, 
    limit?: number, 
    offset?: number
  ): Promise<AdminLog[]> {
    let logs = Array.from(this.adminLogs.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (adminId) {
      logs = logs.filter(log => log.adminId === adminId);
    }
    
    if (offset) {
      logs = logs.slice(offset);
    }
    
    if (limit) {
      logs = logs.slice(0, limit);
    }
    
    return logs;
  }
  
  // Helper function to create an admin user
  private initializeAdminUser() {
    // Create an admin user if none exists
    const existingAdmin = Array.from(this.users.values())
      .find(user => user.role === "admin");
    
    if (!existingAdmin) {
      this.createUser({
        username: "admin",
        password: "admin", // In a real app, this should be hashed
        email: "admin@filmflex.com",
        role: "admin",
        userType: "premium",
        isActive: true
      });
    }
  }
  
  private initializeMovies() {
    const sampleMovies: Omit<Movie, 'id'>[] = [
      {
        title: "The Dark Knight",
        description: "When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests of his ability to fight injustice.",
        releaseYear: 2008,
        duration: 152,
        posterUrl: "https://images.unsplash.com/photo-1497514440240-3b870f7341f0",
        backdropUrl: "https://images.unsplash.com/photo-1497514440240-3b870f7341f0",
        rating: "PG-13",
        matchPercentage: 98,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 7], // Action, Thriller
        director: "Christopher Nolan",
        cast: ["Christian Bale", "Heath Ledger", "Aaron Eckhart"],
        imdbRating: "9.0",
        viewCount: 1245
      },
      {
        title: "Inception",
        description: "A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea into the mind of a C.E.O.",
        releaseYear: 2010,
        duration: 148,
        posterUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
        backdropUrl: "https://images.unsplash.com/photo-1536440136628-849c177e76a1",
        rating: "PG-13",
        matchPercentage: 97,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6, 7], // Action, Sci-Fi, Thriller
        director: "Christopher Nolan",
        cast: ["Leonardo DiCaprio", "Joseph Gordon-Levitt", "Elliot Page"],
        imdbRating: "8.8",
        viewCount: 1052
      },
      {
        title: "Interstellar",
        description: "A team of explorers travel through a wormhole in space in an attempt to ensure humanity's survival.",
        releaseYear: 2014,
        duration: 169,
        posterUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26",
        backdropUrl: "https://images.unsplash.com/photo-1478720568477-152d9b164e26",
        rating: "PG-13",
        matchPercentage: 94,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [2, 6], // Adventure, Sci-Fi
        director: "Christopher Nolan",
        cast: ["Matthew McConaughey", "Anne Hathaway", "Jessica Chastain"],
        imdbRating: "8.6",
        viewCount: 950
      },
      {
        title: "The Matrix",
        description: "A computer hacker learns from mysterious rebels about the true nature of his reality and his role in the war against its controllers.",
        releaseYear: 1999,
        duration: 136,
        posterUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf",
        backdropUrl: "https://images.unsplash.com/photo-1594909122845-11baa439b7bf",
        rating: "R",
        matchPercentage: 92,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6], // Action, Sci-Fi
        director: "Lana Wachowski, Lilly Wachowski",
        cast: ["Keanu Reeves", "Laurence Fishburne", "Carrie-Anne Moss"],
        imdbRating: "8.7",
        viewCount: 1275
      },
      {
        title: "Blade Runner 2049",
        description: "Young Blade Runner K's discovery of a long-buried secret leads him to track down former Blade Runner Rick Deckard, who's been missing for thirty years.",
        releaseYear: 2017,
        duration: 164,
        posterUrl: "https://images.unsplash.com/photo-1611523658822-385aa008324c",
        backdropUrl: "https://images.unsplash.com/photo-1611523658822-385aa008324c",
        rating: "R",
        matchPercentage: 89,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6], // Action, Sci-Fi
        director: "Denis Villeneuve",
        cast: ["Ryan Gosling", "Harrison Ford", "Ana de Armas"],
        imdbRating: "8.0",
        viewCount: 850
      },
      {
        title: "Dune",
        description: "Feature adaptation of Frank Herbert's science fiction novel, about the son of a noble family entrusted with the protection of the most valuable asset and most vital element in the galaxy.",
        releaseYear: 2021,
        duration: 155,
        posterUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0",
        backdropUrl: "https://images.unsplash.com/photo-1626814026160-2237a95fc5a0",
        rating: "PG-13",
        matchPercentage: 91,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [2, 6], // Adventure, Sci-Fi
        director: "Denis Villeneuve",
        cast: ["Timothée Chalamet", "Rebecca Ferguson", "Zendaya"],
        imdbRating: "8.0",
        viewCount: 780
      },
      {
        title: "Tenet",
        description: "Armed with only one word, Tenet, and fighting for the survival of the entire world, a Protagonist journeys through a twilight world of international espionage on a mission that will unfold in something beyond real time.",
        releaseYear: 2020,
        duration: 150,
        posterUrl: "https://images.unsplash.com/photo-1507207611509-ec012433ff52",
        backdropUrl: "https://images.unsplash.com/photo-1507207611509-ec012433ff52",
        rating: "PG-13",
        matchPercentage: 88,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 6, 7], // Action, Sci-Fi, Thriller
        director: "Christopher Nolan",
        cast: ["John David Washington", "Robert Pattinson", "Elizabeth Debicki"],
        imdbRating: "7.4",
        viewCount: 720
      },
      {
        title: "The Tomorrow War",
        description: "A family man is drafted to fight in a future war where the fate of humanity relies on his ability to confront the past.",
        releaseYear: 2021,
        duration: 138,
        posterUrl: "https://images.unsplash.com/photo-1529641484336-ef35148bab06",
        backdropUrl: "https://images.unsplash.com/photo-1529641484336-ef35148bab06",
        rating: "PG-13",
        matchPercentage: 82,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 2, 6], // Action, Adventure, Sci-Fi
        director: "Chris McKay",
        cast: ["Chris Pratt", "Yvonne Strahovski", "J.K. Simmons"],
        imdbRating: "6.6",
        viewCount: 680
      },
      {
        title: "No Time to Die",
        description: "James Bond has left active service. His peace is short-lived when Felix Leiter, an old friend from the CIA, turns up asking for help.",
        releaseYear: 2021,
        duration: 163,
        posterUrl: "https://images.unsplash.com/photo-1512070679279-8988d32161be",
        backdropUrl: "https://images.unsplash.com/photo-1512070679279-8988d32161be",
        rating: "PG-13",
        matchPercentage: 87,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 2, 7], // Action, Adventure, Thriller
        director: "Cary Joji Fukunaga",
        cast: ["Daniel Craig", "Ana de Armas", "Rami Malek"],
        imdbRating: "7.3",
        viewCount: 820
      },
      {
        title: "Free Guy",
        description: "A bank teller discovers that he's actually an NPC inside a brutal, open world video game.",
        releaseYear: 2021,
        duration: 115,
        posterUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
        backdropUrl: "https://images.unsplash.com/photo-1517604931442-7e0c8ed2963c",
        rating: "PG-13",
        matchPercentage: 90,
        videoSources: [
          { quality: "1080p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" },
          { quality: "720p", url: "https://demo.unified-streaming.com/k8s/features/stable/video/tears-of-steel/tears-of-steel.ism/.m3u8" }
        ],
        genreIds: [1, 2, 3], // Action, Adventure, Comedy
        director: "Shawn Levy",
        cast: ["Ryan Reynolds", "Jodie Comer", "Taika Waititi"],
        imdbRating: "7.1",
        viewCount: 915
      }
    ];
    
    sampleMovies.forEach(movie => {
      const id = this.currentMovieId++;
      // Ensure viewCount exists for all movies, default to a random number between 100-2000 if not provided
      const viewCount = movie.viewCount || Math.floor(Math.random() * 1900) + 100;
      this.movies.set(id, { ...movie, id, viewCount });
    });
  }
}

export const storage = new MemStorage();
