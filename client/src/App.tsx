import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import MovieDetails from "@/pages/MovieDetails";
import WatchMovie from "@/pages/WatchMovie";
import Search from "@/pages/Search";
import GenreMovies from "@/pages/GenreMovies";
import MyList from "@/pages/MyList";
import AuthPage from "@/pages/auth-page";
import Profile from "@/pages/Profile";
import TrendingMovies from "@/pages/TrendingMovies";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/movie/:id" component={MovieDetails} />
      <Route path="/watch/:id" component={WatchMovie} />
      <Route path="/search" component={Search} />
      <Route path="/genre/:id" component={GenreMovies} />
      <Route path="/genres" component={GenreMovies} />
      <ProtectedRoute path="/my-list" component={MyList} />
      <ProtectedRoute path="/profile" component={Profile} />
      <ProtectedRoute path="/trending" component={TrendingMovies} />
      <Route path="/auth" component={AuthPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <Router />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
