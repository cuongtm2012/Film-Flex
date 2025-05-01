/**
 * Category Sync Script
 * 
 * This script syncs categories from the PhimAPI to our database.
 * It ensures that our local category data matches what's returned from the API.
 */

import { db } from '../server/db';
import { categories } from '../shared/schema-categories';
import { eq } from 'drizzle-orm';

// Vietnamese categories mapping to English
const vietnameseToEnglishMap: Record<string, string> = {
  'Hành Động': 'Action',
  'Tâm Lý': 'Drama',
  'Hài Hước': 'Comedy',
  'Kinh Dị': 'Horror',
  'Viễn Tưởng': 'Science Fiction',
  'Phiêu Lưu': 'Adventure',
  'Tình Cảm': 'Romance',
  'Thần Thoại': 'Mythology',
  'Cổ Trang': 'Ancient Costume',
  'Võ Thuật': 'Martial Arts',
  'Hình Sự': 'Crime',
  'Tài Liệu': 'Documentary',
  'Hoạt Hình': 'Animation',
  'Bí Ẩn': 'Mystery',
  'Chiến Tranh': 'War',
  'Gia Đình': 'Family',
  'Thể Thao': 'Sports',
  'Âm Nhạc': 'Music',
  'Lịch Sử': 'History',
  'TV Show': 'TV Show'
};

// Common PhimAPI categories in Vietnamese with their slugs
const phimApiCategories = [
  { name: 'Hành Động', slug: 'hanh-dong' },
  { name: 'Tâm Lý', slug: 'tam-ly' },
  { name: 'Hài Hước', slug: 'hai-huoc' },
  { name: 'Kinh Dị', slug: 'kinh-di' },
  { name: 'Viễn Tưởng', slug: 'vien-tuong' },
  { name: 'Phiêu Lưu', slug: 'phieu-luu' },
  { name: 'Tình Cảm', slug: 'tinh-cam' },
  { name: 'Thần Thoại', slug: 'than-thoai' },
  { name: 'Cổ Trang', slug: 'co-trang' },
  { name: 'Võ Thuật', slug: 'vo-thuat' },
  { name: 'Hình Sự', slug: 'hinh-su' },
  { name: 'Tài Liệu', slug: 'tai-lieu' },
  { name: 'Hoạt Hình', slug: 'hoat-hinh' },
  { name: 'Bí Ẩn', slug: 'bi-an' },
  { name: 'Chiến Tranh', slug: 'chien-tranh' },
  { name: 'Gia Đình', slug: 'gia-dinh' },
  { name: 'Thể Thao', slug: 'the-thao' },
  { name: 'Âm Nhạc', slug: 'am-nhac' },
  { name: 'Lịch Sử', slug: 'lich-su' },
  { name: 'TV Show', slug: 'tv-show' }
];

async function syncCategories() {
  console.log('Starting category sync...');
  
  try {
    // Get existing categories from the database
    const existingCategories = await db.select().from(categories);
    const existingSlugs = new Set(existingCategories.map(c => c.slug));
    const existingNames = new Set(existingCategories.map(c => c.name));
    
    console.log(`Found ${existingCategories.length} existing categories in database`);
    
    // Prepare categories to add
    const categoriesToAdd = [];
    
    for (const category of phimApiCategories) {
      if (!existingSlugs.has(category.slug) && !existingNames.has(category.name)) {
        categoriesToAdd.push({
          name: category.name,
          slug: category.slug
        });
      }
    }
    
    if (categoriesToAdd.length > 0) {
      console.log(`Adding ${categoriesToAdd.length} new categories to database`);
      
      // Insert new categories
      const insertedCategories = await db.insert(categories)
        .values(categoriesToAdd)
        .returning();
      
      console.log(`Successfully added categories: ${insertedCategories.map(c => c.name).join(', ')}`);
    } else {
      console.log('No new categories to add');
    }
    
    // Also add the English equivalent categories if they don't exist
    const englishCategoriesToAdd = [];
    
    for (const category of phimApiCategories) {
      const englishName = vietnameseToEnglishMap[category.name];
      if (englishName && !existingNames.has(englishName)) {
        // Create slug from English name
        const englishSlug = englishName.toLowerCase().replace(/\s+/g, '-');
        
        // Skip if slug already exists
        if (!existingSlugs.has(englishSlug)) {
          englishCategoriesToAdd.push({
            name: englishName,
            slug: englishSlug
          });
          // Add to existing slugs to prevent duplicates in this run
          existingSlugs.add(englishSlug);
        } else {
          console.log(`Skipping English category ${englishName} (${englishSlug}) as slug already exists`);
        }
      }
    }
    
    if (englishCategoriesToAdd.length > 0) {
      console.log(`Adding ${englishCategoriesToAdd.length} English equivalent categories`);
      
      // Insert English equivalent categories one by one to avoid batch failure
      for (const category of englishCategoriesToAdd) {
        try {
          const insertedCategory = await db.insert(categories)
            .values(category)
            .returning();
          
          console.log(`Successfully added English category: ${insertedCategory[0].name}`);
        } catch (error) {
          console.error(`Error adding English category ${category.name}: ${error}`);
        }
      }
    }
    
    // Clean up test categories
    const testCategories = existingCategories.filter(c => 
      c.name.includes('Test Category') || 
      c.name.includes('String Category')
    );
    
    if (testCategories.length > 0) {
      console.log(`Removing ${testCategories.length} test categories`);
      
      for (const testCategory of testCategories) {
        await db.delete(categories)
          .where(eq(categories.id, testCategory.id));
      }
      
      console.log(`Successfully removed test categories`);
    }
    
    console.log('Category sync completed successfully');
  } catch (error) {
    console.error('Error syncing categories:', error);
  }
}

// Run the sync function
syncCategories()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Fatal error during category sync:', error);
    process.exit(1);
  });