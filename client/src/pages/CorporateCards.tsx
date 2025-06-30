import SharedUserType from '@/types/SharedUserType';
import SharedApprovalDataType from '@/types/SharedApprovalDataType';
import SharedUpdateDataType from '@/types/SharedUpdateDataType';
import SharedErrorType from '@/types/SharedErrorType';
import SharedCardDataType from '@shared/schema/types/SharedCardDataType';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { AnimatedCard } from "@/components/ui/animated-card";
import { PrimaryButton } from "@/components/ui/primary-button";
import { FullScreenModal } from "@/components/ui/full-screen-modal";
import { RoleGate, useRolePermissions } from "@/hooks/useRolePermissions";
import { motion } from "framer-motion";
import { CardsList } from "@/components/cards/CardsList";
import CarbonExpenseTracker from "@/components/CarbonExpenseTracker";
import { CreditCard, Plus, Settings, Eye, EyeOff, TrendingUp, DollarSign, Users, Calendar, Receipt, AlertTriangle, CheckCircle, XCircle, Sparkles, ArrowUpRight, Leaf } from "lucide-react";
interface CorporateCard {
    id: number;
    organization_id: number;
    user_id: number;
    card_number_masked: string;
    cardholder_name: string;
    status: string;
    spending_limit: number;
    available_balance: number;
    currency: string;
    card_type: string;
    card_provider?: string;
    stripe_card_id: string;
    purpose?: string;
    department?: string;
    cost_center?: string;
    auto_lock_triggers?: string;
    created_at: string;
    updated_at: string;
}
interface CardTransaction {
    id: number;
    amount: number;
    currency: string;
    merchant_name: string;
    merchant_category: string;
    transaction_type: string;
    transaction_status: string;
    processed_at: string;
}
interface Expense {
    id: number;
    merchant_name: string;
    amount: number;
    currency: string;
    expense_category: string;
    category: string; // Alias for expense_category
    description: string;
    status: string;
    approval_status: string;
    transaction_date: string;
    user: {
        username: string;
        email: string;
    };
}
export default function CorporateCards() {
    const [selectedCard, setSelectedCard] = useState<CorporateCard | null>(null);
    const [showCardDetails, setShowCardDetails] = useState(false);
    const [isIssueDialogOpen, setIsIssueDialogOpen] = useState(false);
    const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
    const [isAddFundsDialogOpen, setIsAddFundsDialogOpen] = useState(false);
    const [addFundsAmount, setAddFundsAmount] = useState("");
    const { toast } = useToast();
    const queryClient = useQueryClient();
    // Fetch corporate cards
    const { data: cardsResponse, isLoading: cardsLoading } = useQuery({
        queryKey: ["/api/corporate-cards/cards"],
        queryFn: () => apiRequest("GET", "/api/corporate-cards/cards").then(res => res.json()),
    });
    const cards = cardsResponse?.cards || [];
    // Fetch expenses
    const { data: expenses = [], isLoading: expensesLoading } = useQuery({
        queryKey: ["/api/expenses"],
        queryFn: () => apiRequest("GET", "/api/expenses").then(res => res.json()),
    });
    // Fetch analytics
    const { data: analytics } = useQuery({
        queryKey: ["/api/corporate-card/analytics"],
        queryFn: () => apiRequest("GET", "/api/corporate-card/analytics").then(res => res.json()),
    });
    // Fetch organization users for dropdown
    const { data: organizationUsers = [] } = useQuery({
        queryKey: ["/api/organizations/users"],
        queryFn: () => apiRequest("GET", "/api/organizations/users").then(res => res.json()),
    });
    // Issue new card mutation
    const issueCardMutation = useMutation({
        mutationFn: (cardData: SharedCardDataType) => apiRequest("POST", "/api/corporate-cards/cards", cardData).then(res => res.json()),
        onSuccess: () => {
            toast({
                title: "Card Issued Successfully",
                description: "New corporate card has been issued and activated.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
            setIsIssueDialogOpen(false);
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Failed to Issue Card",
                description: error.message || "Something went wrong",
                variant: "destructive",
            });
        },
    });
    // Freeze/unfreeze card mutation
    const freezeCardMutation = useMutation({
        mutationFn: async ({ cardId, freeze }: {
            cardId: number;
            freeze: boolean;
        }) => {
            const response = await apiRequest("POST", `/api/corporate-cards/cards/${cardId}/freeze`, { freeze });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update card status");
            }
            return response.json();
        },
        onSuccess: async (_, { freeze }) => {
            toast({
                title: freeze ? "Card Frozen" : "Card Unfrozen",
                description: `Card has been ${freeze ? "frozen" : "unfrozen"} successfully.`,
            });
            await queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
            // Update the selected card state to reflect the new status
            if (selectedCard) {
                setSelectedCard({
                    ...selectedCard,
                    status: freeze ? 'inactive' : 'active'
                });
            }
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Error",
                description: error.message || "Failed to update card status",
                variant: "destructive",
            });
        },
    });
    // Update card mutation
    const updateCardMutation = useMutation({
        mutationFn: async ({ cardId, updateData }: {
            cardId: number;
            updateData: SharedUpdateDataType;
        }) => {
            const response = await apiRequest("PUT", `/api/corporate-cards/cards/${cardId}`, updateData);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to update card");
            }
            return response.json();
        },
        onSuccess: async (data, variables) => {
            toast({
                title: "Card Updated",
                description: "Card details have been updated successfully.",
            });
            await queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
            // Update the selected card state immediately to reflect changes
            if (selectedCard && variables.cardId === selectedCard.id && variables.updateData.spend_limit) {
                setSelectedCard({
                    ...selectedCard,
                    spending_limit: variables.updateData.spend_limit
                });
            }
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Update Failed",
                description: error.message || "Failed to update card",
                variant: "destructive",
            });
        },
    });
    // Add funds mutation
    const addFundsMutation = useMutation({
        mutationFn: async ({ cardId, amount }: {
            cardId: number;
            amount: number;
        }) => {
            const response = await apiRequest("POST", `/api/corporate-cards/cards/${cardId}/add-funds`, { amount });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to add funds");
            }
            return response.json();
        },
        onSuccess: async (data, variables) => {
            toast({
                title: "Funds Added",
                description: `$${variables.amount} has been added to the card successfully.`,
            });
            await queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
            // Update the selected card state immediately to reflect new balance
            if (selectedCard && variables.cardId === selectedCard.id) {
                setSelectedCard({
                    ...selectedCard,
                    available_balance: selectedCard.available_balance + variables.amount,
                    spending_limit: selectedCard.spending_limit + variables.amount
                });
            }
            setIsAddFundsDialogOpen(false);
            setAddFundsAmount("");
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Add Funds Failed",
                description: error.message || "Failed to add funds to card",
                variant: "destructive",
            });
        },
    });
    // Delete card mutation
    const deleteCardMutation = useMutation({
        mutationFn: async (cardId: number) => {
            const response = await apiRequest("DELETE", `/api/corporate-cards/cards/${cardId}`);
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to delete card");
            }
            return response.json();
        },
        onSuccess: async () => {
            toast({
                title: "Card Deleted",
                description: "Corporate card has been permanently deleted.",
            });
            await queryClient.invalidateQueries({ queryKey: ["/api/corporate-cards/cards"] });
            setSelectedCard(null);
            setIsManageDialogOpen(false);
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Error",
                description: error.message || "Failed to delete card",
                variant: "destructive",
            });
        },
    });
    // Approve expense mutation
    const approveExpenseMutation = useMutation({
        mutationFn: (approvalData: SharedApprovalDataType) => apiRequest("POST", "/api/expenses/approve", approvalData).then(res => res.json()),
        onSuccess: () => {
            toast({
                title: "Expense Processed",
                description: "Expense approval status updated successfully.",
            });
            queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
        },
    });
    const handleIssueCard = (formData: FormData) => {
        const userId = parseInt(formData.get("user_id") as string);
        const selectedUser = organizationUsers.find((user: SharedUserType) => user.id === userId);
        const cardData = {
            user_id: userId,
            spend_limit: parseInt(formData.get("spend_limit") as string), // Already in dollars, don't multiply
            interval: formData.get("interval") as string,
            cardholder_name: selectedUser?.username || "",
            purpose: formData.get("purpose") as string,
            department: formData.get("department") as string,
        };
        issueCardMutation.mutate(cardData);
    };
    const formatCurrency = (amount: number, currency = "USD") => {
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency,
        }).format(amount);
    };
    const getStatusBadge = (status: string) => {
        if (!status) {
            return (<Badge className="bg-gray-100 text-gray-800">
          Unknown
        </Badge>);
        }
        const statusColors = {
            active: "bg-green-100 text-green-800",
            inactive: "bg-yellow-100 text-yellow-800",
            canceled: "bg-red-100 text-red-800",
            pending: "bg-blue-100 text-blue-800",
            approved: "bg-green-100 text-green-800",
            rejected: "bg-red-100 text-red-800",
        };
        return (<Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>);
    };
    if (cardsLoading) {
        return (<div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"/>
      </div>);
    }
    return (<div className="min-h-screen bg-soft-100 dark:bg-navy-900">
      {/* Hero Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="relative overflow-hidden bg-gradient-to-br from-electric-500 via-electric-600 to-electric-700 text-white">
        <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent"/>
        <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
        }}/>

        <div className="relative container mx-auto px-6 py-16">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.2 }} className="flex-1">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                  <CreditCard className="w-8 h-8"/>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-electric-200"/>
                  <span className="text-electric-100 text-sm font-medium">Corporate Finance</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold mb-4 tracking-tight">
                Corporate Cards
              </h1>
              <p className="text-xl text-electric-100 mb-6 max-w-2xl">
                Streamline company spending with intelligent virtual cards, real-time controls, and automated expense management
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"/>
                  <span className="text-electric-100">Real-time tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"/>
                  <span className="text-electric-100">Instant approvals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-electric-400 rounded-full"/>
                  <span className="text-electric-100">Smart controls</span>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.4 }} className="flex flex-col sm:flex-row gap-4">
              <RoleGate requiredPermissions={['canIssueCards']}>
                <PrimaryButton variant="primary" size="lg" onClick={() => setIsIssueDialogOpen(true)} className="electric-glow">
                  <Plus className="w-5 h-5 mr-2"/>
                  Issue New Card
                </PrimaryButton>
              </RoleGate>

              <RoleGate requiredPermissions={['canFreezeCards', 'canIssueCards']}>
                <PrimaryButton variant="secondary" size="lg" onClick={() => setIsManageDialogOpen(true)}>
                  <Settings className="w-5 h-5 mr-2"/>
                  Manage Cards
                </PrimaryButton>
              </RoleGate>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Quick Stats */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.6 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Cards</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{cards.length}</p>
              </div>
              <div className="p-3 bg-electric-100 dark:bg-electric-900/20 rounded-xl">
                <CreditCard className="w-6 h-6 text-electric-600"/>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Spend</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">
                  {formatCurrency(analytics?.totalSpend || 0)}
                </p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-green-600"/>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pending Expenses</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">
                  {expenses.filter((e: Expense) => e.status === 'pending').length}
                </p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                <Receipt className="w-6 h-6 text-orange-600"/>
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Team Members</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">
                  {analytics?.totalUsers || 0}
                </p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <Users className="w-6 h-6 text-blue-600"/>
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Tabbed Content */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.8 }} className="space-y-6">
          <Tabs defaultValue="cards" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="cards" className="flex items-center gap-2">
                <CreditCard className="w-4 h-4"/>
                Corporate Cards
              </TabsTrigger>
              <TabsTrigger value="expenses" className="flex items-center gap-2">
                <Receipt className="w-4 h-4"/>
                Expenses
              </TabsTrigger>
              <TabsTrigger value="sustainability" className="flex items-center gap-2">
                <Leaf className="w-4 h-4"/>
                Sustainability
              </TabsTrigger>
            </TabsList>

            <TabsContent value="cards" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Corporate Cards</h2>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">
                    {cards.filter((card: CorporateCard) => card.status === 'active').length} active
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cards.map((card: CorporateCard) => (<AnimatedCard key={card.id} variant="glow" className="p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-electric-400/10 to-transparent rounded-full -translate-y-16 translate-x-16"/>

                <div className="relative">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-electric-100 dark:bg-electric-900/20 rounded-lg">
                        <CreditCard className="w-5 h-5 text-electric-600"/>
                      </div>
                      <div>
                        <h3 className="font-semibold text-navy-900 dark:text-white">{card.cardholder_name}</h3>
                        <p className="text-sm text-muted-foreground">{card.card_number_masked}</p>
                      </div>
                    </div>
                    {getStatusBadge(card.status)}
                  </div>

                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Available Balance</span>
                      <span className="font-medium text-green-600">
                        ${typeof card.available_balance === 'number' ? (card.available_balance >= 100 ? (card.available_balance / 100).toFixed(2) : card.available_balance.toFixed(2)) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">Spending Limit</span>
                      <span className="font-medium">
                        ${typeof card.spending_limit === 'number' ? (card.spending_limit >= 100 ? (card.spending_limit / 100).toFixed(2) : card.spending_limit.toFixed(2)) : '0.00'}
                      </span>
                    </div>
                  </div>
                  

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-electric-200 dark:border-electric-800">
                    <PrimaryButton variant="ghost" size="sm" className="flex-1" onClick={() => {
                setSelectedCard(card);
                setShowCardDetails(true);
            }}>
                      <ArrowUpRight className="w-4 h-4 mr-1"/>
                      View Details
                    </PrimaryButton>
                    <PrimaryButton variant="ghost" size="sm" className="flex-1" onClick={() => {
                setSelectedCard(card);
                setIsManageDialogOpen(true);
            }}>
                      <Settings className="w-4 h-4 mr-1"/>
                      Settings
                    </PrimaryButton>
                  </div>
                </div>
              </AnimatedCard>))}
              </div>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Expense Management</h2>
              </div>
              
              {/* Expense List */}
              <div className="space-y-4">
                {expenses.map((expense: Expense) => (<AnimatedCard key={expense.id} variant="soft" className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
                          <Receipt className="w-4 h-4 text-blue-600"/>
                        </div>
                        <div>
                          <h3 className="font-semibold">{expense.description}</h3>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(expense.amount)} • {expense.category}
                          </p>
                        </div>
                      </div>
                      <Badge variant={expense.status === 'approved' ? 'default' : 'secondary'}>
                        {expense.status}
                      </Badge>
                    </div>
                  </AnimatedCard>))}
              </div>
            </TabsContent>

            <TabsContent value="sustainability" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-navy-900 dark:text-white">Sustainability Tracking</h2>
                <div className="flex items-center gap-2">
                  <Leaf className="w-5 h-5 text-green-600"/>
                  <span className="text-sm text-muted-foreground">ESG Compliance</span>
                </div>
              </div>

              {/* Carbon Expense Tracker */}
              <CarbonExpenseTracker tripId={1} activities={[]} budget={analytics?.totalSpend || 0}/>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>

      {/* Issue Card Modal */}
      <FullScreenModal isOpen={isIssueDialogOpen} onClose={() => setIsIssueDialogOpen(false)} title="Issue New Corporate Card">
        <div className="space-y-6">
          <div className="text-center">
            <div className="mx-auto w-16 h-16 bg-electric-100 rounded-2xl flex items-center justify-center mb-4">
              <CreditCard className="w-8 h-8 text-electric-600"/>
            </div>
            <p className="text-muted-foreground">
              Create a virtual corporate card with spending limits and smart controls
            </p>
          </div>

          <form onSubmit={(e) => {
            e.preventDefault();
            handleIssueCard(new FormData(e.currentTarget));
        }} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="user_id">Select User</Label>
                <Select name="user_id" required>
                  <SelectTrigger className="focus:ring-electric-500 focus:border-electric-500">
                    <SelectValue placeholder="Choose a team member"/>
                  </SelectTrigger>
                  <SelectContent>
                    {organizationUsers.map((user: SharedUserType) => (<SelectItem key={user.id} value={user.id.toString()}>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-electric-100 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-electric-600">
                              {user.username.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="font-medium">{user.username}</span>
                            <span className="text-xs text-muted-foreground">{user.email}</span>
                          </div>
                        </div>
                      </SelectItem>))}
                  </SelectContent>
                </Select>
                <input type="hidden" name="cardholder_name" value=""/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="spend_limit">Spending Limit ($)</Label>
                <Input id="spend_limit" name="spend_limit" type="number" min="10" required className="focus:ring-electric-500 focus:border-electric-500"/>
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Limit Interval</Label>
                <Select name="interval">
                  <SelectTrigger className="focus:ring-electric-500 focus:border-electric-500">
                    <SelectValue placeholder="Select interval"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="yearly">Yearly</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="purpose">Purpose</Label>
                <Select name="purpose" required>
                  <SelectTrigger className="focus:ring-electric-500 focus:border-electric-500">
                    <SelectValue placeholder="Select card purpose"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="travel">Travel & Transportation</SelectItem>
                    <SelectItem value="office_supplies">Office Supplies</SelectItem>
                    <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                    <SelectItem value="software">Software & Subscriptions</SelectItem>
                    <SelectItem value="meals">Meals & Entertainment</SelectItem>
                    <SelectItem value="equipment">Equipment & Hardware</SelectItem>
                    <SelectItem value="training">Training & Development</SelectItem>
                    <SelectItem value="consulting">Consulting & Services</SelectItem>
                    <SelectItem value="utilities">Utilities & Operations</SelectItem>
                    <SelectItem value="other">Other Business Expenses</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Select name="department" required>
                  <SelectTrigger className="focus:ring-electric-500 focus:border-electric-500">
                    <SelectValue placeholder="Select department"/>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="engineering">Engineering</SelectItem>
                    <SelectItem value="sales">Sales</SelectItem>
                    <SelectItem value="marketing">Marketing</SelectItem>
                    <SelectItem value="operations">Operations</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="hr">Human Resources</SelectItem>
                    <SelectItem value="design">Design</SelectItem>
                    <SelectItem value="product">Product</SelectItem>
                    <SelectItem value="customer_success">Customer Success</SelectItem>
                    <SelectItem value="legal">Legal</SelectItem>
                    <SelectItem value="executive">Executive</SelectItem>
                    <SelectItem value="it">IT Support</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-6">
              <PrimaryButton type="submit" variant="primary" size="lg" loading={issueCardMutation.isPending} className="flex-1">
                {issueCardMutation.isPending ? "Creating Card..." : "Issue Corporate Card"}
              </PrimaryButton>
              <PrimaryButton type="button" variant="ghost" size="lg" onClick={() => setIsIssueDialogOpen(false)}>
                Cancel
              </PrimaryButton>
            </div>
          </form>
        </div>
      </FullScreenModal>

      {/* Card Management Modal */}
      <FullScreenModal isOpen={isManageDialogOpen} onClose={() => setIsManageDialogOpen(false)} title="Card Settings">
        {selectedCard && (<div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-electric-100 rounded-2xl flex items-center justify-center mb-4">
                <Settings className="w-8 h-8 text-electric-600"/>
              </div>
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white">
                {selectedCard.cardholder_name}
              </h3>
              <p className="text-muted-foreground">{selectedCard.card_number_masked}</p>
            </div>

            <div className="space-y-6">
              {/* Card Status and Actions */}
              <div className="bg-gray-50 dark:bg-navy-800 rounded-xl p-6">
                <h4 className="font-semibold mb-4">Card Controls</h4>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <Label className="text-sm text-muted-foreground">Current Status</Label>
                    <p className="font-medium text-lg">{selectedCard.status}</p>
                  </div>
                  <div>
                    <Label className="text-sm text-muted-foreground">Available Balance</Label>
                    <p className="font-medium text-lg text-green-600">
                      {formatCurrency(selectedCard.available_balance || 0)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <PrimaryButton variant={selectedCard.status === 'active' ? 'danger' : 'primary'} size="sm" onClick={() => freezeCardMutation.mutate({ cardId: selectedCard.id, freeze: selectedCard.status === 'active' })} loading={freezeCardMutation.isPending} className="flex-1">
                    {selectedCard.status === 'active' ? (<>
                        <XCircle className="w-4 h-4 mr-2"/>
                        Freeze Card
                      </>) : (<>
                        <CheckCircle className="w-4 h-4 mr-2"/>
                        Unfreeze Card
                      </>)}
                  </PrimaryButton>

                  <PrimaryButton variant="secondary" size="sm" className="flex-1" onClick={() => setIsAddFundsDialogOpen(true)}>
                    <DollarSign className="w-4 h-4 mr-2"/>
                    Add Funds
                  </PrimaryButton>
                </div>
              </div>

              {/* Spending Limits */}
              <div className="bg-gray-50 dark:bg-navy-800 rounded-xl p-6">
                <h4 className="font-semibold mb-4">Spending Limits</h4>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="spending_limit">Spending Limit</Label>
                    <Input id="spending_limit" type="number" step="0.01" defaultValue={selectedCard.spending_limit || 0} className="mt-1"/>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="interval">Limit Interval</Label>
                      <Select defaultValue="monthly">
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="monthly">Monthly</SelectItem>
                          <SelectItem value="yearly">Yearly</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="purpose">Purpose</Label>
                      <Select defaultValue={selectedCard.purpose || 'general'}>
                        <SelectTrigger className="mt-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="travel">Travel & Transportation</SelectItem>
                          <SelectItem value="office_supplies">Office Supplies</SelectItem>
                          <SelectItem value="marketing">Marketing & Advertising</SelectItem>
                          <SelectItem value="software">Software & Subscriptions</SelectItem>
                          <SelectItem value="meals">Meals & Entertainment</SelectItem>
                          <SelectItem value="equipment">Equipment & Hardware</SelectItem>
                          <SelectItem value="general">General Business</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <PrimaryButton size="sm" className="w-full" onClick={() => {
                const spendingLimitInput = document.getElementById('spending_limit') as HTMLInputElement;
                const newLimit = parseFloat(spendingLimitInput.value); // Keep in dollars (don't multiply by 100)
                if (selectedCard && newLimit > 0) {
                    updateCardMutation.mutate({
                        cardId: selectedCard.id,
                        updateData: { spend_limit: newLimit }
                    });
                }
            }}>
                    Update Limits
                  </PrimaryButton>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-6">
              <PrimaryButton variant="danger" onClick={() => {
                if (confirm("Are you sure you want to permanently delete this card? This action cannot be undone.")) {
                    deleteCardMutation.mutate(selectedCard.id);
                }
            }} loading={deleteCardMutation.isPending}>
                Delete Card
              </PrimaryButton>
              <PrimaryButton variant="ghost" onClick={() => setIsManageDialogOpen(false)}>
                Close
              </PrimaryButton>
            </div>
          </div>)}
      </FullScreenModal>

      {/* Card Details Modal */}
      <FullScreenModal isOpen={showCardDetails} onClose={() => setShowCardDetails(false)} title="Card Details">
        {selectedCard && (<div className="space-y-6">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 bg-electric-100 rounded-2xl flex items-center justify-center mb-4">
                <CreditCard className="w-8 h-8 text-electric-600"/>
              </div>
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white">
                {selectedCard.cardholder_name}
              </h3>
              <p className="text-muted-foreground">{selectedCard.card_number_masked}</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-navy-800 rounded-xl p-4">
                  <h4 className="font-semibold mb-3">Card Information</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status</span>
                      <span className="font-medium">{selectedCard.status}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Card Type</span>
                      <span className="font-medium">{selectedCard.card_type || 'Virtual'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Provider</span>
                      <span className="font-medium">{selectedCard.card_provider || 'Stripe'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Currency</span>
                      <span className="font-medium">{selectedCard.currency || 'USD'}</span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-navy-800 rounded-xl p-4">
                  <h4 className="font-semibold mb-3">Usage Details</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Purpose</span>
                      <span className="font-medium">{selectedCard.purpose || 'General'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Department</span>
                      <span className="font-medium">{selectedCard.department || 'Not specified'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost Center</span>
                      <span className="font-medium">{selectedCard.cost_center || 'Not specified'}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-navy-800 rounded-xl p-4">
                  <h4 className="font-semibold mb-3">Financial Information</h4>
                  <div className="space-y-3">
                    
                  <div className="flex justify-between">
                      <span className="text-muted-foreground">Available Balance</span>
                      <span className="font-medium text-green-600">
                        ${typeof selectedCard.available_balance === 'number' ? (selectedCard.available_balance >= 100 ? (selectedCard.available_balance / 100).toFixed(2) : selectedCard.available_balance.toFixed(2)) : '0.00'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Spending Limit</span>
                      <span className="font-medium">
                        ${typeof selectedCard.spending_limit === 'number' ? (selectedCard.spending_limit >= 100 ? (selectedCard.spending_limit / 100).toFixed(2) : selectedCard.spending_limit.toFixed(2)) : '0.00'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Usage</span>
                      <span className="font-medium">
                        {((selectedCard.spending_limit - selectedCard.available_balance) / selectedCard.spending_limit * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-navy-800 rounded-xl p-4">
                  <h4 className="font-semibold mb-3">Security & Controls</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Auto-lock</span>
                      <span className="font-medium">
                        {selectedCard.auto_lock_triggers ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created</span>
                      <span className="font-medium">
                        {new Date(selectedCard.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-6">
              <PrimaryButton variant="ghost" onClick={() => setShowCardDetails(false)}>
                Close
              </PrimaryButton>
            </div>
          </div>)}
      </FullScreenModal>

      {/* Add Funds Dialog */}
      <Dialog open={isAddFundsDialogOpen} onOpenChange={setIsAddFundsDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-electric-600"/>
              Add Funds to Card
            </DialogTitle>
            <DialogDescription>
              Add funds to {selectedCard?.cardholder_name}'s corporate card
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="amount">Amount ($)</Label>
              <Input id="amount" type="number" step="0.01" min="0.01" placeholder="Enter amount" value={addFundsAmount} onChange={(e) => setAddFundsAmount(e.target.value)} className="mt-1"/>
            </div>

            {selectedCard && (<div className="bg-gray-50 dark:bg-navy-800 rounded-lg p-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Current Balance</span>
                    <p className="font-medium">{formatCurrency(selectedCard.available_balance || 0)}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">New Balance</span>
                    <p className="font-medium text-green-600">
                      {formatCurrency((selectedCard.available_balance || 0) + (parseFloat(addFundsAmount) || 0))}
                    </p>
                  </div>
                </div>
              </div>)}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => {
            setIsAddFundsDialogOpen(false);
            setAddFundsAmount("");
        }}>
              Cancel
            </Button>
            <PrimaryButton onClick={() => {
            if (selectedCard && addFundsAmount) {
                addFundsMutation.mutate({
                    cardId: selectedCard.id,
                    amount: parseFloat(addFundsAmount)
                });
            }
        }} loading={addFundsMutation.isPending} disabled={!addFundsAmount || parseFloat(addFundsAmount) <= 0}>
              <DollarSign className="w-4 h-4 mr-2"/>
              Add ${addFundsAmount || '0.00'}
            </PrimaryButton>
          </div>
        </DialogContent>
      </Dialog>
    </div>);
}
