import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Redirect } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Film, Users, DollarSign, Clock, FileText, Activity, Loader2, UserCheck, UserX, PlayCircle, CheckCircle, XCircle, RefreshCw, FilesIcon, FolderIcon } from "lucide-react";
import { fetchGoogleDriveFiles, createDirectDownloadLink, getThumbnailUrl } from "@/lib/googleDriveApi";

// Mock data for financial info (replace with actual API data)
const financialData = [
  { month: 'Jan', income: 12500, subscriptions: 7500, deposits: 5000 },
  { month: 'Feb', income: 15000, subscriptions: 9000, deposits: 6000 },
  { month: 'Mar', income: 18000, subscriptions: 10000, deposits: 8000 },
  { month: 'Apr', income: 22000, subscriptions: 12000, deposits: 10000 },
  { month: 'May', income: 26000, subscriptions: 15000, deposits: 11000 },
  { month: 'Jun', income: 35000, subscriptions: 20000, deposits: 15000 },
];

// Mock data for user distribution (replace with actual API data)
const userDistributionData = [
  { name: 'Premium', value: 350, color: '#EAB308' },
  { name: 'Regular', value: 1200, color: '#6B7280' },
  { name: 'Inactive', value: 200, color: '#EF4444' }
];

// Mock data for recent transactions (replace with actual API data)
const recentTransactions = [
  { id: 1, user: 'john_doe', type: 'Deposit', amount: 100, status: 'Completed', date: '2025-04-26 14:32:00' },
  { id: 2, user: 'jane_smith', type: 'Premium Subscription', amount: 100, status: 'Completed', date: '2025-04-26 12:15:00' },
  { id: 3, user: 'mark_johnson', type: 'Deposit', amount: 200, status: 'Pending', date: '2025-04-26 10:45:00' },
  { id: 4, user: 'sarah_wilson', type: 'Premium Subscription', amount: 100, status: 'Completed', date: '2025-04-25 18:22:00' },
  { id: 5, user: 'alex_brown', type: 'Deposit', amount: 50, status: 'Failed', date: '2025-04-25 16:10:00' },
];

// Mock data for pending approvals (replace with actual API data)
const pendingUploads = [
  { id: 1, title: 'The Matrix Resurrections', uploader: 'admin', status: 'Pending', date: '2025-04-26 09:12:00' },
  { id: 2, title: 'Dune: Part Two', uploader: 'content_manager', status: 'Pending', date: '2025-04-25 15:30:00' },
  { id: 3, title: 'Godzilla x Kong: The New Empire', uploader: 'admin', status: 'Pending', date: '2025-04-25 11:45:00' },
];

// Source folder ID
const DRIVE_SOURCE_FOLDER_ID = "1K9yzITGEGc9sbXWV0NT9Nj8sIdTcO5hN";

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("overview");
  const [isGDriveModalOpen, setIsGDriveModalOpen] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState<string>("");
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [isLoadingDriveFiles, setIsLoadingDriveFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  // Redirect if not an admin
  if (!user || user.role !== "admin") {
    return <Redirect to="/" />;
  }
  
  // Fetch dashboard data
  const { data: dashboardData, isLoading: isLoadingDashboard } = useQuery({
    queryKey: ["/api/admin/dashboard"],
    queryFn: async () => {
      try {
        const res = await apiRequest("GET", "/api/admin/dashboard");
        return await res.json();
      } catch (error) {
        // If API not ready, return mock data
        console.log("Using mock data for dashboard");
        return {
          stats: {
            totalUsers: 1750,
            premiumUsers: 350,
            totalIncome: 128500,
            totalMovies: 250
          }
        };
      }
    }
  });
  
  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  if (isLoadingDashboard) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-gray-400">
          Welcome back, Administrator. Here's your overview of the FilmFlex platform.
        </p>
      </div>
      
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Users</p>
                <p className="text-3xl font-bold">{dashboardData?.stats.totalUsers.toLocaleString()}</p>
                <p className="text-xs text-green-500 mt-2">
                  +12% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-indigo-500/20 rounded-full flex items-center justify-center">
                <Users className="h-6 w-6 text-indigo-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400 mb-1">Premium Users</p>
                <p className="text-3xl font-bold">{dashboardData?.stats.premiumUsers.toLocaleString()}</p>
                <p className="text-xs text-green-500 mt-2">
                  +28% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-yellow-500/20 rounded-full flex items-center justify-center">
                <UserCheck className="h-6 w-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Revenue</p>
                <p className="text-3xl font-bold">
                  ${dashboardData?.stats.totalIncome.toLocaleString()}
                </p>
                <p className="text-xs text-green-500 mt-2">
                  +18% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-green-500/20 rounded-full flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-zinc-900 to-zinc-800 border-zinc-700">
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-sm text-gray-400 mb-1">Total Movies</p>
                <p className="text-3xl font-bold">{dashboardData?.stats.totalMovies}</p>
                <p className="text-xs text-green-500 mt-2">
                  +8% from last month
                </p>
              </div>
              <div className="h-12 w-12 bg-red-500/20 rounded-full flex items-center justify-center">
                <Film className="h-6 w-6 text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Tabs for different sections */}
      <Tabs defaultValue={activeTab} value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-zinc-800 p-1">
          <TabsTrigger value="overview" className="data-[state=active]:bg-red-600">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="users" className="data-[state=active]:bg-red-600">
            <Users className="h-4 w-4 mr-2" />
            Users
          </TabsTrigger>
          <TabsTrigger value="content" className="data-[state=active]:bg-red-600">
            <Film className="h-4 w-4 mr-2" />
            Content
          </TabsTrigger>
          <TabsTrigger value="finance" className="data-[state=active]:bg-red-600">
            <DollarSign className="h-4 w-4 mr-2" />
            Finance
          </TabsTrigger>
          <TabsTrigger value="logs" className="data-[state=active]:bg-red-600">
            <FileText className="h-4 w-4 mr-2" />
            Activity Logs
          </TabsTrigger>
        </TabsList>
        
        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Financial Overview Chart */}
            <Card className="border-zinc-700">
              <CardHeader>
                <CardTitle>Financial Overview</CardTitle>
                <CardDescription>Monthly income breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={financialData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="month" stroke="#888" />
                      <YAxis stroke="#888" />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#222', 
                          border: '1px solid #444',
                          borderRadius: '4px'
                        }} 
                      />
                      <Legend />
                      <Bar dataKey="subscriptions" name="Subscriptions" fill="#FBBF24" />
                      <Bar dataKey="deposits" name="Deposits" fill="#10B981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            
            {/* User Distribution Chart */}
            <Card className="border-zinc-700">
              <CardHeader>
                <CardTitle>User Distribution</CardTitle>
                <CardDescription>Breakdown of user types</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80 flex items-center justify-center">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={userDistributionData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        outerRadius={120}
                        fill="#8884d8"
                        dataKey="value"
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      >
                        {userDistributionData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: '#222', 
                          border: '1px solid #444',
                          borderRadius: '4px'
                        }} 
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Transactions */}
            <Card className="border-zinc-700">
              <CardHeader>
                <CardTitle>Recent Transactions</CardTitle>
                <CardDescription>Latest financial activity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">User</th>
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Type</th>
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Amount</th>
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Status</th>
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentTransactions.map((transaction) => (
                        <tr key={transaction.id} className="border-b border-zinc-800">
                          <td className="py-3 px-2 text-sm">{transaction.user}</td>
                          <td className="py-3 px-2 text-sm">{transaction.type}</td>
                          <td className="py-3 px-2 text-sm">${transaction.amount}</td>
                          <td className="py-3 px-2 text-sm">
                            <Badge className={
                              transaction.status === 'Completed' ? 'bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50' :
                              transaction.status === 'Pending' ? 'bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50' :
                              'bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50'
                            }>
                              {transaction.status}
                            </Badge>
                          </td>
                          <td className="py-3 px-2 text-sm text-gray-400">{formatDate(transaction.date)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-zinc-800 py-4">
                <Button variant="outline" size="sm">
                  View All Transactions
                </Button>
              </CardFooter>
            </Card>
            
            {/* Pending Approvals */}
            <Card className="border-zinc-700">
              <CardHeader>
                <CardTitle>Pending Content Approvals</CardTitle>
                <CardDescription>Movies waiting for review</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Title</th>
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Uploader</th>
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Date</th>
                        <th className="text-left py-3 px-2 text-xs uppercase text-gray-400 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pendingUploads.map((upload) => (
                        <tr key={upload.id} className="border-b border-zinc-800">
                          <td className="py-3 px-2 text-sm">{upload.title}</td>
                          <td className="py-3 px-2 text-sm">{upload.uploader}</td>
                          <td className="py-3 px-2 text-sm text-gray-400">{formatDate(upload.date)}</td>
                          <td className="py-3 px-2 flex space-x-2">
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
              <CardFooter className="flex justify-center border-t border-zinc-800 py-4">
                <Button variant="outline" size="sm">
                  View All Pending Content
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        {/* Users Tab */}
        <TabsContent value="users" className="space-y-6">
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>User Management</CardTitle>
              <CardDescription>Search, view and manage users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input placeholder="Search users by username, email or ID..." />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    Search
                  </Button>
                  <Button>
                    Add New User
                  </Button>
                </div>
              </div>
              
              <div className="border border-zinc-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800">
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">ID</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Username</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Email</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Type</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sample users - to be replaced with actual data */}
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">1</td>
                        <td className="py-3 px-4">admin</td>
                        <td className="py-3 px-4">admin@filmflex.com</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-purple-500/20 text-purple-500 hover:bg-purple-500/30 border-purple-500/50">
                            Admin
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Active
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">2</td>
                        <td className="py-3 px-4">john_doe</td>
                        <td className="py-3 px-4">john@example.com</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50">
                            Premium
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Active
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Deactivate
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">3</td>
                        <td className="py-3 px-4">jane_smith</td>
                        <td className="py-3 px-4">jane@example.com</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-zinc-500/20 text-zinc-400 hover:bg-zinc-500/30 border-zinc-500/50">
                            Normal
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Active
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Deactivate
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">4</td>
                        <td className="py-3 px-4">mark_johnson</td>
                        <td className="py-3 px-4">mark@example.com</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50">
                            Premium
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50">
                            Inactive
                          </Badge>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                            <Button size="sm" variant="outline" className="h-8 border-green-600 text-green-600 hover:bg-green-600/10">
                              Activate
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-zinc-800 py-4">
              <div className="text-sm text-gray-400">
                Showing 4 of 1,750 users
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Content Tab */}
        <TabsContent value="content" className="space-y-6">
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>Content Management</CardTitle>
              <CardDescription>Manage movies and Google Drive content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input placeholder="Search content by title, genre or ID..." />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    Search
                  </Button>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        Add New Movie
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                      <DialogHeader>
                        <DialogTitle>Add New Movie</DialogTitle>
                        <DialogDescription>
                          Fill in the movie information below.
                        </DialogDescription>
                      </DialogHeader>
                      <form>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="title">Title *</Label>
                              <Input
                                id="title"
                                name="title"
                                required
                              />
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                              <div className="space-y-2">
                                <Label htmlFor="releaseYear">Release Year</Label>
                                <Input
                                  id="releaseYear"
                                  name="releaseYear"
                                  type="number"
                                  defaultValue={new Date().getFullYear()}
                                />
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="duration">Duration (min)</Label>
                                <Input
                                  id="duration"
                                  name="duration"
                                  type="number"
                                  defaultValue={90}
                                />
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              name="description"
                              rows={3}
                            />
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="posterUrl">Poster URL</Label>
                              <Input
                                id="posterUrl"
                                name="posterUrl"
                                placeholder="https://example.com/poster.jpg"
                              />
                            </div>
                            
                            <div className="space-y-2">
                              <Label htmlFor="videoUrl">Video URL</Label>
                              <Input
                                id="videoUrl"
                                name="videoUrl"
                                placeholder="https://drive.google.com/file/d/..."
                              />
                            </div>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button type="submit">
                            Create Movie
                          </Button>
                        </DialogFooter>
                      </form>
                    </DialogContent>
                  </Dialog>
                  <Dialog open={isGDriveModalOpen} onOpenChange={setIsGDriveModalOpen}>
                    <DialogTrigger asChild>
                      <Button variant="secondary" 
                        onClick={() => {
                          setIsGDriveModalOpen(true);
                          setSelectedFiles([]);
                        }}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Sync Google Drive
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-3xl">
                      <DialogHeader>
                        <DialogTitle>Import Movies from Google Drive</DialogTitle>
                        <DialogDescription>
                          Browse and select video files from Google Drive to add to the movie database.
                        </DialogDescription>
                      </DialogHeader>
                      
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="genre">Assign Genre</Label>
                          <Select value={selectedGenre} onValueChange={setSelectedGenre}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a genre for the imported movies" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="action">Action</SelectItem>
                              <SelectItem value="adventure">Adventure</SelectItem>
                              <SelectItem value="animation">Animation</SelectItem>
                              <SelectItem value="comedy">Comedy</SelectItem>
                              <SelectItem value="crime">Crime</SelectItem>
                              <SelectItem value="documentary">Documentary</SelectItem>
                              <SelectItem value="drama">Drama</SelectItem>
                              <SelectItem value="family">Family</SelectItem>
                              <SelectItem value="fantasy">Fantasy</SelectItem>
                              <SelectItem value="horror">Horror</SelectItem>
                              <SelectItem value="sci-fi">Sci-Fi</SelectItem>
                              <SelectItem value="thriller">Thriller</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="pt-2">
                          <Button 
                            onClick={async () => {
                              setIsLoadingDriveFiles(true);
                              try {
                                const files = await fetchGoogleDriveFiles(DRIVE_SOURCE_FOLDER_ID);
                                setDriveFiles(files);
                              } catch (error) {
                                console.error('Error loading Drive files:', error);
                                toast({
                                  title: "Error loading files",
                                  description: "Could not load files from Google Drive. Please try again.",
                                  variant: "destructive"
                                });
                              } finally {
                                setIsLoadingDriveFiles(false);
                              }
                            }}
                            disabled={isLoadingDriveFiles}
                            className="w-full"
                          >
                            {isLoadingDriveFiles ? (
                              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                              <FolderIcon className="h-4 w-4 mr-2" />
                            )}
                            Browse Google Drive Folder
                          </Button>
                        </div>
                        
                        {driveFiles.length > 0 && (
                          <div className="border rounded-lg overflow-hidden mt-4">
                            <div className="bg-zinc-800 px-4 py-2 font-medium">
                              Available Video Files ({driveFiles.length})
                            </div>
                            <div className="max-h-[300px] overflow-y-auto">
                              <table className="w-full">
                                <thead className="bg-zinc-800/50">
                                  <tr>
                                    <th className="py-2 px-4 text-left">Select</th>
                                    <th className="py-2 px-4 text-left">File Name</th>
                                    <th className="py-2 px-4 text-left">Size</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {driveFiles.map((file) => (
                                    <tr key={file.id} className="border-t border-zinc-700">
                                      <td className="py-2 px-4">
                                        <input
                                          type="checkbox"
                                          checked={selectedFiles.includes(file.id)}
                                          onChange={(e) => {
                                            if (e.target.checked) {
                                              setSelectedFiles([...selectedFiles, file.id]);
                                            } else {
                                              setSelectedFiles(selectedFiles.filter(id => id !== file.id));
                                            }
                                          }}
                                          className="w-4 h-4 rounded border-gray-600 bg-gray-800"
                                        />
                                      </td>
                                      <td className="py-2 px-4">{file.name}</td>
                                      <td className="py-2 px-4">
                                        {file.size ? `${(parseInt(file.size) / (1024 * 1024)).toFixed(2)} MB` : 'Unknown'}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setIsGDriveModalOpen(false)}>
                          Cancel
                        </Button>
                        <Button 
                          disabled={selectedFiles.length === 0 || !selectedGenre}
                          onClick={async () => {
                            try {
                              // Create a list of movies to add
                              const moviesToAdd = selectedFiles.map(fileId => {
                                const file = driveFiles.find(f => f.id === fileId);
                                return {
                                  title: file?.name?.replace(/\.[^/.]+$/, '') || 'Unknown Title',
                                  description: `Imported from Google Drive: ${file?.name}`,
                                  year: new Date().getFullYear(), // Default to current year
                                  genre: selectedGenre,
                                  posterUrl: getThumbnailUrl(fileId),
                                  videoUrl: createDirectDownloadLink(fileId),
                                  featured: false,
                                  premium: false
                                };
                              });
                              
                              // Send the request to add movies
                              const res = await apiRequest("POST", "/api/admin/movies/import", {
                                movies: moviesToAdd
                              });
                              
                              const result = await res.json();
                              
                              // Success notification
                              toast({
                                title: "Movies Imported",
                                description: `Successfully imported ${result.count} movies from Google Drive.`,
                              });
                              
                              // Close the dialog and reset selections
                              setIsGDriveModalOpen(false);
                              setSelectedFiles([]);
                              setSelectedGenre("");
                              
                              // Refresh movie list
                              queryClient.invalidateQueries({ queryKey: ["/api/movies"] });
                              
                            } catch (error) {
                              console.error('Error importing movies:', error);
                              toast({
                                title: "Import Failed",
                                description: "There was an error importing movies. Please try again.",
                                variant: "destructive"
                              });
                            }
                          }}
                        >
                          Import Selected Movies
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
              
              <div className="border border-zinc-700 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800">
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">ID</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Title</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Release Year</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Genres</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Views</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {/* Sample movies - to be replaced with actual data */}
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">1</td>
                        <td className="py-3 px-4">Kung Fu Panda</td>
                        <td className="py-3 px-4">2008</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Animation</Badge>
                            <Badge variant="outline" className="text-xs">Action</Badge>
                            <Badge variant="outline" className="text-xs">Comedy</Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Active
                          </Badge>
                        </td>
                        <td className="py-3 px-4">2,500</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">2</td>
                        <td className="py-3 px-4">The Dark Knight</td>
                        <td className="py-3 px-4">2008</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Action</Badge>
                            <Badge variant="outline" className="text-xs">Crime</Badge>
                            <Badge variant="outline" className="text-xs">Drama</Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Active
                          </Badge>
                        </td>
                        <td className="py-3 px-4">3,200</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">3</td>
                        <td className="py-3 px-4">Inception</td>
                        <td className="py-3 px-4">2010</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Action</Badge>
                            <Badge variant="outline" className="text-xs">Adventure</Badge>
                            <Badge variant="outline" className="text-xs">Sci-Fi</Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50">
                            Premium
                          </Badge>
                        </td>
                        <td className="py-3 px-4">4,100</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">4</td>
                        <td className="py-3 px-4">Interstellar</td>
                        <td className="py-3 px-4">2014</td>
                        <td className="py-3 px-4">
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-xs">Adventure</Badge>
                            <Badge variant="outline" className="text-xs">Drama</Badge>
                            <Badge variant="outline" className="text-xs">Sci-Fi</Badge>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50">
                            Premium
                          </Badge>
                        </td>
                        <td className="py-3 px-4">3,800</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" variant="outline" className="h-8">
                              Edit
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-zinc-800 py-4">
              <div className="text-sm text-gray-400">
                Showing 4 of 250 movies
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
        
        {/* Finance Tab */}
        <TabsContent value="finance" className="space-y-6">
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>Financial Management</CardTitle>
              <CardDescription>Track revenue, process transactions, and manage payments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <Card className="border-zinc-700">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Today's Revenue</p>
                    <p className="text-2xl font-bold">$850</p>
                    <p className="text-xs text-green-500 mt-1">+12% from yesterday</p>
                  </CardContent>
                </Card>
                
                <Card className="border-zinc-700">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Weekly Revenue</p>
                    <p className="text-2xl font-bold">$5,200</p>
                    <p className="text-xs text-green-500 mt-1">+8% from last week</p>
                  </CardContent>
                </Card>
                
                <Card className="border-zinc-700">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Monthly Revenue</p>
                    <p className="text-2xl font-bold">$22,000</p>
                    <p className="text-xs text-green-500 mt-1">+18% from last month</p>
                  </CardContent>
                </Card>
                
                <Card className="border-zinc-700">
                  <CardContent className="p-4">
                    <p className="text-xs text-gray-400 mb-1">Pending Transactions</p>
                    <p className="text-2xl font-bold">12</p>
                    <p className="text-xs text-yellow-500 mt-1">Needs attention</p>
                  </CardContent>
                </Card>
              </div>
              
              <div className="border border-zinc-700 rounded-lg overflow-hidden mb-6">
                <div className="bg-zinc-800 px-4 py-3 flex justify-between items-center">
                  <h3 className="font-medium">Pending Transactions</h3>
                  <Button size="sm" variant="outline">
                    Process All
                  </Button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">ID</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">User</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Type</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Date</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">1001</td>
                        <td className="py-3 px-4">mark_johnson</td>
                        <td className="py-3 px-4">Deposit</td>
                        <td className="py-3 px-4">$200</td>
                        <td className="py-3 px-4">2025-04-26 10:45:00</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">1002</td>
                        <td className="py-3 px-4">alice_green</td>
                        <td className="py-3 px-4">Premium Subscription</td>
                        <td className="py-3 px-4">$100</td>
                        <td className="py-3 px-4">2025-04-26 09:30:00</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">1003</td>
                        <td className="py-3 px-4">robert_lee</td>
                        <td className="py-3 px-4">Deposit</td>
                        <td className="py-3 px-4">$150</td>
                        <td className="py-3 px-4">2025-04-26 08:15:00</td>
                        <td className="py-3 px-4">
                          <div className="flex space-x-2">
                            <Button size="sm" className="h-8 bg-green-600 hover:bg-green-700 text-white">
                              Approve
                            </Button>
                            <Button size="sm" variant="destructive" className="h-8">
                              Reject
                            </Button>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
              
              <div className="border border-zinc-700 rounded-lg overflow-hidden">
                <div className="bg-zinc-800 px-4 py-3">
                  <h3 className="font-medium">Recent Transaction History</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-zinc-700">
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">ID</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">User</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Type</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Amount</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Status</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">1000</td>
                        <td className="py-3 px-4">john_doe</td>
                        <td className="py-3 px-4">Deposit</td>
                        <td className="py-3 px-4">$100</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Completed
                          </Badge>
                        </td>
                        <td className="py-3 px-4">2025-04-26 14:32:00</td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">999</td>
                        <td className="py-3 px-4">jane_smith</td>
                        <td className="py-3 px-4">Premium Subscription</td>
                        <td className="py-3 px-4">$100</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Completed
                          </Badge>
                        </td>
                        <td className="py-3 px-4">2025-04-26 12:15:00</td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">998</td>
                        <td className="py-3 px-4">alex_brown</td>
                        <td className="py-3 px-4">Deposit</td>
                        <td className="py-3 px-4">$50</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50">
                            Failed
                          </Badge>
                        </td>
                        <td className="py-3 px-4">2025-04-25 16:10:00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Activity Logs Tab */}
        <TabsContent value="logs" className="space-y-6">
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>Activity Logs</CardTitle>
              <CardDescription>Track all admin actions and system events</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col md:flex-row gap-4 mb-6">
                <div className="flex-1">
                  <Input placeholder="Search logs by admin, action or date..." />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    Search
                  </Button>
                  <Button variant="outline">
                    Export Logs
                  </Button>
                </div>
              </div>
              
              <div className="border border-zinc-700 rounded-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-zinc-800">
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">ID</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Admin</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Action</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Target</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Notes</th>
                        <th className="text-left py-3 px-4 text-xs uppercase text-gray-400 font-semibold">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">1</td>
                        <td className="py-3 px-4">admin</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-blue-500/20 text-blue-500 hover:bg-blue-500/30 border-blue-500/50">
                            User Update
                          </Badge>
                        </td>
                        <td className="py-3 px-4">john_doe</td>
                        <td className="py-3 px-4 max-w-xs truncate">Updated user to premium status</td>
                        <td className="py-3 px-4 text-sm text-gray-400">2025-04-26 14:00:00</td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">2</td>
                        <td className="py-3 px-4">admin</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-green-500/20 text-green-500 hover:bg-green-500/30 border-green-500/50">
                            Content Added
                          </Badge>
                        </td>
                        <td className="py-3 px-4">Inception</td>
                        <td className="py-3 px-4 max-w-xs truncate">Added new movie to trending section</td>
                        <td className="py-3 px-4 text-sm text-gray-400">2025-04-26 11:30:00</td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">3</td>
                        <td className="py-3 px-4">admin</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-purple-500/20 text-purple-500 hover:bg-purple-500/30 border-purple-500/50">
                            System Update
                          </Badge>
                        </td>
                        <td className="py-3 px-4">Google Drive API</td>
                        <td className="py-3 px-4 max-w-xs truncate">Updated Google Drive integration settings</td>
                        <td className="py-3 px-4 text-sm text-gray-400">2025-04-25 16:45:00</td>
                      </tr>
                      <tr className="border-b border-zinc-700">
                        <td className="py-3 px-4">4</td>
                        <td className="py-3 px-4">admin</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-yellow-500/20 text-yellow-500 hover:bg-yellow-500/30 border-yellow-500/50">
                            Transaction
                          </Badge>
                        </td>
                        <td className="py-3 px-4">Transaction #998</td>
                        <td className="py-3 px-4 max-w-xs truncate">Rejected deposit due to invalid transaction hash</td>
                        <td className="py-3 px-4 text-sm text-gray-400">2025-04-25 16:15:00</td>
                      </tr>
                      <tr>
                        <td className="py-3 px-4">5</td>
                        <td className="py-3 px-4">admin</td>
                        <td className="py-3 px-4">
                          <Badge className="bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/50">
                            User Deactivate
                          </Badge>
                        </td>
                        <td className="py-3 px-4">mark_johnson</td>
                        <td className="py-3 px-4 max-w-xs truncate">Deactivated user due to suspicious activity</td>
                        <td className="py-3 px-4 text-sm text-gray-400">2025-04-25 10:20:00</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex justify-between border-t border-zinc-800 py-4">
              <div className="text-sm text-gray-400">
                Showing 5 of 320 log entries
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm">
                  Next
                </Button>
              </div>
            </CardFooter>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}