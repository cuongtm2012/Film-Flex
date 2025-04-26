import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useLocation, Link } from "wouter";
import { Movie } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import MovieCard from "@/components/MovieCard";
import Navbar from "@/components/Navbar";
import { apiRequest } from "@/lib/queryClient";

export default function TrendingMovies() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  
  // Redirect to profile page if not a premium user
  useEffect(() => {
    if (user && user.userType !== "premium") {
      setLocation("/profile");
    }
  }, [user, setLocation]);
  
  // Fetch trending movies (premium content)
  const { data: trendingMovies, isLoading, error } = useQuery<Movie[]>({
    queryKey: ["/api/premium/trending"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/premium/trending");
      return await res.json();
    },
    enabled: !!user && user.userType === "premium",
  });
  
  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto py-8 px-4">
          <div className="flex justify-center items-center h-[60vh]">
            <Loader2 className="h-8 w-8 animate-spin text-red-600" />
          </div>
        </main>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto py-8 px-4">
          <Alert variant="destructive" className="mb-6">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              {(error as Error).message || "Failed to load trending movies"}
            </AlertDescription>
          </Alert>
          <Button asChild>
            <Link to="/">Back to Home</Link>
          </Button>
        </main>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />
      <main className="flex-1 container mx-auto py-8 px-4">
        <div className="flex flex-col">
          <h1 className="text-3xl font-bold mb-2">Trending Now</h1>
          <p className="text-muted-foreground mb-6">
            Exclusive content for premium members
          </p>
          <Separator className="mb-6" />
          
          {trendingMovies && trendingMovies.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
              {trendingMovies.map((movie) => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16">
              <p className="text-xl text-muted-foreground mb-6">No trending movies found</p>
              <Button asChild>
                <Link to="/">Back to Home</Link>
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}