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
  const { toast } = useToast();

  const handleSignIn = async () => {
    setIsAuthenticating(true);
    
    try {
      const success = await authenticateDrive();
      
      if (success) {
        setIsAuthenticated(true);
        toast({
          title: "Authentication successful",
          description: "You are now authenticated with Google Drive",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        toast({
          title: "Authentication failed",
          description: "Failed to authenticate with Google Drive",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Authentication error:', error);
      toast({
        title: "Authentication error",
        description: "An error occurred during authentication",
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
      )}
    </>
  );
}