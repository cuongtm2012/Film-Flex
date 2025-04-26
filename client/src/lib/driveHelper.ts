/**
 * Google Drive API Helper Functions
 * These functions provide a simplified interface for working with Google Drive
 */

import googleDriveService from './googleDriveService';

/**
 * Initialize the Google Drive API
 * This must be called before any other Drive operations
 */
export async function initializeDriveAPI(): Promise<boolean> {
  try {
    return await googleDriveService.initGoogleDriveAPI();
  } catch (error) {
    console.error('Error initializing Drive API:', error);
    return false;
  }
}

/**
 * Authenticate with Google Drive
 * Returns true if authentication was successful or user is already authenticated
 */
export async function authenticateDrive(): Promise<boolean> {
  try {
    return await googleDriveService.authenticateWithGoogleDrive();
  } catch (error) {
    console.error('Error authenticating with Drive:', error);
    return false;
  }
}

/**
 * Convert a Google Drive file ID to a streaming URL
 * 
 * @param fileId Google Drive file ID
 * @returns Direct streaming URL with authorization token
 */
export async function getDriveVideoStreamingUrl(fileId: string): Promise<string> {
  try {
    if (!googleDriveService.isUserAuthenticated()) {
      const authSuccess = await authenticateDrive();
      if (!authSuccess) {
        throw new Error('Authentication required to access video');
      }
    }
    
    return await googleDriveService.getStreamingUrlWithToken(fileId);
  } catch (error) {
    console.error('Error getting video streaming URL:', error);
    throw error;
  }
}

/**
 * Get a thumbnail URL for a Google Drive file
 * 
 * @param fileId Google Drive file ID
 * @returns URL to the thumbnail image
 */
export function getDriveThumbnailUrl(fileId: string): string {
  return googleDriveService.getThumbnailUrl(fileId);
}

/**
 * List all video files in a Google Drive folder
 * 
 * @param folderId Google Drive folder ID
 * @returns Array of file objects with metadata
 */
export async function listDriveVideos(folderId: string): Promise<any[]> {
  try {
    if (!googleDriveService.isUserAuthenticated()) {
      const authSuccess = await authenticateDrive();
      if (!authSuccess) {
        throw new Error('Authentication required to list videos');
      }
    }
    
    const files = await googleDriveService.listFilesInFolder(folderId);
    
    // Filter for video files
    return files.filter(file => 
      file.mimeType.startsWith('video/') || 
      file.mimeType === 'application/vnd.google-apps.video'
    );
  } catch (error) {
    console.error('Error listing Drive videos:', error);
    throw error;
  }
}

/**
 * Extract file ID from various Google Drive URL formats
 * 
 * @param url Google Drive URL
 * @returns File ID if found, otherwise null
 */
export function extractDriveFileId(url: string): string | null {
  if (!url) return null;
  
  // Pattern 1: https://drive.google.com/file/d/{fileId}/view
  let match = url.match(/\/file\/d\/([^\/]+)/);
  if (match) return match[1];
  
  // Pattern 2: https://drive.google.com/open?id={fileId}
  match = url.match(/[?&]id=([^&]+)/);
  if (match) return match[1];
  
  // Pattern 3: https://docs.google.com/file/d/{fileId}/edit
  match = url.match(/\/file\/d\/([^\/]+)/);
  if (match) return match[1];
  
  // Pattern 4: Already just the ID
  if (/^[a-zA-Z0-9_-]{25,}$/.test(url)) return url;
  
  return null;
}

/**
 * Check if a string is a valid Google Drive file ID
 * 
 * @param id String to check
 * @returns True if likely a valid Drive file ID
 */
export function isValidDriveFileId(id: string): boolean {
  return /^[a-zA-Z0-9_-]{25,}$/.test(id);
}

/**
 * Copy a movie file from source folder to destination folder
 * Used in admin workflow to publish movies
 * 
 * @param fileId Source file ID 
 * @param destinationFolderId Target folder ID
 * @returns Metadata for the new file
 */
export async function copyMovieToPublishedFolder(
  fileId: string,
  destinationFolderId: string
): Promise<any> {
  try {
    if (!googleDriveService.isUserAuthenticated()) {
      const authSuccess = await authenticateDrive();
      if (!authSuccess) {
        throw new Error('Authentication required to copy movie');
      }
    }
    
    return await googleDriveService.copyFileToDriveFolder(fileId, destinationFolderId);
  } catch (error) {
    console.error('Error copying movie to published folder:', error);
    throw error;
  }
}

/**
 * Check if user is authenticated with Google Drive
 */
export function isUserAuthenticated(): boolean {
  return googleDriveService.isUserAuthenticated();
}

/**
 * Get current authenticated user information
 */
export function getCurrentDriveUser(): gapi.auth2.GoogleUser | null {
  return googleDriveService.getCurrentUser();
}