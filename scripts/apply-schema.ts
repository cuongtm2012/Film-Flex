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
        error_count INTEGER NOT NULL DEFAULT 0,
        last_processed_page INTEGER,
        next_page INTEGER,
        details JSONB,
        started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);
    
    console.log("api_movie_job_logs table created or verified");
    
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