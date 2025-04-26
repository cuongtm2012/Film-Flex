import { 
  users, movies, genres, favorites, viewHistory, transactions, adminLogs, movieUploads,
  type User, type InsertUser, type Movie, type InsertMovie, type Genre, type InsertGenre,
  type Favorite, type InsertFavorite, type ViewHistory, type InsertViewHistory,
  type Transaction, type InsertTransaction, type AdminLog, type InsertAdminLog,
  type MovieUpload, type InsertMovieUpload
} from "@shared/schema";
import { db } from "./db";
import { eq, and, desc, asc, or, like, gte, lte, isNull, isNotNull } from "drizzle-orm";
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
}

// Initialize database and create the storage instance
export const storage = new DatabaseStorage();