import { Link, useLocation } from "wouter";
import { useState } from "react";
import { Search, LogOut, User, Wallet, Bookmark } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

const Navbar = () => {
  const [location, setLocation] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const { user, logoutMutation } = useAuth();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setLocation(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };
  
  const handleLogout = () => {
    logoutMutation.mutate();
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
            <span className="text-[#E50914] text-2xl font-bold cursor-pointer">FilmFlex</span>
          </Link>
          <Link href="/">
            <span className={`${isActive("/")} cursor-pointer`}>Home</span>
          </Link>
          <Link href="/movies">
            <span className={`${isActive("/movies")} cursor-pointer`}>Movies</span>
          </Link>
          <Link href="/genres">
            <span className={`${isActive("/genres")} cursor-pointer`}>Genres</span>
          </Link>
          {user && (
            <Link href="/my-list">
              <span className={`${isActive("/my-list")} cursor-pointer`}>My List</span>
            </Link>
          )}
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
          
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <div className="h-8 w-8 rounded-full bg-red-600 flex items-center justify-center cursor-pointer">
                  <span className="text-white font-medium">{user.username.charAt(0).toUpperCase()}</span>
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>My Account</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>{user.username}</span>
                </DropdownMenuItem>
                <Link href="/profile" className="w-full">
                  <DropdownMenuItem>
                    <Wallet className="mr-2 h-4 w-4" />
                    <span>My Profile</span>
                  </DropdownMenuItem>
                </Link>
                <Link href="/my-list" className="w-full">
                  <DropdownMenuItem>
                    <Bookmark className="mr-2 h-4 w-4" />
                    <span>My List</span>
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link href="/auth">
              <Button variant="outline" size="sm" className="text-white border-red-600 bg-transparent hover:bg-red-600/20">
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
