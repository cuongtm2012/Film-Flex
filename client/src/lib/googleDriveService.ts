// A service to interact with Google Drive API to fetch movie data
import axios from 'axios';

// Type definitions for drive response
export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  webViewLink?: string;
  thumbnailLink?: string;
  videoMediaMetadata?: {
    width: number;
    height: number;
    durationMillis: string;
  };
  fileExtension?: string;
  size?: string;
  createdTime?: string;
}

export interface DriveFolder {
  id: string;
  name: string;
  files: DriveFile[];
}

// Function to get a public shared folder content
export async function getDriveFolderContent(folderId: string): Promise<DriveFolder | null> {
  try {
    const response = await axios.get(
      `https://www.googleapis.com/drive/v3/files?q='${folderId}'+in+parents&key=${import.meta.env.GOOGLE_API_KEY}&fields=files(id,name,mimeType,webViewLink,thumbnailLink,videoMediaMetadata,fileExtension,size,createdTime)&orderBy=name`
    );

    if (response.data && response.data.files) {
      // Get the folder name
      const folderResponse = await axios.get(
        `https://www.googleapis.com/drive/v3/files/${folderId}?key=${import.meta.env.GOOGLE_API_KEY}&fields=name`
      );
      
      return {
        id: folderId,
        name: folderResponse.data.name || 'Movies Folder',
        files: response.data.files.filter((file: DriveFile) => 
          // Filter for video files
          file.mimeType.includes('video') || 
          (file.fileExtension && ['mp4', 'mkv', 'avi', 'mov', 'webm'].includes(file.fileExtension.toLowerCase()))
        )
      };
    }
    return null;
  } catch (error) {
    console.error("Error fetching Google Drive content:", error);
    throw error;
  }
}

// Helper function to get direct streaming URL for a file
export function getStreamUrl(fileId: string): string {
  return `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media&key=${import.meta.env.GOOGLE_API_KEY}`;
}

// Function to parse movie information from filename 
// Assuming format: "Movie Title (YEAR) [OPTIONAL_INFO].extension"
export function parseMovieInfo(filename: string): { 
  title: string; 
  year?: number;
  additionalInfo?: string;
} {
  // Remove file extension
  const nameWithoutExtension = filename.replace(/\.[^/.]+$/, "");
  
  // Extract year if present in format (YYYY)
  const yearMatch = nameWithoutExtension.match(/\((\d{4})\)/);
  let year: number | undefined = undefined;
  if (yearMatch && yearMatch[1]) {
    year = parseInt(yearMatch[1], 10);
  }
  
  // Extract additional info in square brackets [INFO]
  const additionalInfoMatch = nameWithoutExtension.match(/\[(.*?)\]/);
  let additionalInfo: string | undefined = undefined;
  if (additionalInfoMatch && additionalInfoMatch[1]) {
    additionalInfo = additionalInfoMatch[1];
  }
  
  // Get title by removing year and additional info
  let title = nameWithoutExtension
    .replace(/\(\d{4}\)/, '')  // Remove year
    .replace(/\[.*?\]/, '')    // Remove additional info
    .trim();
    
  return { title, year, additionalInfo };
}

// Convert DriveFile to Movie format for our app
export function convertDriveFileToMovie(file: DriveFile): any {
  const { title, year } = parseMovieInfo(file.name);
  
  // Generate a movie object compatible with our app's Movie type
  return {
    id: parseInt(file.id.substring(0, 8), 16) % 10000, // Generate a numeric ID from Drive ID
    title,
    description: `Watch ${title} on FilmFlex.`,
    releaseYear: year || new Date().getFullYear(),
    duration: file.videoMediaMetadata 
      ? Math.floor(parseInt(file.videoMediaMetadata.durationMillis) / 60000) 
      : 120, // Duration in minutes or default
    posterUrl: file.thumbnailLink || 'https://via.placeholder.com/300x450?text=No+Thumbnail',
    backdropUrl: file.thumbnailLink || 'https://via.placeholder.com/1280x720?text=No+Preview',
    rating: 'PG-13',
    videoSources: [
      {
        quality: 'HD',
        url: getStreamUrl(file.id)
      }
    ],
    genreIds: [1], // Default to Action genre
    director: 'Unknown Director',
    cast: ['Actor 1', 'Actor 2'],
    imdbRating: '7.5',
    viewCount: 0
  };
}