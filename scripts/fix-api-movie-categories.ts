#!/usr/bin/env tsx

/**
 * Fix API Movie Categories Script
 * 
 * This script fixes the categories in the API movies table to properly populate
 * the categories text[] field with category names.
 * 
 * Usage:
 *   tsx scripts/fix-api-movie-categories.ts
 */

import { db } from '../server/db';
import { apiMovies, movieCategories, categories } from '../shared/schema';
import { eq, and, desc } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

async function main() {
  console.log("Starting API movie categories fix...");

  // Get all categories for lookup
  const allCategories = await db.select().from(categories);
  console.log(`Loaded ${allCategories.length} categories`);

  // Create a map of category ID to name for faster lookup
  const categoryMap = new Map(allCategories.map(category => [category.id, category.name]));

  // Get all API movies
  const apiMoviesList = await db.select().from(apiMovies).orderBy(desc(apiMovies.id));
  console.log(`Found ${apiMoviesList.length} API movies to process`);

  let updatedCount = 0;
  let errorCount = 0;

  // Process each API movie
  for (const movie of apiMoviesList) {
    try {
      // Get categories for this movie from the movie_categories junction table
      const movieCategoryLinks = await db
        .select()
        .from(movieCategories)
        .where(
          and(
            eq(movieCategories.movieId, movie.id),
            eq(movieCategories.movieType, 'api')
          )
        );

      // Map category IDs to names
      const categoryNames = movieCategoryLinks
        .map(link => categoryMap.get(link.categoryId))
        .filter(name => name !== undefined) as string[];

      // Update the movie with the category names
      if (categoryNames.length > 0) {
        await db
          .update(apiMovies)
          .set({ 
            categories: categoryNames,
            updatedAt: new Date()
          })
          .where(eq(apiMovies.id, movie.id));

        updatedCount++;
        if (updatedCount % 100 === 0) {
          console.log(`Updated ${updatedCount} movies so far`);
        }
      } else {
        console.log(`No categories found for movie: ${movie.id} (${movie.title})`);
      }
    } catch (error) {
      console.error(`Error updating movie ${movie.id} (${movie.title}): ${error}`);
      errorCount++;
    }
  }

  console.log(`
Fix API Movie Categories Results:
--------------------------------
Total API movies: ${apiMoviesList.length}
Updated movies: ${updatedCount}
Errors: ${errorCount}
`);
}

main()
  .catch(error => {
    console.error("Error in API movie categories fix script:", error);
    process.exit(1);
  })
  .finally(async () => {
    console.log("Closing database connection...");
    await db.dialect.driver.destroy();
    console.log("Done!");
    process.exit(0);
  });