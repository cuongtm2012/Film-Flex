/**
 * Google Drive API Integration for FilmFlex
 * This file provides functions to interact with Google Drive API for video playback
 */

import { getGapiClient } from './driveHelper';

/**
 * Fetch files from a Google Drive folder
 * 
 * @param folderId The ID of the Google Drive folder
 * @returns Promise with an array of file objects
 */
export async function fetchGoogleDriveFiles(folderId: string): Promise<any[]> {
  try {
    const gapi = await getGapiClient();
    if (!gapi) {
      console.error('Google API client not initialized');
      return [];
    }

    const response = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and mimeType contains 'video/' and trashed = false`,
      fields: 'files(id, name, mimeType, size, thumbnailLink, webContentLink)',
      orderBy: 'name'
    });

    return response.result.files || [];
  } catch (error) {
    console.error('Error fetching Google Drive files:', error);
    return [];
  }
}

/**
 * Create a direct download link for a Google Drive file
 * Uses the export=download parameter
 * 
 * @param fileId Google Drive file ID
 * @returns Direct download URL
 */
export function createDirectDownloadLink(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Get a Direct Streaming URL for a Google Drive file
 * Uses the exportDownload method for reliable streaming
 * 
 * @param fileId Google Drive file ID
 * @returns Direct streaming URL
 */
export function getDirectStreamingUrl(fileId: string): string {
  if (!fileId) return '';
  
  // Base streaming URL with export=download parameter
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Extract the file ID from a Google Drive sharing URL
 * 
 * @param url Google Drive sharing URL
 * @returns File ID or null if not a valid URL
 */
export function extractFileId(url: string): string | null {
  if (!url) return null;
  
  // For format: https://drive.google.com/file/d/FILE_ID/view
  const filePathMatch = url.match(/\/file\/d\/([^/]+)/);
  if (filePathMatch && filePathMatch[1]) {
    return filePathMatch[1];
  }
  
  // For format: https://drive.google.com/open?id=FILE_ID
  const queryParamMatch = url.match(/[?&]id=([^&]+)/);
  if (queryParamMatch && queryParamMatch[1]) {
    return queryParamMatch[1];
  }
  
  return null;
}

/**
 * Check if a URL is a Google Drive URL
 * 
 * @param url URL to check
 * @returns true if it's a Google Drive URL
 */
export function isGoogleDriveUrl(url: string): boolean {
  return url.includes('drive.google.com');
}

/**
 * Convert a Google Drive sharing URL to a direct streaming URL
 * 
 * @param url Google Drive URL or any other URL
 * @returns Direct streaming URL if it's a Drive URL, otherwise returns the original URL
 */
export function convertToDirectStreamingUrl(url: string): string {
  if (!isGoogleDriveUrl(url)) {
    return url; // Not a Google Drive URL, return as is
  }
  
  const fileId = extractFileId(url);
  if (!fileId) {
    console.warn('Could not extract Google Drive file ID from URL:', url);
    return url; // Could not extract file ID, return original URL
  }
  
  return getDirectStreamingUrl(fileId);
}

/**
 * Generate a thumbnail URL for a Google Drive video file
 * 
 * @param fileId Google Drive file ID
 * @returns Thumbnail URL
 */
export function getThumbnailUrl(fileId: string): string {
  if (!fileId) return '';
  
  // For videos, we can use the first frame as a thumbnail
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
}