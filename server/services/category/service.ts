/**
 * Category Service
 * 
 * This service handles category management, including:
 * - Creating or updating categories
 * - Managing relationships between movies and categories
 * - Retrieving movies by category with pagination
 */

import { log } from '../../vite';
import { storage } from '../../storage';
import { Category, InsertCategory, InsertMovieCategory } from '../../../shared/schema-categories';
import { ApiMovie } from '../../../shared/schema';

/**
 * Create or update a category
 * @param categoryData Category data including name and slug
 * @returns The created or updated category
 */
export async function createOrUpdateCategory(categoryData: InsertCategory): Promise<Category> {
  try {
    // Check if the category already exists
    const existingCategory = await storage.getCategoryBySlug(categoryData.slug);
    
    if (existingCategory) {
      // Update the existing category if needed
      const updatedCategory = await storage.updateCategory(existingCategory.id, {
        name: categoryData.name,
        updatedAt: new Date()
      });
      
      return updatedCategory;
    } else {
      // Create a new category
      const newCategory = await storage.createCategory(categoryData);
      return newCategory;
    }
  } catch (error) {
    log(`Error creating or updating category ${categoryData.slug}: ${error}`, 'category');
    throw error;
  }
}

/**
 * Link a movie with its categories
 * @param movieId Movie ID
 * @param categoryIds Array of category IDs
 */
export async function linkMovieCategories(movieId: number, categoryIds: number[]): Promise<void> {
  try {
    // First, remove any existing links for this movie
    await storage.removeAllMovieCategories(movieId);
    
    // Then create new links
    for (const categoryId of categoryIds) {
      await storage.createMovieCategory({
        movieId,
        categoryId
      });
    }
    
    log(`Linked movie ${movieId} with ${categoryIds.length} categories`, 'category');
  } catch (error) {
    log(`Error linking movie ${movieId} with categories: ${error}`, 'category');
    throw error;
  }
}

/**
 * Process categories from a movie and link them
 * @param movie The movie to process
 * @param categories Array of categories from the API
 */
export async function processMovieCategories(movie: ApiMovie, categories: string[]): Promise<void> {
  try {
    const categoryIds: number[] = [];
    
    // Process each category
    for (const categoryName of categories) {
      // Create a slug from the category name
      const slug = categoryName.toLowerCase().replace(/\s+/g, '-');
      
      // Create or update the category
      const category = await createOrUpdateCategory({
        name: categoryName,
        slug
      });
      
      categoryIds.push(category.id);
    }
    
    // Link the movie with its categories
    await linkMovieCategories(movie.id, categoryIds);
  } catch (error) {
    log(`Error processing categories for movie ${movie.id}: ${error}`, 'category');
    throw error;
  }
}

/**
 * Get movies by category slug with pagination
 * @param categorySlug Category slug
 * @param page Page number (starting from 1)
 * @param limit Number of items per page
 */
export async function getMoviesByCategory(
  categorySlug: string, 
  page: number = 1, 
  limit: number = 20
): Promise<{
  movies: ApiMovie[];
  total: number;
  totalPages: number;
}> {
  try {
    // Calculate offset
    const offset = (page - 1) * limit;
    
    // Get the category
    const category = await storage.getCategoryBySlug(categorySlug);
    if (!category) {
      return { movies: [], total: 0, totalPages: 0 };
    }
    
    // Get movies by category with pagination
    const movies = await storage.getMoviesByCategory(category.id, limit, offset);
    
    // Get total count
    const total = await storage.countMoviesByCategory(category.id);
    
    // Calculate total pages
    const totalPages = Math.ceil(total / limit);
    
    return {
      movies,
      total,
      totalPages
    };
  } catch (error) {
    log(`Error getting movies for category ${categorySlug}: ${error}`, 'category');
    throw error;
  }
}