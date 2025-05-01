import { pgTable, text, serial, integer, boolean, timestamp, jsonb, date, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  userType: text("user_type").default("normal").notNull(), // normal or premium
  walletBalance: integer("wallet_balance").default(0).notNull(), // Balance in cents (for USDT)
  walletAddress: text("wallet_address"), // User's USDT wallet address
  premiumExpiresAt: timestamp("premium_expires_at"), // When premium subscription ends
  role: text("role", { enum: ["user", "admin", "sub-admin"] }).default("user").notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  lastLogin: timestamp("last_login"),
  createdBy: integer("created_by"), // ID of admin who created this user
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
  userType: true,
  walletBalance: true,
  walletAddress: true,
  premiumExpiresAt: true,
  role: true,
  isActive: true,
  createdBy: true,
}).partial({ 
  email: true,
  userType: true,
  walletBalance: true,
  walletAddress: true,
  premiumExpiresAt: true,
  role: true,
  isActive: true,
  createdBy: true,
});

// Genre model
export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  name: text("name").notNull().unique(),
});

export const insertGenreSchema = createInsertSchema(genres).pick({
  name: true,
});

// Movie model
export const movies = pgTable("movies", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  releaseYear: integer("release_year").notNull(),
  duration: integer("duration").notNull(), // in minutes
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url").notNull(),
  rating: text("rating").notNull(), // e.g., "PG-13", "R"
  matchPercentage: integer("match_percentage"), // e.g., 97
  videoSources: jsonb("video_sources").notNull(), // array of URLs or sources
  videoUrl: text("video_url"), // Google Drive file ID or direct URL
  genreIds: integer("genre_ids").array().notNull(),
  director: text("director"),
  cast: text("cast").array(),
  imdbRating: text("imdb_rating"),
  viewCount: integer("view_count").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertMovieSchema = createInsertSchema(movies).pick({
  title: true,
  description: true,
  releaseYear: true,
  duration: true,
  posterUrl: true,
  backdropUrl: true,
  rating: true,
  matchPercentage: true,
  videoSources: true,
  videoUrl: true,
  genreIds: true,
  director: true,
  cast: true,
  imdbRating: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
}).partial({
  videoUrl: true,
  matchPercentage: true,
  director: true,
  cast: true,
  imdbRating: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
});

// Favorites/watchlist model
export const favorites = pgTable("favorites", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieId: integer("movie_id").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertFavoriteSchema = createInsertSchema(favorites).pick({
  userId: true,
  movieId: true,
  createdAt: true,
}).partial({
  createdAt: true,
});

// View history model
export const viewHistory = pgTable("view_history", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  movieId: integer("movie_id").notNull(),
  watchedAt: timestamp("watched_at").defaultNow(),
  progress: integer("progress").default(0), // percentage watched
});

export const insertViewHistorySchema = createInsertSchema(viewHistory).pick({
  userId: true,
  movieId: true,
  progress: true,
  watchedAt: true,
}).partial({
  progress: true,
  watchedAt: true,
});

// Transaction model to track income
export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  amount: integer("amount").notNull(), // in cents for precision
  type: text("type", { enum: ["deposit", "subscription", "refund"] }).notNull(),
  status: text("status", { enum: ["pending", "completed", "failed", "refunded"] }).default("pending").notNull(),
  txHash: text("tx_hash"), // blockchain transaction hash
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
  processedBy: integer("processed_by"), // admin who processed the transaction
});

export const insertTransactionSchema = createInsertSchema(transactions).pick({
  userId: true,
  amount: true,
  type: true,
  status: true,
  txHash: true,
  description: true,
  createdAt: true,
  processedAt: true,
  processedBy: true,
}).partial({
  status: true,
  txHash: true,
  description: true,
  createdAt: true,
  processedAt: true,
  processedBy: true,
});

// Admin activity logs to track actions
export const adminLogs = pgTable("admin_logs", {
  id: serial("id").primaryKey(),
  adminId: integer("admin_id").notNull(),
  action: text("action").notNull(), // e.g., "created_user", "processed_transaction", "updated_movie"
  entityId: integer("entity_id"), // ID of the affected entity (user, movie, etc.)
  entityType: text("entity_type"), // e.g., "user", "movie", "transaction"
  details: jsonb("details"), // additional details about the action
  createdAt: timestamp("created_at").defaultNow().notNull(),
  ipAddress: text("ip_address"),
});

export const insertAdminLogSchema = createInsertSchema(adminLogs).pick({
  adminId: true,
  action: true,
  entityId: true,
  entityType: true,
  details: true,
  createdAt: true,
  ipAddress: true,
}).partial({
  entityId: true,
  entityType: true,
  details: true,
  createdAt: true,
  ipAddress: true,
});

// Movie uploads model to track who uploaded which movies
export const movieUploads = pgTable("movie_uploads", {
  id: serial("id").primaryKey(),
  movieId: integer("movie_id").notNull(),
  uploadedBy: integer("uploaded_by").notNull(), // admin or sub-admin ID
  status: text("status", { enum: ["draft", "published", "pending_review", "rejected"] }).default("draft").notNull(),
  approvedBy: integer("approved_by"), // admin who approved the upload
  reviewNotes: text("review_notes"), // notes from the admin review
  uploadedAt: timestamp("uploaded_at").defaultNow().notNull(),
  publishedAt: timestamp("published_at"),
});

export const insertMovieUploadSchema = createInsertSchema(movieUploads).pick({
  movieId: true,
  uploadedBy: true,
  status: true,
  approvedBy: true,
  reviewNotes: true,
  uploadedAt: true,
  publishedAt: true,
}).partial({
  status: true,
  approvedBy: true,
  reviewNotes: true,
  uploadedAt: true,
  publishedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Genre = typeof genres.$inferSelect;
export type InsertGenre = z.infer<typeof insertGenreSchema>;

export type Movie = typeof movies.$inferSelect;
export type InsertMovie = z.infer<typeof insertMovieSchema>;

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = z.infer<typeof insertFavoriteSchema>;

export type ViewHistory = typeof viewHistory.$inferSelect;
export type InsertViewHistory = z.infer<typeof insertViewHistorySchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type AdminLog = typeof adminLogs.$inferSelect;
export type InsertAdminLog = z.infer<typeof insertAdminLogSchema>;

export type MovieUpload = typeof movieUploads.$inferSelect;
export type InsertMovieUpload = z.infer<typeof insertMovieUploadSchema>;

// API Movies model (from phimapi.com)
export const apiMovies = pgTable("api_movies", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  title: text("title").notNull(),
  originalTitle: text("original_title"),
  description: text("description").notNull(),
  posterUrl: text("poster_url").notNull(),
  backdropUrl: text("backdrop_url"),
  releaseYear: integer("release_year"),
  quality: text("quality"),
  language: text("language"),
  categories: text("categories").array(),
  countries: text("countries").array(),
  type: text("type"),
  views: integer("views"),
  duration: text("duration"),
  currentEpisode: text("current_episode"),
  totalEpisodes: text("total_episodes"),
  trailerUrl: text("trailer_url"),
  actors: text("actors").array(),
  directors: text("directors").array(),
  episodes: jsonb("episodes").notNull(), // Store episodes as JSON
  embedUrl: text("embed_url"), // Direct embed URL for streaming
  status: text("status", { enum: ["draft", "pending_review", "published", "rejected"] }).default("draft").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  lastCheckedAt: timestamp("last_checked_at").defaultNow().notNull(),
});

export const insertApiMovieSchema = createInsertSchema(apiMovies).pick({
  slug: true,
  title: true,
  originalTitle: true,
  description: true,
  posterUrl: true,
  backdropUrl: true,
  releaseYear: true,
  quality: true,
  language: true,
  categories: true,
  countries: true,
  type: true,
  views: true,
  duration: true,
  currentEpisode: true,
  totalEpisodes: true,
  trailerUrl: true,
  actors: true,
  directors: true,
  episodes: true,
  embedUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lastCheckedAt: true,
}).partial({
  originalTitle: true,
  backdropUrl: true,
  releaseYear: true,
  quality: true,
  language: true,
  categories: true,
  countries: true,
  type: true,
  views: true,
  duration: true,
  currentEpisode: true,
  totalEpisodes: true,
  trailerUrl: true,
  actors: true,
  directors: true,
  embedUrl: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  lastCheckedAt: true,
});

// API Movie Job Log model to track API data fetches
export const apiMovieJobLogs = pgTable("api_movie_job_logs", {
  id: serial("id").primaryKey(),
  jobType: text("job_type", { enum: ["list", "detail", "update"] }).notNull(),
  status: text("status", { enum: ["success", "partial", "failed"] }).notNull(),
  details: jsonb("details"), // Store details like errors, success count, etc.
  startedAt: timestamp("started_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
  moviesProcessed: integer("movies_processed").default(0),
  moviesAdded: integer("movies_added").default(0),
  moviesUpdated: integer("movies_updated").default(0),
  errorCount: integer("error_count").default(0),
});

export const insertApiMovieJobLogSchema = createInsertSchema(apiMovieJobLogs).pick({
  jobType: true,
  status: true,
  details: true,
  startedAt: true,
  completedAt: true,
  moviesProcessed: true,
  moviesAdded: true,
  moviesUpdated: true,
  errorCount: true,
}).partial({
  details: true,
  startedAt: true,
  completedAt: true,
  moviesProcessed: true,
  moviesAdded: true,
  moviesUpdated: true,
  errorCount: true,
});

export type ApiMovie = typeof apiMovies.$inferSelect;
export type InsertApiMovie = z.infer<typeof insertApiMovieSchema>;

export type ApiMovieJobLog = typeof apiMovieJobLogs.$inferSelect;
export type InsertApiMovieJobLog = z.infer<typeof insertApiMovieJobLogSchema>;
