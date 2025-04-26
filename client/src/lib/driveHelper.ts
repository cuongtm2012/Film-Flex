/**
 * Helper functions for working with Google Drive URLs
 */

/**
 * Extracts the file ID from a Google Drive sharing URL
 * Handles various Google Drive URL formats:
 * - https://drive.google.com/file/d/FILE_ID/view
 * - https://drive.google.com/open?id=FILE_ID
 * - https://drive.google.com/uc?id=FILE_ID
 * 
 * @param url Google Drive URL
 * @returns File ID or null if not a valid Drive URL
 */
export function extractGoogleDriveFileId(url: string): string | null {
  if (!url) return null;
  
  // For format: https://drive.google.com/file/d/FILE_ID/view
  const filePathMatch = url.match(/\/file\/d\/([^/]+)/);
  if (filePathMatch && filePathMatch[1]) {
    return filePathMatch[1];
  }
  
  // For format: https://drive.google.com/open?id=FILE_ID
  // or https://drive.google.com/uc?id=FILE_ID
  const queryParamMatch = url.match(/[?&]id=([^&]+)/);
  if (queryParamMatch && queryParamMatch[1]) {
    return queryParamMatch[1];
  }
  
  return null;
}

/**
 * Converts a Google Drive sharing URL to a direct download URL
 * 
 * @param url Google Drive URL
 * @returns Direct download URL or the original URL if not a Drive URL
 */
export function convertToGoogleDriveDirectUrl(url: string): string {
  const fileId = extractGoogleDriveFileId(url);
  
  if (!fileId) {
    return url; // Return original URL if not a Drive URL
  }
  
  // Convert to direct download URL format
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/**
 * Converts a Google Drive sharing URL to a streaming URL
 * 
 * @param url Google Drive URL
 * @returns Streaming URL or the original URL if not a Drive URL
 */
export function convertToGoogleDriveStreamingUrl(url: string): string {
  const fileId = extractGoogleDriveFileId(url);
  
  if (!fileId) {
    return url; // Return original URL if not a Drive URL
  }
  
  // Use the more reliable streaming endpoint
  return `https://drive.google.com/uc?id=${fileId}`;
}