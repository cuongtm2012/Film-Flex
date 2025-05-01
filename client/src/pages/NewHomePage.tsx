import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, User, Film, Tv, Map, Users, Calendar, 
  Smartphone, ChevronLeft, ChevronRight, Facebook, 
  Twitter, Instagram, Youtube, Github, Loader2
} from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { API_BASE_URL, Movie } from '@/lib/constants';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';

// Define Category interface
interface Category {
  id: number;
  name: string;
  slug: string;
  createdAt: string;
  updatedAt: string;
}

// Footer component
const Footer = () => {
  return (
    <footer className="bg-zinc-900 text-white border-t border-zinc-800 mt-10">
      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1 - Logo and description */}
          <div>
            <Link href="/">
              <div className="flex items-center mb-4 cursor-pointer">
                <Film className="h-8 w-8 text-red-600 mr-2" />
                <span className="text-xl font-bold">FilmFlex</span>
              </div>
            </Link>
            <p className="text-gray-400 text-sm">
              Your ultimate streaming platform with thousands of movies and TV shows, 
              updated daily with the latest releases.
            </p>
          </div>
          
          {/* Column 2 - Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Company</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/about">
                  <a className="text-gray-400 hover:text-white text-sm transition-colors">About Us</a>
                </Link>
              </li>
              <li>
                <Link href="/contact">
                  <a className="text-gray-400 hover:text-white text-sm transition-colors">Contact</a>
                </Link>
              </li>
              <li>
                <Link href="/careers">
                  <a className="text-gray-400 hover:text-white text-sm transition-colors">Careers</a>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 3 - Support */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Support</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/faq">
                  <a className="text-gray-400 hover:text-white text-sm transition-colors">FAQs</a>
                </Link>
              </li>
              <li>
                <Link href="/terms">
                  <a className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Use</a>
                </Link>
              </li>
              <li>
                <Link href="/privacy">
                  <a className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Column 4 - Social media */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Follow Us</h3>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Facebook className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Twitter className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Instagram className="h-6 w-6" />
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <Youtube className="h-6 w-6" />
              </a>
            </div>
            <div className="mt-4">
              <a href="#" className="inline-block bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors text-sm">
                Download Mobile App
              </a>
            </div>
          </div>
        </div>
        
        {/* Copyright */}
        <div className="border-t border-zinc-800 mt-8 pt-8 text-center text-gray-500 text-sm">
          <p>© 2025 FilmFlex. All Rights Reserved.</p>
          <p className="mt-2">FilmFlex offers streaming of movies and TV shows for entertainment purposes only. All content rights belong to their respective owners.</p>
        </div>
      </div>
    </footer>
  );
};

// Movie card component
const MovieCard = ({ movie }: { movie: Movie }) => {
  // Handle missing fields with fallback values
  const posterUrl = movie.posterUrl || 'https://via.placeholder.com/300x450?text=No+Poster';
  const imdbRating = movie.imdbRating || '0.0';
  const duration = typeof movie.duration === 'number' ? `${movie.duration} min` : (movie.duration || '90 min');
  const releaseYear = movie.releaseYear || 2023;
  
  // Check if it's an API movie (handle specific properties if needed)
  const isApiMovie = movie.id > 10000; // We added 10000 to API movie IDs
  
  return (
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
            {isApiMovie && (
              <div className="text-xs text-purple-400 mt-1">
                API Source
              </div>
            )}
          </div>
        </div>
      </div>
      <h3 className="mt-2 text-white text-sm font-medium truncate">{movie.title}</h3>
      <div className="text-xs text-gray-400">{releaseYear}</div>
    </div>
  );
};

// Pagination component
const Pagination = ({ currentPage, totalPages, onChange }: { 
  currentPage: number;
  totalPages: number;
  onChange: (page: number) => void;
}) => {
  return (
    <div className="flex items-center justify-center space-x-2 mt-10">
      <button 
        onClick={() => onChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="p-2 rounded-full bg-zinc-800 text-white disabled:opacity-50"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      
      {Array.from({ length: Math.min(5, totalPages) }).map((_, idx) => {
        const pageNum = idx + 1;
        return (
          <button 
            key={idx}
            onClick={() => onChange(pageNum)}
            className={`w-10 h-10 rounded-full ${
              pageNum === currentPage 
                ? 'bg-red-600 text-white' 
                : 'bg-zinc-800 text-white hover:bg-zinc-700'
            }`}
          >
            {pageNum}
          </button>
        );
      })}
      
      {totalPages > 5 && (
        <span className="text-gray-500">...</span>
      )}
      
      {totalPages > 5 && (
        <button 
          onClick={() => onChange(totalPages)}
          className={`w-10 h-10 rounded-full ${
            totalPages === currentPage 
              ? 'bg-red-600 text-white' 
              : 'bg-zinc-800 text-white hover:bg-zinc-700'
          }`}
        >
          {totalPages}
        </button>
      )}
      
      <button 
        onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="p-2 rounded-full bg-zinc-800 text-white disabled:opacity-50"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
};

// This interface is unused since the API returns an array directly
// interface MovieWithPagination {
//   movies: Movie[];
//   total: number;
//   totalPages: number;
// }


// Main component
const NewHomePage = () => {
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
  
  // Fetch movies from API
  const { data: moviesData, isLoading: isMoviesLoading } = useQuery<Movie[]>({
    queryKey: [
      '/api/movies',
      selectedCategory,
      currentPage
    ],
    queryFn: async () => {
      console.log(`Fetching movies: category=${selectedCategory}, page=${currentPage}`);
      const url = selectedCategory === 'all'
        ? `${API_BASE_URL}/movies?source=all&page=${currentPage}`
        : `${API_BASE_URL}/categories/${selectedCategory}/movies?page=${currentPage}`;
      
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
  
  // Get movies from the response or empty array - since the API returns an array directly
  const movies = moviesData || [];
  
  // Fixed number of pages for now - we can enhance this later with proper pagination from API
  const totalPages = 10;
  
  // Categories list with "All" option
  const categories = [
    { id: 0, name: 'All', slug: 'all', createdAt: '', updatedAt: '' },
    ...(categoriesData || [])
  ];
  
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
            
            {/* Navigation */}
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
              <Link href="/countries">
                <a className="text-gray-300 hover:text-white transition-colors">Countries</a>
              </Link>
              <Link href="/actors">
                <a className="text-gray-300 hover:text-white transition-colors">Actors</a>
              </Link>
              <Link href="/schedule">
                <a className="text-gray-300 hover:text-white transition-colors">Schedule</a>
              </Link>
              <Link href="/app">
                <a className="text-gray-300 hover:text-white transition-colors">Mobile App</a>
              </Link>
            </nav>
            
            {/* Search and user */}
            <div className="flex items-center space-x-4">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search movies, actors..."
                  className="py-2 pl-10 pr-4 bg-zinc-800 rounded-full text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-600 w-48 md:w-64"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              </div>
              
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
        <section className="relative h-[50vh] bg-gradient-to-r from-black to-zinc-900 flex items-center">
          <div className="max-w-7xl mx-auto px-4 relative z-10">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">Welcome to FilmFlex</h1>
            <p className="text-xl text-gray-300 max-w-2xl mb-8">
              Discover thousands of movies and TV shows ready to stream. Your entertainment journey starts here.
            </p>
            <button className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-md text-lg font-medium transition-colors">
              Get Started
            </button>
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
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
              {movies.map(movie => (
                <div key={movie.id} onClick={() => setLocation(`/movie/${movie.id}`)}>
                  <MovieCard movie={movie} />
                </div>
              ))}
            </div>
          )}
          
          {/* Pagination */}
          <Pagination 
            currentPage={currentPage}
            totalPages={totalPages}
            onChange={setCurrentPage}
          />
        </section>
      </main>
      
      {/* Footer */}
      <Footer />
    </div>
  );
};

export default NewHomePage;