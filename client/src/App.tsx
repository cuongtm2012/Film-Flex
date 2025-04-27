import { useState, useEffect } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import NewHomePage from "@/pages/NewHomePage";
import MovieDetails from "@/pages/MovieDetails";
import WatchMovie from "@/pages/WatchMovie";
import Search from "@/pages/Search";
import GenreMovies from "@/pages/GenreMovies";
import MyList from "@/pages/MyList";
import AuthPage from "@/pages/auth-page";
import Profile from "@/pages/Profile";
import TrendingMovies from "@/pages/TrendingMovies";
import DriveMovies from "@/pages/DriveMovies";
import PremiumComparison from "@/pages/PremiumComparison";
import AdminDashboard from "@/pages/admin/Dashboard";
import { AuthProvider } from "@/hooks/use-auth";
import { LanguageProvider } from "@/hooks/use-language";
import { AccessibilityProvider } from "@/hooks/use-accessibility";
import { ProtectedRoute } from "@/lib/protected-route";
import { AdminRoute } from "@/lib/admin-route";
import { initializeDriveAPI } from "@/lib/driveHelper";
import AccessibilityControls from "@/components/AccessibilityControls";

function Router() {
  return (
    <Switch>
      <Route path="/" component={NewHomePage} />
      <Route path="/old-home" component={Home} />
      <Route path="/movie/:id" component={MovieDetails} />
      <Route path="/watch/:id" component={WatchMovie} />
      <Route path="/search" component={Search} />
      <Route path="/genre/:id" component={GenreMovies} />
      <Route path="/genres" component={GenreMovies} />
      <Route path="/drive-movies" component={DriveMovies} />
      <Route path="/premium" component={PremiumComparison} />
      <ProtectedRoute path="/my-list" component={MyList} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/trending" component={TrendingMovies} />
      <AdminRoute path="/admin" component={AdminDashboard} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [driveInitialized, setDriveInitialized] = useState(false);
  const [driveError, setDriveError] = useState<string | null>(null);

  // Initialize Google Drive API on component mount
  useEffect(() => {
    const initDrive = async () => {
      try {
        const initialized = await initializeDriveAPI();
        setDriveInitialized(initialized);
        if (!initialized) {
          console.warn('Failed to initialize Google Drive API');
          setDriveError('Could not initialize Google Drive API');
        }
      } catch (error) {
        console.error('Error initializing Google Drive API:', error);
        setDriveError('Error initializing Google Drive API');
      }
    };

    initDrive();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <LanguageProvider>
          <AuthProvider>
            <AccessibilityProvider>
              {/* Skip to content link for keyboard users */}
              <a href="#main-content" className="skip-to-content">
                Skip to content
              </a>
              
              <Toaster />
              <main id="main-content">
                <Router />
              </main>
              
              {/* Accessibility Controls */}
              <AccessibilityControls />
            </AccessibilityProvider>
          </AuthProvider>
        </LanguageProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
