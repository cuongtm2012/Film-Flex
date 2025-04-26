/**
 * Google Drive API Service
 * 
 * This service handles authentication and interaction with Google Drive API
 * Uses OAuth 2.0 flow to authenticate users and access their Google Drive files
 */

// Check for the presence of Google API Key - use the environment variable with VITE_ prefix
const GOOGLE_API_KEY = import.meta.env.VITE_GOOGLE_API_KEY || import.meta.env.GOOGLE_API_KEY;

// For OAuth client ID, we'll use our Firebase project's web application credentials
// Firebase project ID is used to construct the OAuth CLIENT_ID
const FIREBASE_PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID;

// Google API constants
const API_KEY = GOOGLE_API_KEY;
// For OAuth, we construct a client ID using the Firebase project ID format
// Default to a fallback if PROJECT_ID is missing
const CLIENT_ID = FIREBASE_PROJECT_ID ? 
  `${FIREBASE_PROJECT_ID}.apps.googleusercontent.com` : 
  import.meta.env.VITE_FIREBASE_CLIENT_ID;
const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
const SCOPES = 'https://www.googleapis.com/auth/drive.readonly';

// Authentication state
let isInitialized = false;
let isAuthenticated = false;
let currentUser: gapi.auth2.GoogleUser | null = null;

/**
 * Initialize Google API client
 * This must be called before using any other methods
 */
export async function initGoogleDriveAPI(): Promise<boolean> {
  if (isInitialized) return true;
  
  try {
    return new Promise<boolean>((resolve) => {
      gapi.load('client:auth2', async () => {
        try {
          await gapi.client.init({
            apiKey: API_KEY,
            clientId: CLIENT_ID,
            discoveryDocs: DISCOVERY_DOCS,
            scope: SCOPES
          });
          
          // Listen for sign-in state changes
          gapi.auth2.getAuthInstance().isSignedIn.listen(updateSigninStatus);
          
          // Handle the initial sign-in state
          updateSigninStatus(gapi.auth2.getAuthInstance().isSignedIn.get());
          
          isInitialized = true;
          resolve(true);
        } catch (error) {
          console.error("Error initializing Google API client:", error);
          resolve(false);
        }
      });
    });
  } catch (error) {
    console.error("Failed to load Google API client:", error);
    return false;
  }
}

/**
 * Update internal authentication state
 */
function updateSigninStatus(isSignedIn: boolean) {
  isAuthenticated = isSignedIn;
  
  if (isSignedIn) {
    currentUser = gapi.auth2.getAuthInstance().currentUser.get();
  } else {
    currentUser = null;
  }
}

/**
 * Authenticate with Google Drive
 * Returns true if authentication was successful
 */
export async function authenticateWithGoogleDrive(): Promise<boolean> {
  if (!isInitialized) {
    await initGoogleDriveAPI();
  }
  
  if (isAuthenticated) return true;
  
  try {
    await gapi.auth2.getAuthInstance().signIn();
    return isAuthenticated;
  } catch (error) {
    console.error("Authentication failed:", error);
    return false;
  }
}

/**
 * Sign out from Google Drive
 */
export function signOutFromGoogleDrive() {
  if (!isInitialized) return;
  gapi.auth2.getAuthInstance().signOut();
}

/**
 * Get list of files from a specific Google Drive folder
 * 
 * @param folderId The Google Drive folder ID
 * @returns Array of file metadata objects
 */
export async function listFilesInFolder(folderId: string): Promise<any[]> {
  if (!isInitialized) {
    await initGoogleDriveAPI();
  }
  
  if (!isAuthenticated) {
    const authSuccess = await authenticateWithGoogleDrive();
    if (!authSuccess) {
      throw new Error("Authentication required to access Google Drive files");
    }
  }
  
  try {
    // Query for files in the specified folder
    const response = await gapi.client.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webContentLink, webViewLink, thumbnailLink, createdTime, size)',
      orderBy: 'name'
    });
    
    return response.result.files || [];
  } catch (error) {
    console.error("Failed to list files in folder:", error);
    throw error;
  }
}

/**
 * Get a direct streaming URL for a specific file
 * 
 * @param fileId The Google Drive file ID
 * @returns Direct streaming URL with access token
 */
export async function getStreamingUrlWithToken(fileId: string): Promise<string> {
  if (!isInitialized) {
    await initGoogleDriveAPI();
  }
  
  if (!isAuthenticated) {
    const authSuccess = await authenticateWithGoogleDrive();
    if (!authSuccess) {
      throw new Error("Authentication required to access Google Drive files");
    }
  }
  
  try {
    // Get the OAuth token
    const authInstance = gapi.auth2.getAuthInstance();
    const currentUser = authInstance.currentUser.get();
    const authResponse = currentUser.getAuthResponse();
    const accessToken = authResponse.access_token;
    
    // Construct streaming URL with access token
    return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&access_token=${accessToken}`;
  } catch (error) {
    console.error("Failed to get streaming URL with token:", error);
    throw error;
  }
}

/**
 * Copy a file from one Google Drive folder to another
 * 
 * @param fileId The source file ID
 * @param destinationFolderId The destination folder ID
 * @returns Metadata of the newly created file
 */
export async function copyFileToDriveFolder(
  fileId: string, 
  destinationFolderId: string
): Promise<any> {
  if (!isInitialized) {
    await initGoogleDriveAPI();
  }
  
  if (!isAuthenticated) {
    const authSuccess = await authenticateWithGoogleDrive();
    if (!authSuccess) {
      throw new Error("Authentication required to access Google Drive files");
    }
  }
  
  try {
    // First, make a copy of the file
    const copyResponse = await gapi.client.drive.files.copy({
      fileId: fileId,
      fields: 'id,name,mimeType,parents'
    });
    
    const newFileId = copyResponse.result.id;
    
    // Then move the copy to the destination folder
    const updateResponse = await gapi.client.drive.files.update({
      fileId: newFileId,
      addParents: destinationFolderId,
      removeParents: copyResponse.result.parents?.join(','),
      fields: 'id,name,mimeType,parents,webContentLink,webViewLink'
    });
    
    return updateResponse.result;
  } catch (error) {
    console.error("Failed to copy file to destination folder:", error);
    throw error;
  }
}

/**
 * Get thumbnail URL for a Google Drive file
 * 
 * @param fileId The Google Drive file ID
 * @returns Thumbnail URL
 */
export function getThumbnailUrl(fileId: string): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1920`;
}

/**
 * Check if the user is authenticated with Google Drive
 */
export function isUserAuthenticated(): boolean {
  return isAuthenticated;
}

/**
 * Get current authenticated user information
 */
export function getCurrentUser(): gapi.auth2.GoogleUser | null {
  return currentUser;
}

// Export a default object for easier imports
export default {
  initGoogleDriveAPI,
  authenticateWithGoogleDrive,
  signOutFromGoogleDrive,
  listFilesInFolder,
  getStreamingUrlWithToken,
  copyFileToDriveFolder,
  getThumbnailUrl,
  isUserAuthenticated,
  getCurrentUser
};