import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@/hooks/use-auth';
import { useLanguage } from '@/hooks/use-language';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from '@/components/ui/button';
import { Loader2, Users, Film, DollarSign, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { User, Movie, Transaction, AdminLog } from '@shared/schema';

// Tab components
import UserManagement from './admin/UserManagement';
import MovieManagement from './admin/MovieManagement';
import FinancialManagement from './admin/FinancialManagement';
import ActivityLogs from './admin/ActivityLogs';

export default function AdminDashboard() {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('users');
  
  // Check if user is admin
  useEffect(() => {
    if (!isLoading && user && user.role !== 'admin' && user.role !== 'sub-admin') {
      toast({
        title: t('admin.unauthorized'),
        description: t('admin.adminAccessRequired'),
        variant: 'destructive',
      });
      
      // Here you would typically redirect to home or login
      // For now, we'll just show the unauthorized message
    }
  }, [user, isLoading, toast, t]);
  
  // Fetch admin dashboard summary data
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['/api/admin/summary'],
    queryFn: async () => {
      try {
        // For simplicity, we're fetching 4 separate endpoints and combining the results
        const [usersRes, moviesRes, pendingTxRes, logsRes] = await Promise.all([
          apiRequest('GET', '/api/admin/users'),
          apiRequest('GET', '/api/admin/movies'),
          apiRequest('GET', '/api/admin/transactions/pending'),
          apiRequest('GET', '/api/admin/activity-logs?limit=5')
        ]);
        
        const users = await usersRes.json() as User[];
        const movies = await moviesRes.json() as Movie[];
        const pendingTransactions = await pendingTxRes.json() as Transaction[];
        const recentLogs = await logsRes.json() as AdminLog[];
        
        return {
          totalUsers: users.length,
          totalMovies: movies.length,
          pendingTransactions: pendingTransactions.length,
          recentLogs: recentLogs.length
        };
      } catch (error) {
        console.error('Failed to fetch admin summary:', error);
        return {
          totalUsers: 0,
          totalMovies: 0,
          pendingTransactions: 0,
          recentLogs: 0
        };
      }
    },
    enabled: !!(user && (user.role === 'admin' || user.role === 'sub-admin'))
  });
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }
  
  if (!user || (user.role !== 'admin' && user.role !== 'sub-admin')) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <h1 className="text-2xl font-bold mb-4">{t('admin.unauthorized')}</h1>
        <p className="text-gray-500 mb-6">{t('admin.adminAccessRequired')}</p>
        <Button onClick={() => window.location.href = '/'}>
          {t('general.backToHome')}
        </Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">{t('admin.dashboard')}</h1>
        <div className="flex items-center gap-2">
          <span className="text-sm">{t('admin.loggedInAs')}: </span>
          <span className="font-medium">{user.username}</span>
          <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2.5 py-0.5 rounded">
            {user.role === 'admin' ? t('admin.adminRole') : t('admin.subAdminRole')}
          </span>
        </div>
      </div>
      
      {/* Dashboard Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.users')}</CardTitle>
            <Users className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSummaryLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : summaryData?.totalUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.totalUsers')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.movies')}</CardTitle>
            <Film className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSummaryLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : summaryData?.totalMovies || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.totalMovies')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.transactions')}</CardTitle>
            <DollarSign className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSummaryLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : summaryData?.pendingTransactions || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.pendingTransactions')}</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-lg font-medium">{t('admin.activity')}</CardTitle>
            <Activity className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isSummaryLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : summaryData?.recentLogs || 0}
            </div>
            <p className="text-xs text-muted-foreground">{t('admin.recentActivity')}</p>
          </CardContent>
        </Card>
      </div>
      
      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-6">
          <TabsTrigger value="users">{t('admin.users')}</TabsTrigger>
          <TabsTrigger value="movies">{t('admin.movies')}</TabsTrigger>
          <TabsTrigger value="financial">{t('admin.financial')}</TabsTrigger>
          <TabsTrigger value="activity">{t('admin.activityLogs')}</TabsTrigger>
        </TabsList>
        
        <TabsContent value="users" className="space-y-4">
          <UserManagement />
        </TabsContent>
        
        <TabsContent value="movies" className="space-y-4">
          <MovieManagement />
        </TabsContent>
        
        <TabsContent value="financial" className="space-y-4">
          <FinancialManagement />
        </TabsContent>
        
        <TabsContent value="activity" className="space-y-4">
          <ActivityLogs />
        </TabsContent>
      </Tabs>
    </div>
  );
}