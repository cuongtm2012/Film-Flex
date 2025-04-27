import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/queryClient";
import { Loader2, DollarSign, Crown, Shield, Clock, ShieldAlert, Users, Film, BarChart4 } from "lucide-react";

// USDT transaction interface
interface Transaction {
  amount: number;
  transactionHash: string;
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  
  const [walletAddress, setWalletAddress] = useState("");
  const [depositAmount, setDepositAmount] = useState("");
  const [transactionHash, setTransactionHash] = useState("");
  const [activeTab, setActiveTab] = useState("profile");
  
  // Fetch user profile data
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["/api/profile"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/profile");
      return await res.json();
    },
    enabled: !!user,
  });
  
  useEffect(() => {
    if (profile?.walletAddress) {
      setWalletAddress(profile.walletAddress);
    }
  }, [profile]);
  
  // Update wallet address mutation
  const updateWalletMutation = useMutation({
    mutationFn: async (address: string) => {
      const res = await apiRequest("PUT", "/api/profile/wallet-address", { walletAddress: address });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Wallet address updated",
        description: "Your USDT wallet address has been updated successfully",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Failed to update wallet address",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Deposit funds mutation
  const depositMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      const res = await apiRequest("POST", "/api/profile/deposit", transaction);
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      setDepositAmount("");
      setTransactionHash("");
      toast({
        title: "Deposit successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Deposit failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Upgrade to premium mutation
  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile/upgrade");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Upgrade successful",
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Upgrade failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  // Handle wallet address update
  const handleUpdateWallet = (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletAddress.trim()) {
      toast({
        title: "Invalid wallet address",
        description: "Please enter a valid USDT wallet address",
        variant: "destructive",
      });
      return;
    }
    updateWalletMutation.mutate(walletAddress);
  };
  
  // Handle deposit
  const handleDeposit = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(depositAmount);
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid amount",
        description: "Please enter a valid deposit amount",
        variant: "destructive",
      });
      return;
    }
    
    if (!transactionHash.trim()) {
      toast({
        title: "Transaction hash required",
        description: "Please enter the USDT transaction hash",
        variant: "destructive",
      });
      return;
    }
    
    depositMutation.mutate({
      amount,
      transactionHash,
    });
  };
  
  // Handle premium upgrade
  const handleUpgrade = () => {
    if (!profile) return;
    
    // Premium costs 100 USDT
    const premiumCost = 10000; // 100 USDT in cents
    
    if (profile.walletBalance < premiumCost) {
      toast({
        title: "Insufficient funds",
        description: `You need 100 USDT to upgrade to premium. Your current balance is ${profile.walletBalance / 100} USDT.`,
        variant: "destructive",
      });
      return;
    }
    
    upgradeMutation.mutate();
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString() + " " + date.toLocaleTimeString();
  };
  
  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-red-600" />
      </div>
    );
  }
  
  // Handle logout
  const handleLogout = () => {
    logoutMutation.mutate();
    // The redirect will happen automatically from the auth hook
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Profile</h1>
        <Button 
          onClick={handleLogout}
          variant="destructive"
          disabled={logoutMutation.isPending}
          className="flex items-center gap-2"
        >
          {logoutMutation.isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : null}
          Sign Out
        </Button>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="mb-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="wallet">Wallet</TabsTrigger>
          <TabsTrigger value="premium">Premium</TabsTrigger>
          {user?.role === "admin" && (
            <TabsTrigger value="admin" className="bg-purple-500/20">
              <ShieldAlert className="h-4 w-4 mr-1" /> Admin
            </TabsTrigger>
          )}
        </TabsList>
        
        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
              <CardDescription>Your account details and membership status</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label>Username</Label>
                <div className="font-medium">{profile?.username}</div>
              </div>
              
              <div className="grid gap-2">
                <Label>Email</Label>
                <div className="font-medium">{profile?.email || "Not set"}</div>
              </div>

              <div className="grid gap-2">
                <Label>Role</Label>
                <div className="font-medium">
                  {user?.role || "No role"} 
                  {user?.role === "admin" ? 
                    <Badge className="ml-2 bg-purple-500 hover:bg-purple-600">Admin User</Badge> : null}
                </div>
              </div>
              
              <div className="grid gap-2">
                <Label>Membership</Label>
                <div className="flex items-center gap-2">
                  {profile?.userType === "premium" ? (
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-black">
                        <Crown className="h-3 w-3 mr-1" /> Premium
                      </Badge>
                      <Link href="/trending">
                        <Button variant="link" size="sm" className="text-yellow-500 px-0 py-0">
                          View Premium Content
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <Badge variant="outline">Normal</Badge>
                  )}
                </div>
              </div>
              
              {profile?.userType === "premium" && (
                <div className="grid gap-2">
                  <Label>Premium Expires</Label>
                  <div className="font-medium flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-gray-400" />
                    {formatDate(profile.premiumExpiresAt)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Wallet Tab */}
        <TabsContent value="wallet" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>USDT Wallet</CardTitle>
              <CardDescription>Manage your crypto wallet and deposit funds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-black p-4 rounded-lg">
                <div className="text-sm text-gray-400 mb-1">Current Balance</div>
                <div className="text-2xl font-bold flex items-center">
                  <DollarSign className="h-5 w-5 text-green-500 mr-1" />
                  {profile?.walletBalance ? (profile.walletBalance / 100).toFixed(2) : "0.00"} USDT
                </div>
              </div>
              
              <form onSubmit={handleUpdateWallet} className="space-y-4">
                <div className="grid gap-2">
                  <Label htmlFor="walletAddress">USDT Wallet Address (TRC20)</Label>
                  <Input
                    id="walletAddress"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter your USDT wallet address"
                  />
                </div>
                <Button 
                  type="submit" 
                  variant="outline"
                  disabled={updateWalletMutation.isPending}
                  className="w-full"
                >
                  {updateWalletMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Update Wallet Address
                </Button>
              </form>
              
              <div className="border-t border-gray-800 my-4 pt-4">
                <h3 className="text-lg font-medium mb-4">Deposit USDT</h3>
                <form onSubmit={handleDeposit} className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="amount">Amount (USDT)</Label>
                    <Input
                      id="amount"
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(e.target.value)}
                      placeholder="Enter amount to deposit"
                      min="1"
                    />
                  </div>
                  
                  <div className="grid gap-2">
                    <Label htmlFor="hash">Transaction Hash</Label>
                    <Input
                      id="hash"
                      value={transactionHash}
                      onChange={(e) => setTransactionHash(e.target.value)}
                      placeholder="Enter the USDT transaction hash"
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    disabled={depositMutation.isPending}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    {depositMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <DollarSign className="h-4 w-4 mr-2" />
                    )}
                    Deposit Funds
                  </Button>
                </form>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Premium Tab */}
        <TabsContent value="premium" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Premium Membership</CardTitle>
              <CardDescription>Get access to exclusive content and features</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {profile?.userType === "premium" ? (
                <div className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black p-6 rounded-lg">
                  <div className="flex items-center gap-3 mb-4">
                    <Crown className="h-8 w-8" />
                    <h3 className="text-xl font-bold">You are a Premium Member!</h3>
                  </div>
                  <p className="mb-4">
                    Your premium membership is active until{" "}
                    <strong>{formatDate(profile.premiumExpiresAt)}</strong>
                  </p>
                  <div className="bg-black/20 p-3 rounded-lg">
                    <p className="text-sm">
                      Enjoy exclusive access to trending movies, VIP membership, and 24/7 support.
                    </p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="bg-gradient-to-r from-gray-800 to-gray-900 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
                      <Crown className="h-6 w-6 text-yellow-500" />
                      Upgrade to Premium
                    </h3>
                    <p className="mb-6">
                      Get exclusive access to premium content and features for only <strong>100 USDT per month</strong>.
                    </p>
                    
                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start gap-2">
                        <Shield className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>Access to trending and hottest movies</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>VIP membership with early access to new releases</span>
                      </li>
                      <li className="flex items-start gap-2">
                        <Shield className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <span>24/7 priority customer support</span>
                      </li>
                    </ul>
                    
                    <div className="bg-black/30 p-4 rounded-lg mb-6">
                      <div className="text-sm mb-1">Your current balance:</div>
                      <div className="text-lg font-bold flex items-center">
                        <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                        {profile?.walletBalance ? (profile.walletBalance / 100).toFixed(2) : "0.00"} USDT
                      </div>
                      {profile?.walletBalance < 10000 && (
                        <div className="mt-2 text-sm text-orange-400">
                          You need at least 100 USDT to upgrade to premium. Please deposit more funds.
                        </div>
                      )}
                    </div>
                    
                    <Button 
                      onClick={handleUpgrade} 
                      disabled={upgradeMutation.isPending || (profile?.walletBalance || 0) < 10000}
                      className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-600 hover:to-amber-600"
                    >
                      {upgradeMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      ) : (
                        <Crown className="h-4 w-4 mr-2" />
                      )}
                      Upgrade to Premium
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* Admin Tab */}
        {user?.role === "admin" && (
          <TabsContent value="admin" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Admin Dashboard</CardTitle>
                <CardDescription>Manage website content and users</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Admin Dashboard Card */}
                  <Card className="bg-purple-900/20 hover:bg-purple-900/30 transition-colors cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <ShieldAlert className="h-12 w-12 mb-4 text-purple-500" />
                      <h3 className="text-lg font-medium mb-2">Admin Dashboard</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Complete admin dashboard with user, content, and financial management
                      </p>
                      <Link href="/admin">
                        <Button className="bg-purple-600 hover:bg-purple-700">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  
                  {/* User Management Card */}
                  <Card className="bg-blue-900/20 hover:bg-blue-900/30 transition-colors cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <Users className="h-12 w-12 mb-4 text-blue-500" />
                      <h3 className="text-lg font-medium mb-2">User Management</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Manage users, roles, and permissions
                      </p>
                      <Link href="/admin?tab=users">
                        <Button className="bg-blue-600 hover:bg-blue-700">
                          Manage Users
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  
                  {/* Content Management Card */}
                  <Card className="bg-green-900/20 hover:bg-green-900/30 transition-colors cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <Film className="h-12 w-12 mb-4 text-green-500" />
                      <h3 className="text-lg font-medium mb-2">Content Management</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Manage movies, uploads, and content requests
                      </p>
                      <Link href="/admin?tab=content">
                        <Button className="bg-green-600 hover:bg-green-700">
                          Manage Content
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                  
                  {/* Financial Management Card */}
                  <Card className="bg-yellow-900/20 hover:bg-yellow-900/30 transition-colors cursor-pointer">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                      <BarChart4 className="h-12 w-12 mb-4 text-yellow-500" />
                      <h3 className="text-lg font-medium mb-2">Financial Management</h3>
                      <p className="text-sm text-gray-400 mb-4">
                        Track payments, subscriptions, and revenue
                      </p>
                      <Link href="/admin?tab=finance">
                        <Button className="bg-yellow-600 hover:bg-yellow-700 text-white">
                          Financial Overview
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}