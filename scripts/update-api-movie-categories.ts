#!/usr/bin/env tsx

/**
 * Update API Movie Categories Script
 * 
 * This script updates the categories field in the api_movies table
 * based on the relationships in the movie_categories table.
 */

import { pool } from '../server/db';

async function main() {
  console.log("Starting API movie categories update...");

  try {
    // First get all movie-category relationships
    const { rows: movieCategories } = await pool.query(`
      SELECT mc.movie_id, c.name 
      FROM movie_categories mc 
      JOIN categories c ON mc.category_id = c.id 
      WHERE mc.movie_type = 'api'
    `);

    console.log(`Found ${movieCategories.length} movie-category relationships`);

    // Group categories by movie ID
    const movieCategoriesMap = new Map();
    
    for (const row of movieCategories) {
      const { movie_id, name } = row;
      
      if (!movieCategoriesMap.has(movie_id)) {
        movieCategoriesMap.set(movie_id, []);
      }
      
      movieCategoriesMap.get(movie_id).push(name);
    }

    console.log(`Grouped categories for ${movieCategoriesMap.size} movies`);

    // Update each movie with its categories
    let updatedCount = 0;
    
    for (const [movieId, categories] of movieCategoriesMap.entries()) {
      // Update the movie with the category names array
      await pool.query(
        `UPDATE api_movies 
         SET categories = $1, updated_at = NOW() 
         WHERE id = $2`,
        [categories, movieId]
      );
      
      console.log(`Updated movie ${movieId} with categories: ${categories.join(', ')}`);
      updatedCount++;
    }

    console.log(`
Update API Movie Categories Results:
------------------------------------
Total relationships: ${movieCategories.length}
Total movies updated: ${updatedCount}
    `);
  } catch (error) {
    console.error("Error updating API movie categories:", error);
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error("Script error:", error);
  process.exit(1);
});