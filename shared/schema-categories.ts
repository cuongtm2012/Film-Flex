import { pgTable, serial, text, timestamp, integer, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Categories table
export const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Movie-Categories junction table for many-to-many relationship
export const movieCategories = pgTable("movie_categories", {
  movieId: integer("movie_id").notNull().references(() => apiMovies.id, { onDelete: "cascade" }),
  categoryId: integer("category_id").notNull().references(() => categories.id, { onDelete: "cascade" }),
}, (table) => {
  return {
    pk: primaryKey({ columns: [table.movieId, table.categoryId] }),
  };
});

// Import reference to apiMovies from main schema
import { apiMovies } from "./schema";

// Create insert schemas
export const insertCategorySchema = createInsertSchema(categories).pick({
  name: true,
  slug: true,
}).partial({
  createdAt: true,
  updatedAt: true,
});

export const insertMovieCategorySchema = createInsertSchema(movieCategories);

// Define types
export type Category = typeof categories.$inferSelect;
export type InsertCategory = z.infer<typeof insertCategorySchema>;
export type MovieCategory = typeof movieCategories.$inferSelect;
export type InsertMovieCategory = z.infer<typeof insertMovieCategorySchema>;

// Relation helper
export function defineRelations() {
  // This function will be imported and called in the main schema file
  // to define relationships between tables
}