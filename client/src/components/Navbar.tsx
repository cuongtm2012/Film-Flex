import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Search } from "lucide-react";

const Navbar = () => {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  const isActive = (path: string) => {
    return location === path ? "text-white font-medium" : "text-gray-300 hover:text-white";
  };

  return (
    <header className="bg-black/90 sticky top-0 z-50 px-4 py-3">
      <div className="max-w-[1400px] mx-auto flex items-center justify-between">
        {/* Logo and Nav Links */}
        <div className="flex items-center space-x-6">
          <Link href="/">
            <a className="text-[#E50914] text-2xl font-bold">FilmFlex</a>
          </Link>
          <Link href="/">
            <a className={isActive("/")}>Home</a>
          </Link>
          <Link href="/movies">
            <a className={isActive("/movies")}>Movies</a>
          </Link>
          <Link href="/tv-shows">
            <a className={isActive("/tv-shows")}>TV Shows</a>
          </Link>
          <Link href="/genres">
            <a className={isActive("/genres")}>Genres</a>
          </Link>
          <Link href="/my-list">
            <a className={isActive("/my-list")}>My List</a>
          </Link>
        </div>
        
        {/* Search and User */}
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative">
            <div className="relative flex items-center">
              <input
                type="text"
                placeholder="Search movies..."
                className="bg-[#141414] border border-gray-700 rounded py-1 px-8 text-sm w-44 focus:outline-none focus:border-gray-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Search className="absolute left-2 h-4 w-4 text-gray-400" />
              {searchQuery && (
                <button 
                  type="submit"
                  className="absolute right-2 text-xs bg-red-600 rounded px-2 py-0.5 text-white"
                >
                  Search
                </button>
              )}
            </div>
          </form>
          
          <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center cursor-pointer">
            <span className="text-white font-medium">U</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;
