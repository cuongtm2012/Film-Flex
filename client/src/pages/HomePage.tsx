import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, User, Film, ChevronRight
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Pagination } from '@/components/ui/pagination';

// Define Movie interface
interface Movie {
  id: number;
  title: string;
  description: string;
  posterUrl: string;
  backdropUrl: string;
  releaseYear: number;
  genreIds: number[];
  director?: string;
  cast?: string[];
  imdbRating?: number;
  viewCount?: number;
  matchPercentage?: number;
  trailerUrl?: string;
  duration?: number;
  videoUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

// Define Category interface
interface Category {
  id: number;
  name: string;
  slug: string;
  createdAt?: string;
  updatedAt?: string;
}

// Define API response interface with pagination
interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    current_page: number;
    total_pages: number;
    total: number;
    per_page: number;
  };
}

// Movie card component
const MovieCard = ({ movie }: { movie: Movie }) => {
  // Handle missing fields with fallback values
  const posterUrl = movie.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster';
  const imdbRating = movie.imdbRating || '0.0';
  const duration = typeof movie.duration === 'number' ? `${movie.duration} min` : '90 min';
  const releaseYear = movie.releaseYear || 2023;
  
  return (
    <Link href={`/movie/${movie.id}`}>
      <div className="group cursor-pointer">
        <div className="overflow-hidden rounded-lg relative">
          <img 
            src={posterUrl} 
            alt={movie.title} 
            className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
            onError={(e) => {
              const target = e.target as HTMLImageElement;
              target.src = 'https://via.placeholder.com/300x450?text=Error';
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
            <div>
              <div className="text-xs text-yellow-400 flex items-center mb-1">
                <span className="mr-1">★</span> {imdbRating}
              </div>
              <div className="text-xs text-white/80">
                {duration} | {releaseYear}
              </div>
            </div>
          </div>
        </div>
        <h3 className="mt-2 text-white text-sm font-medium truncate">{movie.title}</h3>
        <div className="text-xs text-gray-400">{releaseYear}</div>
      </div>
    </Link>
  );
};

// Main component
const HomePage = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  // Fetch categories from API
  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery<Category[]>({
    queryKey: ['/api/categories'],
    staleTime: 60 * 60 * 1000, // Cache for 1 hour
  });
  
  // Handle category change
  const handleCategoryChange = (categorySlug: string) => {
    setSelectedCategory(categorySlug);
    setCurrentPage(1); // Reset to first page when changing category
  };
  
  // Fetch movies from API with pagination
  const { data: moviesData, isLoading: isMoviesLoading } = useQuery<PaginatedResponse<Movie>>({
    queryKey: [
      '/api/movies',
      selectedCategory,
      currentPage
    ],
    queryFn: async () => {
      console.log(`Fetching movies: category=${selectedCategory}, page=${currentPage}`);
      
      let url = '';
      if (selectedCategory === 'all') {
        url = `/api/movies?page=${currentPage}&limit=50`;
      } else if (searchQuery) {
        url = `/api/search?q=${encodeURIComponent(searchQuery)}&page=${currentPage}&limit=50`;
      } else {
        url = `/api/genre/${selectedCategory}/movies?page=${currentPage}&limit=50`;
      }
      
      console.log(`API URL: ${url}`);
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Failed to fetch movies');
      }
      
      const data = await response.json();
      console.log('Movie data received:', data);
      return data;
    },
    staleTime: 60 * 1000, // Cache for 1 minute
  });
  
  // Combined loading state
  const isLoading = isMoviesLoading || isCategoriesLoading;
  
  // Get movies from the response or empty array
  const movies = moviesData?.data || [];
  
  // Get pagination data
  const totalPages = moviesData?.pagination?.total_pages || 1;
  
  // Categories list with "All" option
  const categories = [
    { id: 0, name: 'All', slug: 'all' },
    ...(categoriesData || [])
  ];
  
  // Handle search submission
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    // The query will refetch automatically due to the dependency on searchQuery
  };
  
  return (
    <div className="min-h-screen bg-[#111827] text-white">
      {/* Header */}
      <header className="bg-zinc-900 border-b border-zinc-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/">
              <div className="flex items-center cursor-pointer">
                <Film className="h-8 w-8 text-red-600 mr-2" />
                <span className="text-xl font-bold">FilmFlex</span>
              </div>
            </Link>
            
            {/* Navigation for desktop */}
            <nav className="hidden md:flex space-x-6">
              <Link href="/genres">
                <a className="text-gray-300 hover:text-white transition-colors">Genres</a>
              </Link>
              <Link href="/movies">
                <a className="text-gray-300 hover:text-white transition-colors">Movies</a>
              </Link>
              <Link href="/series">
                <a className="text-gray-300 hover:text-white transition-colors">Series</a>
              </Link>
            </nav>
            
            {/* Search and user */}
            <div className="flex items-center space-x-4">
              <form onSubmit={handleSearch} className="relative">
                <input
                  type="text"
                  placeholder="Search movies..."
                  className="py-2 pl-10 pr-4 bg-zinc-800 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 w-48 md:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </form>
              
              {user ? (
                <Link href="/profile">
                  <div className="p-2 rounded-full bg-zinc-800 hover:bg-zinc-700 cursor-pointer">
                    <User className="h-5 w-5 text-white" />
                  </div>
                </Link>
              ) : (
                <Link href="/auth">
                  <button className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors">
                    Sign In
                  </button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>
      
      <main>
        {/* Hero section */}
        <section className="relative h-[40vh] bg-gradient-to-r from-black to-zinc-900 flex items-center">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to FilmFlex</h1>
            <p className="text-xl text-gray-300 max-w-2xl mb-8">
              Discover thousands of movies and TV shows ready to stream. Your entertainment journey starts here.
            </p>
            <Link href="/movies">
              <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md text-lg font-medium transition-colors flex items-center">
                Browse Movies <ChevronRight className="ml-2 h-5 w-5" />
              </button>
            </Link>
          </div>
          <div className="absolute inset-0 bg-black/60 z-0"></div>
          <div className="absolute inset-0 bg-gradient-to-t from-[#111827] via-transparent to-transparent z-0"></div>
        </section>
        
        {/* Category filter */}
        <section className="max-w-7xl mx-auto px-4 mt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Movies &amp; TV Shows</h2>
            <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
              {categories.map(category => (
                <button
                  key={category.id}
                  onClick={() => handleCategoryChange(category.slug)}
                  className={`px-4 py-2 rounded-full whitespace-nowrap text-sm ${
                    selectedCategory === category.slug
                      ? 'bg-red-600 text-white'
                      : 'bg-zinc-800 text-gray-300 hover:bg-zinc-700'
                  }`}
                >
                  {category.name}
                </button>
              ))}
            </div>
          </div>
          
          {/* Movie grid */}
          {isLoading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 animate-pulse">
              {[...Array(10)].map((_, idx) => (
                <div key={idx}>
                  <div className="bg-zinc-800 rounded-lg aspect-[2/3]"></div>
                  <div className="h-4 bg-zinc-800 rounded mt-2 w-3/4"></div>
                  <div className="h-3 bg-zinc-800 rounded mt-1 w-1/2"></div>
                </div>
              ))}
            </div>
          ) : movies.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {movies.map(movie => (
                <MovieCard key={movie.id} movie={movie} />
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-gray-400">No movies found</p>
            </div>
          )}
          
          {/* Pagination from our new shared component */}
          {!isLoading && movies.length > 0 && (
            <Pagination 
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="mt-8"
            />
          )}
        </section>
      </main>
      
      {/* Footer */}
      <footer className="bg-zinc-900 text-white border-t border-zinc-800 mt-16">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex justify-between items-center">
            <div className="flex items-center">
              <Film className="h-6 w-6 text-red-600 mr-2" />
              <span className="text-lg font-bold">FilmFlex</span>
            </div>
            <div className="text-sm text-gray-400">
              © 2025 FilmFlex. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;