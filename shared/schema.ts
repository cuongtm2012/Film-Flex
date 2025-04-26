import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
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
}).partial({
  videoUrl: true,
  matchPercentage: true,
  director: true,
  cast: true,
  imdbRating: true,
  viewCount: true,
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
