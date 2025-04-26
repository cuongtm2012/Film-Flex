import { pgTable, text, serial, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  email: true,
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
  genreIds: true,
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
