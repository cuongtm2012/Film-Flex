import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, Crown, Play, DollarSign, Shield, Clock, MessageCircle, User, Zap, Film, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function PremiumComparison() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly");
  
  // Access to API endpoints would be implemented here
  const upgradeMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/profile/upgrade");
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      toast({
        title: "Upgrade initiated",
        description: "You'll be redirected to complete your premium upgrade",
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
  
  const handleUpgrade = () => {
    if (!user) {
      toast({
        title: "Login required",
        description: "Please login first to upgrade to premium",
        variant: "destructive",
      });
      return;
    }
    
    upgradeMutation.mutate();
  };
  
  return (
    <div className="min-h-screen bg-[#111827] text-white">
      {/* Hero section with feature comparison */}
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <Badge className="mb-4 bg-gradient-to-r from-yellow-500 to-amber-500 text-black font-semibold px-4 py-1 text-sm">
            <Crown className="h-4 w-4 mr-2" />
            Premium Membership
          </Badge>
          <h1 className="text-4xl md:text-5xl font-bold mb-4">Upgrade Your Streaming Experience</h1>
          <p className="text-xl text-gray-400 max-w-3xl mx-auto">
            Compare our membership tiers and unlock exclusive content with FilmFlex Premium.
          </p>
        </div>
        
        {/* Plan toggle */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex p-1 bg-zinc-800 rounded-lg">
            <button
              onClick={() => setSelectedPlan("monthly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors ${
                selectedPlan === "monthly"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setSelectedPlan("yearly")}
              className={`px-6 py-2 rounded-md text-sm font-medium transition-colors flex items-center ${
                selectedPlan === "yearly"
                  ? "bg-red-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Yearly
              <Badge className="ml-2 bg-green-600 text-white border-0">Save 20%</Badge>
            </button>
          </div>
        </div>
        
        {/* Plans comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Regular Plan */}
          <Card className="border-zinc-700 bg-zinc-900 overflow-hidden">
            <div className="bg-gradient-to-r from-zinc-800 to-zinc-900 p-1"></div>
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center">
                  <User className="h-5 w-5 mr-2 text-gray-400" />
                  <span>Normal</span>
                </div>
                <Badge variant="outline">Free</Badge>
              </CardTitle>
              <CardDescription>
                Basic access to standard content
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8">
              <div>
                <div className="text-lg font-medium mb-1">$0</div>
                <div className="text-sm text-gray-400">Forever free</div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Access to standard movies and series</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>HD video quality (720p)</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Watch on any device</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Create watchlists</span>
                </div>
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500">Access to trending movies</span>
                </div>
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500">Early access to new releases</span>
                </div>
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500">4K Ultra HD quality</span>
                </div>
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500">24/7 priority support</span>
                </div>
                <div className="flex items-start">
                  <XCircle className="h-5 w-5 text-gray-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-gray-500">Ad-free experience</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                variant="outline"
                className="w-full"
                disabled={user === null}
              >
                Current Plan
              </Button>
            </CardFooter>
          </Card>
          
          {/* Premium Plan */}
          <Card className="border-yellow-500/50 bg-gradient-to-b from-zinc-900 to-zinc-900/90 overflow-hidden relative">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-yellow-500 to-amber-500"></div>
            <div className="absolute -right-20 -top-20 w-40 h-40 bg-yellow-500/20 rounded-full blur-3xl"></div>
            <div className="absolute -left-20 -bottom-20 w-40 h-40 bg-amber-500/20 rounded-full blur-3xl"></div>
            
            <CardHeader>
              <CardTitle className="flex justify-between items-center">
                <div className="flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-yellow-500" />
                  <span>Premium</span>
                </div>
                <Badge className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black border-0">Recommended</Badge>
              </CardTitle>
              <CardDescription>
                Full access to all premium features
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-8 relative z-10">
              <div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">
                    {selectedPlan === "monthly" ? "$100" : "$960"}
                  </span>
                  <span className="text-sm text-gray-400">
                    /{selectedPlan === "monthly" ? "month" : "year"}
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  {selectedPlan === "monthly" ? "Billed monthly" : "Billed yearly (save $240)"}
                </div>
              </div>
              
              <div className="space-y-3">
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>All features in the free plan</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-yellow-500">Access to trending and exclusive movies</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-yellow-500">Early access to new releases</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-yellow-500">4K Ultra HD quality</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-yellow-500">24/7 priority support</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="font-medium text-yellow-500">Ad-free experience</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Offline downloads</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Multiple device streaming</span>
                </div>
                <div className="flex items-start">
                  <CheckCircle className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span>Personalized recommendations</span>
                </div>
              </div>
            </CardContent>
            <CardFooter className="relative z-10">
              {user?.userType === "premium" ? (
                <Button disabled className="w-full bg-green-600 hover:bg-green-700">
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Current Plan
                </Button>
              ) : (
                <Button 
                  className="w-full bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-600 hover:to-amber-600"
                  onClick={handleUpgrade}
                  disabled={upgradeMutation.isPending}
                >
                  {upgradeMutation.isPending ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Upgrading...
                    </>
                  ) : (
                    <>
                      <Crown className="h-5 w-5 mr-2" />
                      Upgrade Now
                    </>
                  )}
                </Button>
              )}
            </CardFooter>
          </Card>
        </div>
        
        {/* Features Comparison */}
        <div className="mt-24">
          <h2 className="text-3xl font-bold text-center mb-12">Detailed Feature Comparison</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-zinc-700">
                  <th className="text-left py-4 px-6 w-1/3">Feature</th>
                  <th className="text-center py-4 px-6">
                    <div className="flex flex-col items-center">
                      <User className="h-5 w-5 text-gray-400 mb-1" />
                      <span>Normal</span>
                    </div>
                  </th>
                  <th className="text-center py-4 px-6 bg-zinc-800/50">
                    <div className="flex flex-col items-center">
                      <Crown className="h-5 w-5 text-yellow-500 mb-1" />
                      <span>Premium</span>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Price</td>
                  <td className="text-center py-4 px-6">Free</td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50 font-medium">
                    {selectedPlan === "monthly" ? "$100/month" : "$960/year"}
                  </td>
                </tr>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Content Library</td>
                  <td className="text-center py-4 px-6">
                    <div className="flex items-center justify-center gap-2">
                      <Film className="h-5 w-5 text-gray-400" />
                      <span>Standard</span>
                    </div>
                  </td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <Film className="h-5 w-5 text-yellow-500" />
                      <span>Standard + Trending + Exclusive</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Video Quality</td>
                  <td className="text-center py-4 px-6">HD (720p)</td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50 font-medium">4K Ultra HD</td>
                </tr>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Early Access</td>
                  <td className="text-center py-4 px-6">
                    <XCircle className="h-5 w-5 text-gray-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Ad-Free Experience</td>
                  <td className="text-center py-4 px-6">
                    <XCircle className="h-5 w-5 text-gray-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Customer Support</td>
                  <td className="text-center py-4 px-6">Standard</td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50 font-medium">
                    <div className="flex items-center justify-center gap-2">
                      <MessageCircle className="h-5 w-5 text-yellow-500" />
                      <span>24/7 Priority Support</span>
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Offline Downloads</td>
                  <td className="text-center py-4 px-6">
                    <XCircle className="h-5 w-5 text-gray-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
                <tr className="border-b border-zinc-700/50">
                  <td className="py-4 px-6 font-medium">Simultaneous Streams</td>
                  <td className="text-center py-4 px-6">1 device</td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50 font-medium">Up to 3 devices</td>
                </tr>
                <tr>
                  <td className="py-4 px-6 font-medium">Cancel Anytime</td>
                  <td className="text-center py-4 px-6">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                  <td className="text-center py-4 px-6 bg-zinc-800/50">
                    <CheckCircle className="h-5 w-5 text-green-500 mx-auto" />
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
      
      {/* Testimonials section */}
      <div className="bg-black/30 py-20">
        <div className="max-w-7xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">What Our Premium Members Say</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card className="bg-zinc-900/50 border-zinc-700">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-500 to-indigo-500 flex items-center justify-center mr-3">
                    J
                  </div>
                  <div>
                    <div className="font-medium">John Doe</div>
                    <div className="text-sm text-gray-400">Premium Member</div>
                  </div>
                </div>
                <p className="text-gray-300">
                  "FilmFlex Premium is well worth the money. The 4K quality and exclusive content have transformed my movie nights. I especially love the early access to new releases!"
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900/50 border-zinc-700">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-pink-500 to-rose-500 flex items-center justify-center mr-3">
                    S
                  </div>
                  <div>
                    <div className="font-medium">Sarah Kim</div>
                    <div className="text-sm text-gray-400">Premium Member</div>
                  </div>
                </div>
                <p className="text-gray-300">
                  "The priority customer support alone makes Premium worth it. When I had an issue with playback, they resolved it within minutes. That level of service is rare these days."
                </p>
              </CardContent>
            </Card>
            
            <Card className="bg-zinc-900/50 border-zinc-700">
              <CardContent className="pt-6">
                <div className="flex items-center mb-4">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 flex items-center justify-center mr-3">
                    M
                  </div>
                  <div>
                    <div className="font-medium">Michael Chen</div>
                    <div className="text-sm text-gray-400">Premium Member</div>
                  </div>
                </div>
                <p className="text-gray-300">
                  "Being able to download movies for my commute has been a game-changer. The ad-free experience and trending content make FilmFlex Premium my go-to entertainment platform."
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      
      {/* CTA section */}
      <div className="bg-gradient-to-r from-zinc-900 to-black py-20">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Enhance Your Streaming Experience?</h2>
          <p className="text-xl text-gray-400 mb-8">
            Join thousands of premium members and unlock a world of exclusive content today.
          </p>
          
          {user?.userType === "premium" ? (
            <div className="bg-gradient-to-r from-yellow-500/20 to-amber-500/20 p-6 rounded-xl inline-block">
              <div className="flex items-center justify-center mb-2">
                <Crown className="h-6 w-6 text-yellow-500 mr-2" />
                <span className="text-xl font-bold">You're already a Premium member!</span>
              </div>
              <p className="text-gray-300">
                Enjoy all the exclusive benefits and premium content.
              </p>
            </div>
          ) : (
            <Button 
              size="lg" 
              onClick={handleUpgrade}
              disabled={upgradeMutation.isPending}
              className="bg-gradient-to-r from-yellow-500 to-amber-500 text-black hover:from-yellow-600 hover:to-amber-600 px-8"
            >
              {upgradeMutation.isPending ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Crown className="h-5 w-5 mr-2" />
                  Upgrade to Premium
                </>
              )}
            </Button>
          )}
          
          <div className="mt-6 text-sm text-gray-500">
            Cancel anytime. No commitments. Instant access upon upgrade.
          </div>
        </div>
      </div>
      
      {/* FAQ section */}
      <div className="max-w-5xl mx-auto px-4 py-20">
        <h2 className="text-3xl font-bold text-center mb-12">Frequently Asked Questions</h2>
        
        <div className="space-y-6">
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>How do I upgrade to Premium?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                You can upgrade to Premium by clicking the "Upgrade Now" button. You'll need to deposit USDT funds to your wallet and confirm the premium purchase. The upgrade is processed instantly, and you'll immediately have access to all premium features.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>Can I cancel my Premium subscription?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Yes, you can cancel your Premium subscription at any time. Once canceled, you'll continue to have premium access until the end of your current billing cycle. There are no refunds for partial subscription periods.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>What payment methods do you accept?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Currently, we accept USDT (TRC20) cryptocurrency payments. Simply deposit USDT to your FilmFlex wallet, and use those funds to purchase a Premium subscription.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>What exclusive content is available with Premium?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                Premium members get access to trending movies, exclusive releases, early access to new content, and special collections not available to regular users. Our premium library is constantly updated with new and exclusive films.
              </p>
            </CardContent>
          </Card>
          
          <Card className="border-zinc-700">
            <CardHeader>
              <CardTitle>Is there a free trial for Premium?</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400">
                We occasionally offer promotional free trial periods for new users. Keep an eye on our promotions page or subscribe to our newsletter to be notified of any upcoming free trial offers.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}