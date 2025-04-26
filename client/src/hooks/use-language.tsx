import { createContext, useState, useContext, ReactNode } from 'react';

type LanguageContextType = {
  language: 'en' | 'vi';
  setLanguage: (language: 'en' | 'vi') => void;
  t: (key: string) => string;
};

const translations = {
  en: {
    // Navbar
    'nav.home': 'Home',
    'nav.movies': 'Movies',
    'nav.myList': 'My List',
    'nav.trending': 'Trending',
    'nav.search': 'Search',
    'nav.profile': 'Profile',
    'nav.login': 'Login',
    'nav.logout': 'Logout',
    
    // Home page
    'home.featured': 'Featured',
    'home.newReleases': 'New Releases',
    'loading.movies': 'Loading movies...',
    'error.title': 'Oops!',
    'error.movies': 'We encountered an error while loading movies. Please try again later.',
    'genres.action': 'Action',
    'home.premiumContent': 'Premium Content',
    'home.premiumDescription': 'Get access to exclusive trending movies and early releases with our premium membership.',
    'home.upgradeNow': 'Upgrade Now',
    'home.viewTrending': 'View Trending',
    
    // Movie details
    'movie.cast': 'Cast',
    'movie.director': 'Director',
    'movie.play': 'Play',
    'movie.addToList': 'Add to My List',
    'movie.similar': 'Similar Movies',
    
    // Premium content
    'premium.title': 'Premium Membership',
    'premium.description': 'Get access to exclusive content and features',
    'premium.member': 'You are a Premium Member!',
    'premium.expiry': 'Your premium membership is active until',
    'premium.benefits': 'Enjoy exclusive access to trending movies, VIP membership, and 24/7 support.',
    'premium.upgrade': 'Upgrade to Premium',
    'premium.cost': 'Get exclusive access to premium content and features for only',
    'premium.perMonth': 'per month',
    'premium.benefit1': 'Access to trending and hottest movies',
    'premium.benefit2': 'VIP membership with early access to new releases',
    'premium.benefit3': '24/7 priority customer support',
    'premium.currentBalance': 'Your current balance:',
    'premium.insufficientFunds': 'You need at least 100 USDT to upgrade to premium. Please deposit more funds.',
    
    // Profile
    'profile.title': 'My Profile',
    'profile.userInfo': 'User Information',
    'profile.userDetails': 'Your account details and membership status',
    'profile.username': 'Username',
    'profile.email': 'Email',
    'profile.notSet': 'Not set',
    'profile.membership': 'Membership',
    'profile.normal': 'Normal',
    'profile.premium': 'Premium',
    'profile.viewPremium': 'View Premium Content',
    'profile.premiumExpires': 'Premium Expires',
    
    // Wallet
    'wallet.title': 'USDT Wallet',
    'wallet.description': 'Manage your crypto wallet and deposit funds',
    'wallet.currentBalance': 'Current Balance',
    'wallet.address': 'USDT Wallet Address (TRC20)',
    'wallet.enterAddress': 'Enter your USDT wallet address',
    'wallet.update': 'Update Wallet Address',
    'wallet.deposit': 'Deposit USDT',
    'wallet.amount': 'Amount (USDT)',
    'wallet.enterAmount': 'Enter amount to deposit',
    'wallet.hash': 'Transaction Hash',
    'wallet.enterHash': 'Enter the USDT transaction hash',
    'wallet.depositFunds': 'Deposit Funds',
    
    // Auth
    'auth.login': 'Login',
    'auth.register': 'Register',
    'auth.username': 'Username',
    'auth.password': 'Password',
    'auth.confirmPassword': 'Confirm Password',
    'auth.loginButton': 'Sign In',
    'auth.registerButton': 'Sign Up',
    'auth.noAccount': 'Don\'t have an account?',
    'auth.haveAccount': 'Already have an account?',
    'auth.googleLogin': 'Sign in with Google',
    
    // Trending
    'trending.title': 'Trending Movies',
    'trending.premium': 'Premium Content',
    'trending.description': 'Exclusive content for premium members',
  },
  vi: {
    // Navbar
    'nav.home': 'Trang chủ',
    'nav.movies': 'Phim',
    'nav.myList': 'Danh sách của tôi',
    'nav.trending': 'Xu hướng',
    'nav.search': 'Tìm kiếm',
    'nav.profile': 'Hồ sơ',
    'nav.login': 'Đăng nhập',
    'nav.logout': 'Đăng xuất',
    
    // Home page
    'home.featured': 'Nổi bật',
    'home.newReleases': 'Phim mới',
    'loading.movies': 'Đang tải phim...',
    'error.title': 'Rất tiếc!',
    'error.movies': 'Đã xảy ra lỗi khi tải phim. Vui lòng thử lại sau.',
    'genres.action': 'Hành động',
    'home.premiumContent': 'Nội dung cao cấp',
    'home.premiumDescription': 'Truy cập các phim xu hướng độc quyền và phát hành sớm với tư cách thành viên cao cấp.',
    'home.upgradeNow': 'Nâng cấp ngay',
    'home.viewTrending': 'Xem xu hướng',
    
    // Movie details
    'movie.cast': 'Diễn viên',
    'movie.director': 'Đạo diễn',
    'movie.play': 'Phát',
    'movie.addToList': 'Thêm vào danh sách',
    'movie.similar': 'Phim tương tự',
    
    // Premium content
    'premium.title': 'Tư cách thành viên cao cấp',
    'premium.description': 'Truy cập nội dung và tính năng độc quyền',
    'premium.member': 'Bạn là thành viên cao cấp!',
    'premium.expiry': 'Tư cách thành viên cao cấp của bạn có hiệu lực đến',
    'premium.benefits': 'Tận hưởng quyền truy cập độc quyền vào phim xu hướng, tư cách thành viên VIP và hỗ trợ 24/7.',
    'premium.upgrade': 'Nâng cấp lên cao cấp',
    'premium.cost': 'Nhận quyền truy cập độc quyền vào nội dung và tính năng cao cấp chỉ với',
    'premium.perMonth': 'mỗi tháng',
    'premium.benefit1': 'Truy cập vào các phim xu hướng và hot nhất',
    'premium.benefit2': 'Tư cách thành viên VIP với quyền truy cập sớm vào các bản phát hành mới',
    'premium.benefit3': 'Hỗ trợ khách hàng ưu tiên 24/7',
    'premium.currentBalance': 'Số dư hiện tại của bạn:',
    'premium.insufficientFunds': 'Bạn cần ít nhất 100 USDT để nâng cấp lên cao cấp. Vui lòng nạp thêm tiền.',
    
    // Profile
    'profile.title': 'Hồ sơ của tôi',
    'profile.userInfo': 'Thông tin người dùng',
    'profile.userDetails': 'Chi tiết tài khoản và trạng thái thành viên của bạn',
    'profile.username': 'Tên người dùng',
    'profile.email': 'Email',
    'profile.notSet': 'Chưa đặt',
    'profile.membership': 'Tư cách thành viên',
    'profile.normal': 'Thường',
    'profile.premium': 'Cao cấp',
    'profile.viewPremium': 'Xem nội dung cao cấp',
    'profile.premiumExpires': 'Cao cấp hết hạn',
    
    // Wallet
    'wallet.title': 'Ví USDT',
    'wallet.description': 'Quản lý ví tiền điện tử và nạp tiền của bạn',
    'wallet.currentBalance': 'Số dư hiện tại',
    'wallet.address': 'Địa chỉ ví USDT (TRC20)',
    'wallet.enterAddress': 'Nhập địa chỉ ví USDT của bạn',
    'wallet.update': 'Cập nhật địa chỉ ví',
    'wallet.deposit': 'Nạp USDT',
    'wallet.amount': 'Số tiền (USDT)',
    'wallet.enterAmount': 'Nhập số tiền cần nạp',
    'wallet.hash': 'Mã giao dịch',
    'wallet.enterHash': 'Nhập mã giao dịch USDT',
    'wallet.depositFunds': 'Nạp tiền',
    
    // Auth
    'auth.login': 'Đăng nhập',
    'auth.register': 'Đăng ký',
    'auth.username': 'Tên người dùng',
    'auth.password': 'Mật khẩu',
    'auth.confirmPassword': 'Xác nhận mật khẩu',
    'auth.loginButton': 'Đăng nhập',
    'auth.registerButton': 'Đăng ký',
    'auth.noAccount': 'Chưa có tài khoản?',
    'auth.haveAccount': 'Đã có tài khoản?',
    'auth.googleLogin': 'Đăng nhập bằng Google',
    
    // Trending
    'trending.title': 'Phim xu hướng',
    'trending.premium': 'Nội dung cao cấp',
    'trending.description': 'Nội dung độc quyền cho thành viên cao cấp',
  }
};

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<'en' | 'vi'>('en');

  const t = (key: string): string => {
    return translations[language][key as keyof typeof translations[typeof language]] || key;
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}