# PhimAPI Movie Sync System

This system provides tools to automatically fetch, process, and sync movie data from the phimapi.com API. It includes scripts for bulk importing, scheduled synchronization, and management of movie data.

## Key Features

- **Automatic Embed URL Extraction**: Direct extraction and storage of embed URLs for reliable streaming
- **Bulk Import**: Import thousands of movies from all 2251 pages of the API
- **Scheduled Sync**: Keep your database up-to-date with the latest content
- **Movie Publishing**: Control which movies are visible on the website
- **CLI Tools**: Easy-to-use command-line tools for database management

## Available Tools

### 1. Movie CLI (Recommended)

The most user-friendly way to interact with the movie sync system.

```bash
# Show statistics about the movie database
tsx scripts/movie-cli.ts stats

# Sync recent pages (quick update)
tsx scripts/movie-cli.ts sync

# Deep sync (more comprehensive update)
tsx scripts/movie-cli.ts deep-sync --start=1 --end=20

# Bulk import with custom options
tsx scripts/movie-cli.ts import --start=1 --end=50 --wait=2000 --details=5

# Publish pending movies
tsx scripts/movie-cli.ts publish --count=100

# Start continuous scheduled sync
tsx scripts/movie-cli.ts scheduled

# Show help
tsx scripts/movie-cli.ts help
```

### 2. Bulk Import Script

For importing large numbers of movies, particularly the entire 2251 pages.

```bash
# Import all pages with default settings
tsx scripts/bulk-import-movies.ts

# Import a specific range of pages
tsx scripts/bulk-import-movies.ts --start=1 --end=50

# Customize concurrency and retry settings
tsx scripts/bulk-import-movies.ts --concurrency=2 --retry=5 --wait=3000 --details=10

# Resume a previously interrupted job
tsx scripts/bulk-import-movies.ts --resume=JOB_ID

# Retry failed pages from a job
tsx scripts/bulk-import-movies.ts --retry-failed=JOB_ID
```

### 3. Chunk-based Import

For dividing the large import task into manageable chunks.

```bash
# Run the first chunk of 10 total chunks (pages 1-225)
tsx scripts/chunk-import.ts 1 10

# Run the second chunk of 10 (pages 226-450)
tsx scripts/chunk-import.ts 2 10

# Continue with each chunk until you've covered all 10
```

### 4. Scheduled Sync

Automates the process of keeping your database updated.

```bash
# Start the scheduler (runs continuously)
tsx scripts/scheduled-sync.ts
```

### 5. Fetch and Publish Script

Fetches a specified range of pages and immediately publishes them.

```bash
# Fetch pages 1-100 and publish up to 100 movies
tsx scripts/fetch-and-publish.ts 1 100 100
```

### 6. Publish Movies Script

Publishes pending movies that have been imported but not yet made visible.

```bash
# Publish up to 500 pending movies
tsx scripts/publish-movies.ts 500
```

### 7. Update Embed URLs Script

Specifically targets movies with missing embed URLs and updates them by fetching details from the API.

```bash
# Update embed URLs for up to 50 movies with null embedUrl values
tsx scripts/update-movie-embed-urls.ts 50

# Update embed URLs for all movies with null embedUrl values
tsx scripts/update-movie-embed-urls.ts 500
```

## Workflow

1. Start with a bulk import to get initial movie data:
   ```bash
   tsx scripts/movie-cli.ts import --start=1 --end=50
   ```

2. Update missing embed URLs for better video playback:
   ```bash
   tsx scripts/update-movie-embed-urls.ts 100
   ```

3. Publish imported movies to make them visible:
   ```bash
   tsx scripts/movie-cli.ts publish --count=100
   ```

4. Set up scheduled updates to keep content fresh:
   ```bash
   tsx scripts/movie-cli.ts scheduled
   ```

5. Alternatively, run manual sync when needed:
   ```bash
   tsx scripts/movie-cli.ts sync
   ```

## Important Notes

- The API has 2251 pages in total. Importing all pages will take a significant amount of time.
- Rate limiting is implemented to avoid being blocked by the API server.
- Movies go through a draft → pending_review → published workflow.
- Embed URLs are automatically extracted and stored for reliable playback.
- All movie data is cached to minimize API requests for frequently accessed content.

## Database Schema

The `api_movies` table stores all imported movies with the following key fields:

- `id` - Auto-incremented unique identifier
- `slug` - Unique slug from the API
- `title` - Movie title
- `description` - Movie description
- `posterUrl` - URL to the movie poster image
- `backdropUrl` - URL to the movie backdrop image
- `embedUrl` - Direct embed URL for streaming the movie
- `episodes` - JSON array of all available episodes and streaming sources
- `status` - Current status (draft, pending_review, published, rejected)

## Troubleshooting

- If imports fail, check server logs for API error responses
- Use `--retry-failed` to retry failed pages
- If you encounter rate limiting, increase the `--wait` parameter
- For large imports, use chunk-based importing instead of trying to do everything at once
- If movies are missing embed URLs, run the `update-movie-embed-urls.ts` script
- If videos don't play, check the `embedUrl` values in the database with SQL queries
  ```sql
  -- Check how many movies have embed URLs
  SELECT COUNT(*) FROM api_movies WHERE embed_url IS NOT NULL;
  
  -- Check for specific movie embed URLs
  SELECT id, title, embed_url FROM api_movies WHERE id = 123;
  ```