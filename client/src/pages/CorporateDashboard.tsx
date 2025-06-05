import { useState } from "react";
import { Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Users, 
  Calendar, 
  TrendingUp, 
  MapPin, 
  DollarSign,
  Plane,
  Clock,
  Plus,
  BarChart3,
  Settings,
  Sparkles,
  CreditCard,
  Lock,
  Unlock,
  Eye
} from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import NewTripModal from "@/components/NewTripModal";
import OnboardingProgress from "@/components/OnboardingProgress";

interface Trip {
  id: number;
  title: string;
  startDate: string;
  endDate: string;
  userId: number;
  city?: string;
  country?: string;
  budget?: string;
  completed?: boolean;
}

interface CorporateCard {
  id: number;
  stripe_card_id: string;
  card_number_masked: string;
  card_type: string;
  status: string;
  spending_limit: number;
  available_balance: number;
  currency: string;
  cardholder_name: string;
  created_at: string;
  user?: {
    id: number;
    username: string;
    email: string;
  };
}

export default function CorporateDashboard() {
  const { userId, user } = useAuth();
  const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
  const [selectedCard, setSelectedCard] = useState<CorporateCard | null>(null);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleOnboardingTaskClick = (taskId: string, url: string) => {
    setLocation(url);
  };

  const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
    queryKey: ['/api/trips/corporate'],
    enabled: !!user,
  });

  // Fetch corporate cards
  const { data: corporateCards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["/api/corporate-cards/cards"],
    queryFn: () => apiRequest("GET", "/api/corporate-cards/cards").then(res => res.json()),
    enabled: !!user,
  });

  // Add funds mutation
  const addFundsMutation = useMutation({
    mutationFn: ({ cardId, amount }: { cardId: number; amount: number }) =>
      apiRequest("POST", `/api/corporate-cards/cards/${cardId}/add-funds`, { amount }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
      toast({
        title: "Funds Added",
        description: "Funds have been successfully added to the card.",
      });
      setShowAddFunds(false);
      setAddFundsAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add funds",
        variant: "destructive",
      });
    },
  });

  // Freeze card mutation
  const freezeCardMutation = useMutation({
    mutationFn: (cardId: number) =>
      apiRequest("POST", `/api/corporate-cards/cards/${cardId}/freeze`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
      toast({
        title: "Card Frozen",
        description: "Card has been successfully frozen.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to freeze card",
        variant: "destructive",
      });
    },
  });

  // Unfreeze card mutation
  const unfreezeCardMutation = useMutation({
    mutationFn: (cardId: number) =>
      apiRequest("POST", `/api/corporate-cards/cards/${cardId}/unfreeze`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
      toast({
        title: "Card Activated",
        description: "Card has been successfully activated.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to activate card",
        variant: "destructive",
      });
    },
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/corporate', { userId }],
    queryFn: async () => {
      const res = await fetch('/api/analytics', {
        credentials: 'include'
      });
      if (!res.ok) return { totalTrips: 0, totalBudget: 0, avgDuration: 0, teamSize: 0 };
      const data = await res.json();
      return {
        totalTrips: data.overview?.totalTrips || 0,
        totalBudget: data.overview?.totalBudget || 0,
        avgDuration: data.overview?.averageTripLength || 0,
        teamSize: data.overview?.totalUsers || 0
      };
    },
    enabled: !!user,
  });

  const recentTrips = trips.slice(0, 3);
  const upcomingTrips = trips.filter(trip => new Date(trip.startDate) > new Date()).slice(0, 3);

  // Calculate metrics from actual trip data
  const totalTrips = trips.length;

  const totalBudget = trips.reduce((sum, trip) => {
    const budget = trip.budget ? (typeof trip.budget === 'string' ? parseFloat(trip.budget.replace(/[^0-9.-]+/g, '')) : trip.budget) : 0;
    return sum + (isNaN(budget) ? 0 : budget);
  }, 0);

  const avgTripDuration = trips.length > 0 ? Math.round(
    trips.reduce((sum, trip) => {
      const startDate = trip.startDate;
      const endDate = trip.endDate;
      if (!startDate || !endDate) return sum;

      const start = new Date(startDate);
      const end = new Date(endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) return sum;

      const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      return sum + duration;
    }, 0) / trips.length
  ) : 0;

  // Count unique travelers by user ID (since trips are per user)
  const uniqueTravelers = new Set(trips.map(trip => trip.userId)).size;

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-br from-electric-500 via-electric-600 to-electric-700 text-white mb-8"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

          <div className="relative container mx-auto px-6 py-16">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex-1"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                    <Building2 className="w-8 h-8" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-electric-200" />
                    <span className="text-electric-100 text-sm font-medium">Corporate Dashboard</span>
                  </div>
                </div>

                <h1 className="text-5xl font-bold mb-4 tracking-tight">
                  Company Travel Management
                </h1>
                <p className="text-xl text-electric-100 mb-6 max-w-2xl">
                  Streamline your organization's travel planning, expense management, and team coordination
                </p>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-electric-100">Real-time tracking</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-electric-100">Team collaboration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    <span className="text-electric-100">Smart analytics</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button 
                  onClick={() => setIsNewTripModalOpen(true)}
                  className="bg-white hover:bg-white/90 text-electric-600 font-semibold px-8 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 electric-glow"
                  size="lg"
                >
                  <Plus className="h-5 w-5 mr-2" />
                  Plan Team Trip
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Onboarding Progress - Only show for new users */}
        {trips.length === 0 && (
          <div className="mb-8">
            <OnboardingProgress 
              onTaskClick={handleOnboardingTaskClick}
            />
          </div>
        )}

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Company Trips</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{totalTrips}</p>
              </div>
              <div className="p-3 bg-electric-100 dark:bg-electric-900/20 rounded-xl">
                <Building2 className="w-6 h-6 text-electric-600" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Travel Budget Used</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">${totalBudget.toLocaleString()}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{uniqueTravelers}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Trip Duration</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{avgTripDuration} days</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Trip Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Trips */}
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="h-6 w-6 text-electric-600" />
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white">Recent Company Trips</h3>
            </div>
            <CardContent>
              {tripsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : recentTrips.length > 0 ? (
                <div className="space-y-4">
                  {recentTrips.map((trip) => (
                    <div 
                      key={trip.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                      onClick={() => setLocation(`/trip/${trip.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">{trip.city || trip.country || 'Location TBD'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={trip.completed ? 'default' : 'secondary'}>
                          {trip.completed ? 'Completed' : 'Active'}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          {(() => {
                            const startDate = trip.startDate;
                            const endDate = trip.endDate;

                            if (!startDate || !endDate) return <p>Dates not set</p>;

                            const start = new Date(startDate);
                            const end = new Date(endDate);

                            if (isNaN(start.getTime()) || isNaN(end.getTime())) {
                              return <p>Invalid dates</p>;
                            }

                            const duration = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

                            return (
                              <div>
                                <p>{start.toLocaleDateString()} - {end.toLocaleDateString()}</p>
                                <p className="text-xs opacity-75">{duration} day{duration !== 1 ? 's' : ''}</p>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Plane className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No company trips yet</h3>
                  <p className="text-muted-foreground mb-4">Start planning your team's first business trip</p>
                  <Button onClick={() => setIsNewTripModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Plan First Trip
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upcoming Trips */}
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <TrendingUp className="h-6 w-6 text-electric-600" />
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white">Upcoming Business Travel</h3>
            </div>
            <CardContent>
              {upcomingTrips.length > 0 ? (
                <div className="space-y-4">
                  {upcomingTrips.map((trip) => (
                    <div 
                      key={trip.id} 
                      className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                      onClick={() => setLocation(`/trip/${trip.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">{trip.city || trip.country || 'Location TBD'}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(trip.startDate).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          1 traveler
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No upcoming trips</h3>
                  <p className="text-muted-foreground">Plan ahead for better rates and availability</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Corporate Cards Section */}
        <AnimatedCard variant="glow" className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <CreditCard className="h-6 w-6 text-electric-600" />
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white">Corporate Cards</h3>
            </div>
            <Badge className="bg-electric-100 text-electric-700 dark:bg-electric-900/30 dark:text-electric-300">
              Stripe Issuing
            </Badge>
          </div>
          <CardContent>
            {cardsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-24 bg-muted animate-pulse rounded" />
                ))}
              </div>
            ) : corporateCards?.cards?.length > 0 ? (
              <div className="space-y-4">
                {corporateCards.cards.slice(0, 3).map((card: CorporateCard) => (
                  <div 
                    key={card.id} 
                    className="flex items-center justify-between p-4 border rounded-lg cursor-pointer hover:shadow-md hover:bg-muted/50 transition-all"
                    onClick={() => setSelectedCard(card)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded flex items-center justify-center">
                        <CreditCard className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <p className="font-medium">{card.cardholder_name}</p>
                        <p className="text-sm text-muted-foreground">{card.card_number_masked}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <Badge variant={card.status === 'active' ? 'default' : 'secondary'}>
                          {card.status}
                        </Badge>
                        {card.status === 'active' ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              freezeCardMutation.mutate(card.id);
                            }}
                            disabled={freezeCardMutation.isPending}
                          >
                            <Lock className="h-3 w-3" />
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={(e) => {
                              e.stopPropagation();
                              unfreezeCardMutation.mutate(card.id);
                            }}
                            disabled={unfreezeCardMutation.isPending}
                          >
                            <Unlock className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                      <p className="text-sm font-medium text-green-600">
                        ${(card.available_balance / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}
                {corporateCards.cards.length > 3 && (
                  <div className="text-center pt-2">
                    <Button variant="outline" size="sm">
                      View All Cards ({corporateCards.cards.length})
                    </Button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No corporate cards</h3>
                <p className="text-muted-foreground mb-4">Create cards for team members to manage expenses</p>
                <Button variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Create First Card
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Card Details Modal */}
      {selectedCard && (
        <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Card Management - {selectedCard.cardholder_name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Card Stats */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4 text-center">
                    <DollarSign className="w-6 h-6 mx-auto text-green-600 mb-2" />
                    <p className="text-sm text-gray-600">Available</p>
                    <p className="text-lg font-bold text-green-600">
                      ${(selectedCard.available_balance / 100).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4 text-center">
                    <CreditCard className="w-6 h-6 mx-auto text-blue-600 mb-2" />
                    <p className="text-sm text-gray-600">Limit</p>
                    <p className="text-lg font-bold">
                      ${(selectedCard.spending_limit / 100).toFixed(2)}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-4 text-center">
                    <Badge className={selectedCard.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                      {selectedCard.status.toUpperCase()}
                    </Badge>
                    <p className="text-sm text-gray-600 mt-2">Status</p>
                  </CardContent>
                </Card>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <Button
                  onClick={() => setShowAddFunds(true)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Add Funds
                </Button>

                {selectedCard.status === "active" ? (
                  <Button
                    onClick={() => freezeCardMutation.mutate(selectedCard.id)}
                    disabled={freezeCardMutation.isPending}
                    variant="destructive"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    Freeze Card
                  </Button>
                ) : (
                  <Button
                    onClick={() => unfreezeCardMutation.mutate(selectedCard.id)}
                    disabled={unfreezeCardMutation.isPending}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Unlock className="w-4 h-4 mr-2" />
                    Activate Card
                  </Button>
                )}

                <Button variant="outline">
                  <Eye className="w-4 h-4 mr-2" />
                  View Transactions
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Add Funds Modal */}
      <Dialog open={showAddFunds} onOpenChange={setShowAddFunds}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Funds to Card</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                value={addFundsAmount}
                onChange={(e) => setAddFundsAmount(e.target.value)}
                placeholder="Enter amount to add"
              />
            </div>
            <div className="flex space-x-2">
              <Button
                onClick={() => {
                  if (!selectedCard || !addFundsAmount) return;
                  const amount = parseFloat(addFundsAmount);
                  if (isNaN(amount) || amount <= 0) {
                    toast({
                      title: "Invalid Amount",
                      description: "Please enter a valid amount greater than 0",
                      variant: "destructive",
                    });
                    return;
                  }
                  addFundsMutation.mutate({ cardId: selectedCard.id, amount });
                }}
                disabled={addFundsMutation.isPending || !addFundsAmount}
                className="flex-1"
              >
                {addFundsMutation.isPending ? "Adding..." : "Add Funds"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowAddFunds(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <NewTripModal 
        isOpen={isNewTripModalOpen} 
        onClose={() => setIsNewTripModalOpen(false)} 
        onSuccess={() => setIsNewTripModalOpen(false)}
        userId={userId!}
      />
    </div>
  );
}