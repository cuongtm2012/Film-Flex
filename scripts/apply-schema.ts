import { Pool, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "../shared/schema";
import ws from "ws";

// Configure WebSocket for Neon connection
neonConfig.webSocketConstructor = ws;

// Create tables if they don't exist
async function main() {
  console.log("Applying database schema...");
  
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is not defined");
  }
  
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle(pool, { schema });
  
  try {
    // Create api_movies table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_movies (
        id SERIAL PRIMARY KEY,
        slug TEXT NOT NULL UNIQUE,
        title TEXT NOT NULL,
        original_title TEXT,
        description TEXT,
        poster_url TEXT,
        backdrop_url TEXT,
        release_year INTEGER,
        quality TEXT,
        language TEXT,
        categories TEXT[],
        countries TEXT[],
        type TEXT NOT NULL,
        views INTEGER,
        duration TEXT,
        current_episode TEXT,
        total_episodes TEXT,
        trailer_url TEXT,
        actors TEXT[],
        directors TEXT[],
        episodes JSONB NOT NULL DEFAULT '[]',
        status TEXT NOT NULL DEFAULT 'draft',
        last_checked_at TIMESTAMP WITH TIME ZONE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("api_movies table created or verified");
    
    // Create api_movie_job_logs table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS api_movie_job_logs (
        id SERIAL PRIMARY KEY,
        job_type TEXT NOT NULL,
        status TEXT NOT NULL,
        movies_processed INTEGER NOT NULL DEFAULT 0,
        movies_added INTEGER NOT NULL DEFAULT 0,
        movies_updated INTEGER NOT NULL DEFAULT 0,
        movies_failed INTEGER NOT NULL DEFAULT 0,
        last_processed_page INTEGER,
        next_page INTEGER,
        details JSONB,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
      
      -- Check if error_count column exists, if not add it
      DO $$ 
      BEGIN
        IF NOT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_name = 'api_movie_job_logs' AND column_name = 'error_count'
        ) THEN
          ALTER TABLE api_movie_job_logs ADD COLUMN error_count INTEGER NOT NULL DEFAULT 0;
        END IF;
      END $$;
    `);
    
    console.log("api_movie_job_logs table created or verified");
    
    // Create categories table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
      );
    `);
    
    console.log("categories table created or verified");
    
    // Create movie_categories junction table if it doesn't exist
    await pool.query(`
      CREATE TABLE IF NOT EXISTS movie_categories (
        movie_id INTEGER NOT NULL REFERENCES api_movies(id) ON DELETE CASCADE,
        category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
        PRIMARY KEY (movie_id, category_id)
      );
    `);
    
    console.log("movie_categories table created or verified");
    
    console.log("Database schema applied successfully");
  } catch (error) {
    console.error("Error applying schema:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});