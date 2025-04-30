#!/usr/bin/env tsx
/**
 * Movie Sync Scheduler
 * 
 * This script sets up scheduled tasks to keep the movie database updated with 
 * content from the phimapi.com API. It runs continuously with configured intervals
 * for different types of sync operations.
 * 
 * Usage:
 *   tsx scripts/scheduled-sync.ts
 * 
 * Configuration can be adjusted in the CONFIG object below.
 */

import { syncMovies, processPendingDetailFetches } from '../server/services/phimapi/service';
import { publishMovies } from '../server/services/phimapi/admin';

// Configuration
const CONFIG = {
  // How often to sync recent pages (in milliseconds)
  recentSyncInterval: 30 * 60 * 1000, // 30 minutes
  
  // How often to do a deeper sync (in milliseconds)
  deeperSyncInterval: 12 * 60 * 60 * 1000, // 12 hours
  
  // How often to process pending details (in milliseconds)
  detailsInterval: 15 * 60 * 1000, // 15 minutes
  
  // How often to publish pending movies (in milliseconds)
  publishInterval: 60 * 60 * 1000, // 1 hour
  
  // Number settings
  recentPages: 5,         // Pages to sync in recent updates
  deeperPages: 20,        // Pages to sync in deeper updates
  detailBatchSize: 10,    // Details to process in one batch
  publishBatchSize: 50,   // Movies to publish in one batch
};

/**
 * Simple logging with timestamps
 */
function log(message: string) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [SCHEDULER] ${message}`);
}

/**
 * Sync recent pages (first few pages with newest content)
 */
async function syncRecentPages() {
  try {
    log(`Starting recent sync (first ${CONFIG.recentPages} pages)`);
    const startTime = Date.now();
    
    const newMovies = await syncMovies(1, CONFIG.recentPages, CONFIG.detailBatchSize);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Recent sync completed in ${duration}s, found ${newMovies} new movies`);
  } catch (error) {
    log(`Error in recent sync: ${error}`);
  }
}

/**
 * Sync deeper pages (more pages for comprehensive updates)
 */
async function syncDeeperPages() {
  try {
    log(`Starting deeper sync (pages 1-${CONFIG.deeperPages})`);
    const startTime = Date.now();
    
    const newMovies = await syncMovies(1, CONFIG.deeperPages, CONFIG.detailBatchSize);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Deeper sync completed in ${duration}s, found ${newMovies} new movies`);
  } catch (error) {
    log(`Error in deeper sync: ${error}`);
  }
}

/**
 * Process pending movie details
 */
async function processDetails() {
  try {
    log(`Processing pending movie details`);
    const startTime = Date.now();
    
    const processed = await processPendingDetailFetches(CONFIG.detailBatchSize);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Processed ${processed} movie details in ${duration}s`);
  } catch (error) {
    log(`Error processing details: ${error}`);
  }
}

/**
 * Publish pending movies
 */
async function publishPendingMovies() {
  try {
    log(`Publishing pending movies`);
    const startTime = Date.now();
    
    const published = await publishMovies(CONFIG.publishBatchSize);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log(`Published ${published} movies in ${duration}s`);
  } catch (error) {
    log(`Error publishing movies: ${error}`);
  }
}

/**
 * Start the scheduler
 */
function startScheduler() {
  log('Movie sync scheduler started');
  
  // Run initial tasks with a slight delay between them
  setTimeout(syncRecentPages, 5000);
  setTimeout(processDetails, 30000);
  setTimeout(publishPendingMovies, 60000);
  setTimeout(syncDeeperPages, 120000);
  
  // Set up recurring tasks
  setInterval(syncRecentPages, CONFIG.recentSyncInterval);
  setInterval(syncDeeperPages, CONFIG.deeperSyncInterval);
  setInterval(processDetails, CONFIG.detailsInterval);
  setInterval(publishPendingMovies, CONFIG.publishInterval);
  
  // Keep the process alive
  setInterval(() => {
    log('Scheduler heartbeat - still running');
  }, 60 * 60 * 1000); // Log every hour
}

// Start the scheduler
startScheduler();