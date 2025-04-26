/**
 * Type definitions for Google API Client
 */

declare namespace gapi {
  function load(apiName: string, callback: () => void): void;
  
  namespace client {
    function init(config: {
      apiKey: string;
      clientId: string;
      discoveryDocs: string[];
      scope: string;
    }): Promise<void>;
    
    namespace drive {
      namespace files {
        function list(params: {
          q?: string;
          fields?: string;
          orderBy?: string;
          pageSize?: number;
          pageToken?: string;
        }): Promise<{
          result: {
            files: Array<{
              id: string;
              name: string;
              mimeType: string;
              webContentLink?: string;
              webViewLink?: string;
              thumbnailLink?: string;
              createdTime?: string;
              size?: string;
              parents?: string[];
            }>;
            nextPageToken?: string;
          }
        }>;
        
        function copy(params: {
          fileId: string;
          fields?: string;
          resource?: any;
        }): Promise<{
          result: {
            id: string;
            name: string;
            mimeType: string;
            parents?: string[];
            [key: string]: any;
          }
        }>;
        
        function update(params: {
          fileId: string;
          addParents?: string;
          removeParents?: string;
          fields?: string;
          resource?: any;
        }): Promise<{
          result: {
            id: string;
            name: string;
            mimeType: string;
            parents?: string[];
            webContentLink?: string;
            webViewLink?: string;
            [key: string]: any;
          }
        }>;
      }
    }
  }
  
  namespace auth2 {
    function getAuthInstance(): {
      isSignedIn: {
        get(): boolean;
        listen(callback: (isSignedIn: boolean) => void): void;
      };
      signIn(options?: object): Promise<GoogleUser>;
      signOut(): Promise<void>;
      currentUser: {
        get(): GoogleUser;
      };
    };
    
    interface GoogleUser {
      getId(): string;
      getEmail(): string;
      getName(): string;
      getGivenName(): string;
      getFamilyName(): string;
      getImageUrl(): string;
      getAuthResponse(includeAuthorizationData?: boolean): {
        access_token: string;
        id_token: string;
        scope: string;
        expires_in: number;
        first_issued_at: number;
        expires_at: number;
      };
    }
  }
}