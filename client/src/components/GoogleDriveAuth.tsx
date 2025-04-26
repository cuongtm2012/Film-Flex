import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { LogIn, LogOut } from 'lucide-react';
import { authenticateDrive } from '@/lib/driveHelper';
import googleDriveService from '@/lib/googleDriveService';
import { useToast } from '@/hooks/use-toast';

interface GoogleDriveAuthProps {
  onSuccess?: () => void;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost' | 'link' | 'destructive';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
}

/**
 * A component to handle Google Drive authentication
 * Shows sign-in or sign-out button based on authentication state
 */
export default function GoogleDriveAuth({ 
  onSuccess, 
  variant = 'default',
  size = 'default',
  className = ''
}: GoogleDriveAuthProps) {
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(googleDriveService.isUserAuthenticated());
  const [showConfigHelp, setShowConfigHelp] = useState(false);
  const { toast } = useToast();

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    
    try {
      const success = await authenticateDrive();
      
      if (success) {
        setIsAuthenticated(true);
        setShowConfigHelp(false);
        toast({
          title: "Authentication successful",
          description: "You are now authenticated with Google Drive",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        // Get last error from the console if available
        const errorMessage = window.gapi && window.gapi.auth2 && window.gapi.auth2.getAuthInstance() 
          ? "Please check if your domain is authorized in Google Console." 
          : "Failed to authenticate with Google Drive";
        
        // Show configuration help dialog
        setShowConfigHelp(true);
        
        toast({
          title: "Authentication failed",
          description: errorMessage,
          variant: "destructive"
        });
      }
    } catch (error: any) {
      console.error('Authentication error:', error);
      
      // Provide more informative error message based on common error types
      let errorDescription = "An error occurred during authentication";
      
      if (error && error.details) {
        if (error.details.includes("Not a valid origin for the client")) {
          errorDescription = "This domain is not authorized in the Google Cloud Console.";
          setShowConfigHelp(true);
        } else if (error.details.includes("idpiframe_initialization_failed")) {
          errorDescription = "Failed to initialize Google authentication. Please check your configuration.";
          setShowConfigHelp(true);
        }
      }
      
      toast({
        title: "Authentication error",
        description: errorDescription,
        variant: "destructive"
      });
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleSignOut = async () => {
    try {
      googleDriveService.signOutFromGoogleDrive();
      setIsAuthenticated(false);
      toast({
        title: "Signed out",
        description: "You have been signed out from Google Drive",
      });
    } catch (error) {
      console.error('Sign out error:', error);
      toast({
        title: "Sign out error",
        description: "An error occurred during sign out",
        variant: "destructive"
      });
    }
  };

  // Handle closing the config help dialog
  const handleCloseConfigHelp = () => {
    setShowConfigHelp(false);
  };
  
  return (
    <>
      {isAuthenticated ? (
        <Button
          variant={variant}
          size={size}
          className={className}
          onClick={handleSignOut}
          disabled={isAuthenticating}
        >
          <LogOut className="h-4 w-4 mr-2" />
          Disconnect Drive
        </Button>
      ) : (
        <>
          <Button
            variant={variant}
            size={size}
            className={className}
            onClick={handleSignIn}
            disabled={isAuthenticating}
          >
            {isAuthenticating ? (
              <span className="flex items-center">
                <span className="animate-spin h-4 w-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                Authenticating...
              </span>
            ) : (
              <>
                <LogIn className="h-4 w-4 mr-2" />
                Connect to Drive
              </>
            )}
          </Button>
          
          {/* Configuration Help Dialog */}
          {showConfigHelp && (
            <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
              <div className="bg-zinc-900 rounded-lg max-w-2xl w-full p-6 shadow-xl">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-xl font-semibold">Google Drive Configuration Required</h3>
                  <button onClick={handleCloseConfigHelp} className="text-gray-400 hover:text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
                
                <div className="text-gray-300 space-y-4">
                  <p>
                    Your domain needs to be authorized in the Google Cloud Console to use Google Drive integration.
                    Follow these steps to configure your Google API credentials correctly:
                  </p>
                  
                  <ol className="list-decimal pl-5 space-y-2">
                    <li>Go to the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Google Cloud Console</a></li>
                    <li>Select your project</li>
                    <li>Go to "Credentials" and find your OAuth 2.0 Client ID</li>
                    <li>Click "Edit" on the OAuth client</li>
                    <li>Under "Authorized JavaScript origins", add your domain:
                      <div className="bg-zinc-800 p-2 rounded-md mt-1 text-sm font-mono">
                        {window.location.origin}
                      </div>
                    </li>
                    <li>Click "Save" to apply the changes</li>
                    <li>This change may take a few minutes to propagate</li>
                  </ol>
                  
                  <p className="text-yellow-400">
                    After making these changes, refresh this page and try connecting again.
                  </p>
                  
                  <div className="bg-zinc-800 p-3 rounded-md text-sm">
                    <p className="font-semibold mb-1">Technical Details:</p>
                    <p>Client ID: {import.meta.env.VITE_FIREBASE_CLIENT_ID || 'Not configured'}</p>
                    <p>Current Origin: {window.location.origin}</p>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end space-x-3">
                  <Button variant="outline" onClick={handleCloseConfigHelp}>Close</Button>
                  <Button onClick={() => {
                    window.open('https://console.cloud.google.com/apis/credentials', '_blank');
                  }}>
                    Open Google Console
                  </Button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  );
}