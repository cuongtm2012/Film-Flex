import { pool, db } from '../server/db';
import { sql } from 'drizzle-orm';

async function main() {
  console.log('Running migrations...');

  try {
    // Add createdAt and updatedAt columns to all tables that need them
    
    // Movies table
    console.log('Migrating movies table...');
    await db.execute(sql`
      ALTER TABLE movies
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);
    
    // Categories table
    console.log('Migrating categories table...');
    await db.execute(sql`
      ALTER TABLE categories
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    `);

    // API Movies table
    console.log('Migrating api_movies table...');
    // Check if created_at and updated_at already exist in api_movies
    const checkColumns = await db.execute(sql`
      SELECT EXISTS (
        SELECT FROM information_schema.columns 
        WHERE table_name = 'api_movies' AND column_name = 'created_at'
      ) as has_created_at
    `);
    
    if (!checkColumns[0]?.has_created_at) {
      await db.execute(sql`
        ALTER TABLE api_movies
        ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      `);
    }
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main().catch(console.error);