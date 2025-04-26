import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

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
    return location === path ? "text-white font-medium" : "text-gray-400 hover:text-white";
  };

  return (
    <header className="bg-[#141414] sticky top-0 z-50">
      <nav className="flex items-center justify-between px-4 py-3 lg:px-8 border-b border-[#222]">
        <div className="flex items-center">
          <Link href="/">
            <a className="text-[#E50914] text-2xl font-bold font-sans mr-8">FilmFlex</a>
          </Link>
          <div className="hidden md:flex space-x-6">
            <Link href="/">
              <a className={isActive("/") + " text-sm"}>Home</a>
            </Link>
            <Link href="/movies">
              <a className={isActive("/movies") + " text-sm"}>Movies</a>
            </Link>
            <Link href="/tv-shows">
              <a className={isActive("/tv-shows") + " text-sm"}>TV Shows</a>
            </Link>
            <Link href="/genres">
              <a className={isActive("/genres") + " text-sm"}>Genres</a>
            </Link>
            <Link href="/my-list">
              <a className={isActive("/my-list") + " text-sm"}>My List</a>
            </Link>
          </div>
        </div>
        <div className="flex items-center space-x-4">
          <form onSubmit={handleSearch} className="relative">
            <Input
              type="text"
              placeholder="Search movies..."
              className="bg-[#222] py-1.5 px-3 rounded text-sm w-40 lg:w-60 focus:outline-none focus:ring-1 focus:ring-[#E50914]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Search className="absolute right-3 top-2 h-4 w-4 text-gray-400" />
          </form>
          <div className="flex items-center space-x-4">
            <button className="text-white">
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </button>
            <div className="h-8 w-8 rounded-full bg-[#E50914] flex items-center justify-center cursor-pointer">
              <span className="text-white text-sm font-medium">U</span>
            </div>
          </div>
        </div>
      </nav>
      <div className="md:hidden flex overflow-x-auto scrollbar-hide py-2 px-4 space-x-5 border-b border-[#222]">
        <Link href="/">
          <a className={isActive("/") + " text-sm whitespace-nowrap"}>Home</a>
        </Link>
        <Link href="/movies">
          <a className={isActive("/movies") + " text-sm whitespace-nowrap"}>Movies</a>
        </Link>
        <Link href="/tv-shows">
          <a className={isActive("/tv-shows") + " text-sm whitespace-nowrap"}>TV Shows</a>
        </Link>
        <Link href="/genres">
          <a className={isActive("/genres") + " text-sm whitespace-nowrap"}>Genres</a>
        </Link>
        <Link href="/my-list">
          <a className={isActive("/my-list") + " text-sm whitespace-nowrap"}>My List</a>
        </Link>
        <Link href="/new-releases">
          <a className={isActive("/new-releases") + " text-sm whitespace-nowrap"}>New Releases</a>
        </Link>
      </div>
    </header>
  );
};

export default Navbar;
