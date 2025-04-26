import { Home, Search, Film, User, FileVideo } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useLanguage } from "@/hooks/use-language";

const MobileNavBar = () => {
  const [location] = useLocation();
  const { t } = useLanguage();
  
  const isActive = (path: string) => {
    return location === path ? "text-white" : "text-gray-400";
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#181818] border-t border-[#222] z-30">
      <div className="flex justify-around py-3">
        <Link href="/">
          <div className={`flex flex-col items-center cursor-pointer ${isActive("/")}`}>
            <Home className="h-5 w-5" />
            <span className="text-xs mt-1">{t('nav.home')}</span>
          </div>
        </Link>
        <Link href="/search">
          <div className={`flex flex-col items-center cursor-pointer ${isActive("/search")}`}>
            <Search className="h-5 w-5" />
            <span className="text-xs mt-1">{t('nav.search')}</span>
          </div>
        </Link>
        <Link href="/my-list">
          <div className={`flex flex-col items-center cursor-pointer ${isActive("/my-list")}`}>
            <Film className="h-5 w-5" />
            <span className="text-xs mt-1">{t('nav.myList')}</span>
          </div>
        </Link>
        <Link href="/profile">
          <div className={`flex flex-col items-center cursor-pointer ${isActive("/profile")}`}>
            <User className="h-5 w-5" />
            <span className="text-xs mt-1">{t('nav.profile')}</span>
          </div>
        </Link>
      </div>
    </div>
  );
};

export default MobileNavBar;
