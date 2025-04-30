import { 
  users, movies, genres, favorites, viewHistory, transactions, adminLogs, movieUploads,
  apiMovies, apiMovieJobLogs,
  type User, type InsertUser, type Movie, type InsertMovie, type Genre, type InsertGenre,
  type Favorite, type InsertFavorite, type ViewHistory, type InsertViewHistory,
  type Transaction, type InsertTransaction, type AdminLog, type InsertAdminLog,
  type MovieUpload, type InsertMovieUpload, type ApiMovie, type InsertApiMovie,
  type ApiMovieJobLog, type InsertApiMovieJobLog
} from "@shared/schema";
import {
  categories, movieCategories,
  type Category, type InsertCategory, type MovieCategory, type InsertMovieCategory
} from "@shared/schema-categories";
import { db } from "./db";
import { eq, and, desc, asc, or, like, gte, lte, isNull, isNotNull, inArray, count } from "drizzle-orm";
import connectPg from "connect-pg-simple";
import session from "express-session";
import { pool } from "./db";

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
  
  // Category methods
  getAllCategories(): Promise<Category[]>;
  getCategory(id: number): Promise<Category | undefined>;
  getCategoryBySlug(slug: string): Promise<Category | undefined>;
  createCategory(category: InsertCategory): Promise<Category>;
  updateCategory(id: number, updates: Partial<Omit<Category, 'id' | 'slug'>>): Promise<Category>;
  getMoviesByCategory(categoryId: number, limit?: number, offset?: number): Promise<ApiMovie[]>;
  countMoviesByCategory(categoryId: number): Promise<number>;
  createMovieCategory(movieCategory: InsertMovieCategory): Promise<MovieCategory>;
  removeAllMovieCategories(movieId: number): Promise<void>;
  getMovieCategories(movieId: number): Promise<Category[]>;
  
  // Session store for authentication
  sessionStore: session.SessionStore;
  
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
  
  // PhimAPI Movie Integration
  getApiMovieBySlug(slug: string): Promise<ApiMovie | undefined>;
  createApiMovie(movie: InsertApiMovie): Promise<ApiMovie>;
  updateApiMovie(id: number, updates: Partial<Omit<ApiMovie, 'id'>>): Promise<ApiMovie>;
  getApiMovies(limit?: number, offset?: number, status?: string, id?: number): Promise<ApiMovie[]>;
  getApiMoviesSlugs(): Promise<string[]>;
  countApiMovies(status?: string): Promise<number>;
  
  // API Job Logging
  createApiMovieJobLog(log: InsertApiMovieJobLog): Promise<ApiMovieJobLog>;
  updateApiMovieJobLog(id: number, updates: Partial<Omit<ApiMovieJobLog, 'id'>>): Promise<ApiMovieJobLog>;
  getLatestApiMovieJobLog(jobType?: string): Promise<ApiMovieJobLog | undefined>;
  getApiMovieJobLogs(limit?: number, offset?: number): Promise<ApiMovieJobLog[]>;
}

// Set up Postgres store for session
const PostgresSessionStore = connectPg(session);

export class DatabaseStorage implements IStorage {
  sessionStore: session.SessionStore;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool,
      createTableIfMissing: true 
    });
  }

  // ========== USER METHODS ==========

  async getUser(id: number): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.username, username));
    return result[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const result = await db.insert(users).values(insertUser).returning();
    return result[0];
  }

  async updateUser(
    id: number, 
    updates: Partial<Omit<User, 'id' | 'username' | 'password'>>
  ): Promise<User> {
    const result = await db
      .update(users)
      .set(updates)
      .where(eq(users.id, id))
      .returning();
    return result[0];
  }

  // ========== GENRE METHODS ==========

  async getAllGenres(): Promise<Genre[]> {
    return db.select().from(genres);
  }

  async getGenre(id: number): Promise<Genre | undefined> {
    const result = await db.select().from(genres).where(eq(genres.id, id));
    return result[0];
  }

  async createGenre(insertGenre: InsertGenre): Promise<Genre> {
    const result = await db.insert(genres).values(insertGenre).returning();
    return result[0];
  }

  // ========== MOVIE METHODS ==========

  async getAllMovies(): Promise<Movie[]> {
    return db.select().from(movies);
  }

  async getMovie(id: number): Promise<Movie | undefined> {
    const result = await db.select().from(movies).where(eq(movies.id, id));
    return result[0];
  }

  async getMoviesByGenre(genreId: number): Promise<Movie[]> {
    return db
      .select()
      .from(movies)
      .where(
        // Using the array contains operator to match genre IDs
        // This is a simplified approach - in a real app we'd use a junction table
        eq(movies.genreIds, [genreId])
      );
  }

  async searchMovies(query: string): Promise<Movie[]> {
    return db
      .select()
      .from(movies)
      .where(
        or(
          like(movies.title, `%${query}%`),
          like(movies.description, `%${query}%`)
        )
      );
  }

  async getFeaturedMovies(): Promise<Movie[]> {
    // Return the first 5 movies ordered by match percentage
    return db
      .select()
      .from(movies)
      .orderBy(desc(movies.matchPercentage))
      .limit(5);
  }

  async getNewReleases(): Promise<Movie[]> {
    // Return the first 5 movies ordered by release year
    return db
      .select()
      .from(movies)
      .orderBy(desc(movies.releaseYear))
      .limit(5);
  }

  async getTrendingMovies(): Promise<Movie[]> {
    // Return the first 5 movies ordered by view count
    return db
      .select()
      .from(movies)
      .orderBy(desc(movies.viewCount))
      .limit(5);
  }

  async createMovie(insertMovie: InsertMovie): Promise<Movie> {
    const result = await db.insert(movies).values(insertMovie).returning();
    return result[0];
  }

  async updateMovie(id: number, updates: Partial<Omit<Movie, 'id'>>): Promise<Movie> {
    const result = await db
      .update(movies)
      .set(updates)
      .where(eq(movies.id, id))
      .returning();
    return result[0];
  }

  async deleteMovie(id: number): Promise<void> {
    await db.delete(movies).where(eq(movies.id, id));
  }

  // ========== FAVORITES METHODS ==========

  async getUserFavorites(userId: number): Promise<Movie[]> {
    // Get the user's favorites
    const userFavorites = await db
      .select()
      .from(favorites)
      .where(eq(favorites.userId, userId));
    
    // Get the movies
    const favoriteMovies = await Promise.all(
      userFavorites.map(fav => this.getMovie(fav.movieId))
    );
    
    // Filter out undefined movies
    return favoriteMovies.filter(Boolean) as Movie[];
  }

  async addFavorite(insertFavorite: InsertFavorite): Promise<Favorite> {
    const result = await db
      .insert(favorites)
      .values(insertFavorite)
      .returning();
    return result[0];
  }

  async removeFavorite(userId: number, movieId: number): Promise<void> {
    await db
      .delete(favorites)
      .where(
        and(
          eq(favorites.userId, userId),
          eq(favorites.movieId, movieId)
        )
      );
  }

  // ========== VIEW HISTORY METHODS ==========

  async getUserViewHistory(userId: number): Promise<ViewHistory[]> {
    return db
      .select()
      .from(viewHistory)
      .where(eq(viewHistory.userId, userId))
      .orderBy(desc(viewHistory.watchedAt));
  }

  async addOrUpdateViewHistory(insertHistory: InsertViewHistory): Promise<ViewHistory> {
    // Check if there's an existing history entry
    const existing = await db
      .select()
      .from(viewHistory)
      .where(
        and(
          eq(viewHistory.userId, insertHistory.userId),
          eq(viewHistory.movieId, insertHistory.movieId)
        )
      );
    
    if (existing.length > 0) {
      // Update existing entry
      const result = await db
        .update(viewHistory)
        .set({
          progress: insertHistory.progress,
          watchedAt: new Date()
        })
        .where(eq(viewHistory.id, existing[0].id))
        .returning();
      return result[0];
    } else {
      // Create new entry
      const result = await db
        .insert(viewHistory)
        .values(insertHistory)
        .returning();
      return result[0];
    }
  }
  
  // ========== CATEGORY METHODS ==========
  
  async getAllCategories(): Promise<Category[]> {
    return db.select().from(categories);
  }
  
  async getCategory(id: number): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.id, id));
    return result[0];
  }
  
  async getCategoryBySlug(slug: string): Promise<Category | undefined> {
    const result = await db.select().from(categories).where(eq(categories.slug, slug));
    return result[0];
  }
  
  async createCategory(insertCategory: InsertCategory): Promise<Category> {
    const result = await db.insert(categories).values(insertCategory).returning();
    return result[0];
  }
  
  async updateCategory(
    id: number, 
    updates: Partial<Omit<Category, 'id' | 'slug'>>
  ): Promise<Category> {
    const result = await db
      .update(categories)
      .set(updates)
      .where(eq(categories.id, id))
      .returning();
    return result[0];
  }
  
  async getMoviesByCategory(
    categoryId: number, 
    limit: number = 20, 
    offset: number = 0
  ): Promise<ApiMovie[]> {
    // First get the movie IDs that belong to this category
    const movieCategoryLinks = await db
      .select()
      .from(movieCategories)
      .where(eq(movieCategories.categoryId, categoryId));
    
    if (movieCategoryLinks.length === 0) {
      return [];
    }
    
    // Separate movie IDs by type
    const apiMovieLinks = movieCategoryLinks.filter(link => link.movieType === 'api');
    const regularMovieLinks = movieCategoryLinks.filter(link => link.movieType === 'regular');
    
    const apiMovieIds = apiMovieLinks.map(link => link.movieId);
    const regularMovieIds = regularMovieLinks.map(link => link.movieId);
    
    let result: ApiMovie[] = [];
    
    // If we have API movies, fetch them
    if (apiMovieIds.length > 0) {
      const apiMoviesResult = await db
        .select()
        .from(apiMovies)
        .where(
          and(
            inArray(apiMovies.id, apiMovieIds),
            eq(apiMovies.status, "published")
          )
        )
        .orderBy(desc(apiMovies.id))
        .limit(limit)
        .offset(offset);
      
      result = [...apiMoviesResult];
    }
    
    // If we have regular movies, fetch and transform them to match ApiMovie structure
    if (regularMovieIds.length > 0) {
      const regularMoviesResult = await db
        .select()
        .from(movies)
        .where(inArray(movies.id, regularMovieIds))
        .orderBy(desc(movies.id))
        .limit(limit - result.length) // Adjust limit based on how many API movies we already have
        .offset(result.length === 0 ? offset : 0); // Only apply offset if we haven't fetched any API movies yet
      
      // Transform regular movies to match ApiMovie structure for consistent frontend handling
      const transformedRegularMovies: ApiMovie[] = regularMoviesResult.map(movie => ({
        id: movie.id,
        slug: `regular-movie-${movie.id}`, // Generate a slug
        title: movie.title,
        originalTitle: movie.title,
        description: movie.description,
        posterUrl: movie.posterUrl,
        backdropUrl: movie.backdropUrl,
        releaseYear: movie.releaseYear,
        quality: null,
        language: null,
        categories: [],
        countries: [],
        type: "movie",
        views: movie.viewCount || 0,
        duration: movie.duration ? movie.duration.toString() : null,
        currentEpisode: null,
        totalEpisodes: null,
        trailerUrl: "",
        actors: movie.cast || [],
        directors: movie.director ? [movie.director] : [],
        episodes: [],
        embedUrl: null,
        status: "published",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastCheckedAt: new Date(),
      }));
      
      // Combine the results (API movies first, then regular movies)
      result = [...result, ...transformedRegularMovies];
    }
    
    return result;
  }
  
  async countMoviesByCategory(categoryId: number): Promise<number> {
    // First get the movie-category links
    const movieCategoryLinks = await db
      .select()
      .from(movieCategories)
      .where(eq(movieCategories.categoryId, categoryId));
    
    if (movieCategoryLinks.length === 0) {
      return 0;
    }
    
    // Separate movie IDs by type
    const apiMovieLinks = movieCategoryLinks.filter(link => link.movieType === 'api');
    const regularMovieLinks = movieCategoryLinks.filter(link => link.movieType === 'regular');
    
    const apiMovieIds = apiMovieLinks.map(link => link.movieId);
    const regularMovieIds = regularMovieLinks.map(link => link.movieId);
    
    let totalCount = 0;
    
    // Count API movies
    if (apiMovieIds.length > 0) {
      const apiMoviesCountResult = await db
        .select({ count: count() })
        .from(apiMovies)
        .where(
          and(
            inArray(apiMovies.id, apiMovieIds),
            eq(apiMovies.status, "published")
          )
        );
      
      totalCount += apiMoviesCountResult[0]?.count || 0;
    }
    
    // Count regular movies
    if (regularMovieIds.length > 0) {
      const regularMoviesCountResult = await db
        .select({ count: count() })
        .from(movies)
        .where(inArray(movies.id, regularMovieIds));
      
      totalCount += regularMoviesCountResult[0]?.count || 0;
    }
    
    return totalCount;
  }
  
  async createMovieCategory(insertMovieCategory: InsertMovieCategory): Promise<MovieCategory> {
    // Check if it already exists to avoid duplicates
    const existing = await db
      .select()
      .from(movieCategories)
      .where(
        and(
          eq(movieCategories.movieId, insertMovieCategory.movieId),
          eq(movieCategories.categoryId, insertMovieCategory.categoryId)
        )
      );
    
    if (existing.length > 0) {
      return existing[0];
    }
    
    // Create new link
    const result = await db
      .insert(movieCategories)
      .values(insertMovieCategory)
      .returning();
    return result[0];
  }
  
  async removeAllMovieCategories(movieId: number): Promise<void> {
    await db
      .delete(movieCategories)
      .where(eq(movieCategories.movieId, movieId));
  }
  
  async getMovieCategories(movieId: number): Promise<Category[]> {
    // First get the category IDs for this movie
    const movieCategoryLinks = await db
      .select()
      .from(movieCategories)
      .where(eq(movieCategories.movieId, movieId));
    
    const categoryIds = movieCategoryLinks.map(link => link.categoryId);
    
    if (categoryIds.length === 0) {
      return [];
    }
    
    // Then get the actual categories
    const result = await db
      .select()
      .from(categories)
      .where(inArray(categories.id, categoryIds));
    
    return result;
  }

  // ========== ADMIN USER MANAGEMENT ==========

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users);
  }

  async getUsersByRole(role: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.role, role));
  }

  async createAdminUser(user: InsertUser): Promise<User> {
    return this.createUser({
      ...user,
      role: "admin"
    });
  }

  async updateUserRole(userId: number, role: string, adminId: number): Promise<User> {
    // Log the action
    await this.logAdminActivity({
      adminId,
      action: "user_role_update",
      entityId: userId,
      entityType: "user",
      details: { role }
    });
    
    // Update the user
    return this.updateUser(userId, { role });
  }

  async deactivateUser(userId: number, adminId: number): Promise<User> {
    // Log the action
    await this.logAdminActivity({
      adminId,
      action: "user_deactivate",
      entityId: userId,
      entityType: "user"
    });
    
    // Update the user
    return this.updateUser(userId, { isActive: false });
  }

  async reactivateUser(userId: number, adminId: number): Promise<User> {
    // Log the action
    await this.logAdminActivity({
      adminId,
      action: "user_reactivate",
      entityId: userId,
      entityType: "user"
    });
    
    // Update the user
    return this.updateUser(userId, { isActive: true });
  }

  // ========== ADMIN MOVIE MANAGEMENT ==========

  async createMovieUpload(movieUpload: InsertMovieUpload): Promise<MovieUpload> {
    const result = await db
      .insert(movieUploads)
      .values(movieUpload)
      .returning();
    return result[0];
  }

  async getMovieUpload(id: number): Promise<MovieUpload | undefined> {
    const result = await db
      .select()
      .from(movieUploads)
      .where(eq(movieUploads.id, id));
    return result[0];
  }

  async getPendingMovieUploads(): Promise<MovieUpload[]> {
    return db
      .select()
      .from(movieUploads)
      .orderBy(desc(movieUploads.uploadedAt));
  }

  async updateMovieUploadStatus(
    id: number,
    status: string,
    adminId: number,
    notes?: string
  ): Promise<MovieUpload> {
    // Log the action
    await this.logAdminActivity({
      adminId,
      action: "movie_upload_status_update",
      entityId: id,
      entityType: "movie_upload",
      details: { status, notes }
    });
    
    // Update the upload
    const updates: Partial<MovieUpload> = {
      status: status as any,
      approvedBy: adminId,
      reviewNotes: notes
    };
    
    // If it's being published, set the published date
    if (status === "published") {
      updates.publishedAt = new Date();
    }
    
    const result = await db
      .update(movieUploads)
      .set(updates)
      .where(eq(movieUploads.id, id))
      .returning();
    return result[0];
  }

  async getMoviesByUploader(uploaderId: number): Promise<Movie[]> {
    // Get the movie uploads by this uploader
    const uploads = await db
      .select()
      .from(movieUploads)
      .where(eq(movieUploads.uploadedBy, uploaderId));
    
    // Get the movies
    const uploaderMovies = await Promise.all(
      uploads.map(upload => this.getMovie(upload.movieId))
    );
    
    // Filter out undefined movies
    return uploaderMovies.filter(Boolean) as Movie[];
  }

  // ========== FINANCIAL MANAGEMENT ==========

  async createTransaction(transaction: InsertTransaction): Promise<Transaction> {
    const result = await db
      .insert(transactions)
      .values({
        ...transaction,
        createdAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    const result = await db
      .select()
      .from(transactions)
      .where(eq(transactions.id, id));
    return result[0];
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.createdAt));
  }

  async getAllTransactions(limit?: number, offset?: number): Promise<Transaction[]> {
    let query = db
      .select()
      .from(transactions)
      .orderBy(desc(transactions.createdAt));
    
    if (offset) {
      query = query.offset(offset);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return query;
  }

  async getPendingTransactions(): Promise<Transaction[]> {
    return db
      .select()
      .from(transactions)
      .where(eq(transactions.status, "pending"))
      .orderBy(desc(transactions.createdAt));
  }

  async processTransaction(
    id: number,
    status: string,
    adminId: number
  ): Promise<Transaction> {
    // Log the action
    await this.logAdminActivity({
      adminId,
      action: "transaction_process",
      entityId: id,
      entityType: "transaction",
      details: { status }
    });
    
    // Update the transaction
    const result = await db
      .update(transactions)
      .set({
        status: status as any,
        processedAt: new Date(),
        processedBy: adminId
      })
      .where(eq(transactions.id, id))
      .returning();
    return result[0];
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
    // Get all transactions
    let query = db
      .select()
      .from(transactions)
      .where(eq(transactions.status, "completed"));
    
    // Add date filters if provided
    if (startDate) {
      query = query.where(gte(transactions.createdAt, startDate));
    }
    
    if (endDate) {
      query = query.where(lte(transactions.createdAt, endDate));
    }
    
    const allTransactions = await query;
    
    // Get refunds
    let refundsQuery = db
      .select()
      .from(transactions)
      .where(eq(transactions.status, "refunded"));
    
    // Add date filters if provided
    if (startDate) {
      refundsQuery = refundsQuery.where(gte(transactions.createdAt, startDate));
    }
    
    if (endDate) {
      refundsQuery = refundsQuery.where(lte(transactions.createdAt, endDate));
    }
    
    const refunds = await refundsQuery;
    
    // Calculate statistics
    const subscriptions = allTransactions
      .filter(tx => tx.type === "subscription")
      .reduce((sum, tx) => sum + tx.amount, 0);
    
    const deposits = allTransactions
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
    const result = await db
      .insert(adminLogs)
      .values({
        ...log,
        createdAt: new Date(),
      })
      .returning();
    return result[0];
  }

  async getAdminLogs(
    adminId?: number, 
    limit?: number, 
    offset?: number
  ): Promise<AdminLog[]> {
    let query = db
      .select()
      .from(adminLogs)
      .orderBy(desc(adminLogs.createdAt));
    
    if (adminId) {
      query = query.where(eq(adminLogs.adminId, adminId));
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return query;
  }

  // ========== PHIMAPI MOVIE INTEGRATION ==========

  async getApiMovieBySlug(slug: string): Promise<ApiMovie | undefined> {
    const results = await db
      .select()
      .from(apiMovies)
      .where(eq(apiMovies.slug, slug));
    return results[0];
  }

  async createApiMovie(movie: InsertApiMovie): Promise<ApiMovie> {
    const result = await db
      .insert(apiMovies)
      .values(movie)
      .returning();
    return result[0];
  }

  async updateApiMovie(id: number, updates: Partial<Omit<ApiMovie, 'id'>>): Promise<ApiMovie> {
    const result = await db
      .update(apiMovies)
      .set({
        ...updates,
        updatedAt: new Date()
      })
      .where(eq(apiMovies.id, id))
      .returning();
    return result[0];
  }

  async getApiMovies(limit?: number, offset?: number, status?: string, id?: number): Promise<ApiMovie[]> {
    let query = db
      .select()
      .from(apiMovies)
      .orderBy(desc(apiMovies.updatedAt));
    
    if (status) {
      query = query.where(eq(apiMovies.status, status));
    }
    
    if (id !== undefined) {
      query = query.where(eq(apiMovies.id, id));
    }
    
    if (offset) {
      query = query.offset(offset);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return query;
  }

  async getApiMoviesSlugs(): Promise<string[]> {
    const results = await db
      .select({ slug: apiMovies.slug })
      .from(apiMovies);
    
    return results.map(item => item.slug);
  }

  async deleteApiMovie(id: number): Promise<boolean> {
    try {
      await db.delete(apiMovies).where(eq(apiMovies.id, id));
      return true;
    } catch (error) {
      console.error('Error deleting API movie:', error);
      return false;
    }
  }
  
  async countApiMovies(status?: string): Promise<number> {
    try {
      // Import sql function from drizzle-orm
      const { sql } = await import('drizzle-orm');
      
      let query = db
        .select({ count: sql`count(*)` })
        .from(apiMovies);
      
      if (status) {
        query = query.where(eq(apiMovies.status, status));
      }
      
      const result = await query;
      return Number(result[0].count);
    } catch (error) {
      console.error('Error counting API movies:', error);
      return 0;
    }
  }

  // ========== API JOB LOGGING ==========

  async createApiMovieJobLog(log: InsertApiMovieJobLog): Promise<ApiMovieJobLog> {
    const result = await db
      .insert(apiMovieJobLogs)
      .values(log)
      .returning();
    return result[0];
  }

  async updateApiMovieJobLog(id: number, updates: Partial<Omit<ApiMovieJobLog, 'id'>>): Promise<ApiMovieJobLog> {
    const result = await db
      .update(apiMovieJobLogs)
      .set(updates)
      .where(eq(apiMovieJobLogs.id, id))
      .returning();
    return result[0];
  }

  async getLatestApiMovieJobLog(jobType?: string): Promise<ApiMovieJobLog | undefined> {
    let query = db
      .select()
      .from(apiMovieJobLogs)
      .orderBy(desc(apiMovieJobLogs.startedAt))
      .limit(1);
    
    if (jobType) {
      query = query.where(eq(apiMovieJobLogs.jobType, jobType));
    }
    
    const results = await query;
    return results[0];
  }

  async getApiMovieJobLogs(limit?: number, offset?: number): Promise<ApiMovieJobLog[]> {
    let query = db
      .select()
      .from(apiMovieJobLogs)
      .orderBy(desc(apiMovieJobLogs.startedAt));
    
    if (offset) {
      query = query.offset(offset);
    }
    
    if (limit) {
      query = query.limit(limit);
    }
    
    return query;
  }
}

// Initialize database and create the storage instance
export const storage = new DatabaseStorage();