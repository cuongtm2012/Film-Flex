/**
 * Helper functions for working with Google Drive
 * This file provides simplified methods for common Drive operations
 */

import { convertToDirectStreamingUrl, extractFileId, isGoogleDriveUrl } from './googleDriveApi';
import googleDriveService from './googleDriveService';

/**
 * Source folder ID containing the movies to show in the app
 */
export const SOURCE_FOLDER_ID = '1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN';

/**
 * Destination folder ID for copied movies
 */
export const DESTINATION_FOLDER_ID = '10e9ynLaJdenTOQzuq3E9eoBM6JL5LDEF';

/**
 * Convert a Google Drive URL to a streamable URL
 * Handles various formats of Google Drive URLs
 * 
 * @param url Google Drive URL or any other URL
 * @returns A URL that can be directly used in video elements
 */
export function convertToGoogleDriveStreamingUrl(url: string): string {
  if (!url) return '';
  
  // If not a Google Drive URL, return as is
  if (!isGoogleDriveUrl(url)) {
    return url;
  }
  
  // Try to get fileId
  const fileId = extractFileId(url);
  if (!fileId) {
    console.warn('Could not extract file ID from Google Drive URL:', url);
    return url;
  }
  
  // For authenticated users, try to get a token-based URL
  if (googleDriveService.isUserAuthenticated()) {
    try {
      // This is an async function, but we'll use the basic URL as fallback
      googleDriveService.getStreamingUrlWithToken(fileId)
        .then(tokenUrl => {
          console.log('Using authenticated streaming URL for file:', fileId);
          return tokenUrl;
        })
        .catch(error => {
          console.error('Failed to get authenticated URL, falling back to basic URL:', error);
          return convertToDirectStreamingUrl(url);
        });
    } catch (error) {
      console.error('Error while trying to get authenticated URL:', error);
    }
  }
  
  // Basic direct streaming URL as fallback
  return convertToDirectStreamingUrl(url);
}

/**
 * List all video files in the source folder
 * User must be authenticated
 * 
 * @returns Array of file objects with metadata
 */
export async function listSourceVideos() {
  try {
    const files = await googleDriveService.listFilesInFolder(SOURCE_FOLDER_ID);
    // Filter to only include video files
    return files.filter(file => file.mimeType.includes('video'));
  } catch (error) {
    console.error('Failed to list videos from source folder:', error);
    throw error;
  }
}

/**
 * Copy a movie file from source to destination folder
 * 
 * @param fileId The ID of the file to copy
 * @returns Metadata of the newly created copy
 */
export async function copyMovieFile(fileId: string) {
  try {
    return await googleDriveService.copyFileToDriveFolder(fileId, DESTINATION_FOLDER_ID);
  } catch (error) {
    console.error('Failed to copy movie file:', error);
    throw error;
  }
}

/**
 * Initialize Google Drive API and authentication
 * Should be called early in the application lifecycle
 * 
 * @returns Promise resolving to a boolean indicating success
 */
export async function initializeDriveAPI(): Promise<boolean> {
  try {
    return await googleDriveService.initGoogleDriveAPI();
  } catch (error) {
    console.error('Failed to initialize Google Drive API:', error);
    return false;
  }
}

/**
 * Authenticate with Google Drive
 * Shows Google's OAuth popup
 * 
 * @returns Promise resolving to a boolean indicating success
 */
export async function authenticateDrive(): Promise<boolean> {
  try {
    return await googleDriveService.authenticateWithGoogleDrive();
  } catch (error) {
    console.error('Failed to authenticate with Google Drive:', error);
    return false;
  }
}

export default {
  SOURCE_FOLDER_ID,
  DESTINATION_FOLDER_ID,
  convertToGoogleDriveStreamingUrl,
  listSourceVideos,
  copyMovieFile,
  initializeDriveAPI,
  authenticateDrive
};