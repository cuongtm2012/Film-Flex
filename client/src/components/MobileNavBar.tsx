import { Home, Search, Film, User } from "lucide-react";
import { Link, useLocation } from "wouter";

const MobileNavBar = () => {
  const [location] = useLocation();
  
  const isActive = (path: string) => {
    return location === path ? "text-white" : "text-gray-400";
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-[#222] z-30">
      <div className="flex justify-around py-3">
        <Link href="/">
          <a className={`flex flex-col items-center ${isActive("/")}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">Home</span>
          </a>
        </Link>
        <Link href="/search">
          <a className={`flex flex-col items-center ${isActive("/search")}`}>
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">Search</span>
          </a>
        </Link>
        <Link href="/library">
          <a className={`flex flex-col items-center ${isActive("/library")}`}>
            <Film className="h-5 w-5" />
            <span className="text-xs mt-1">Library</span>
          </a>
        </Link>
        <Link href="/account">
          <a className={`flex flex-col items-center ${isActive("/account")}`}>
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">Account</span>
          </a>
        </Link>
      </div>
    </div>
  );
};

export default MobileNavBar;
