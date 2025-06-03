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
import { 
  CreditCard, 
  Plus, 
  Settings, 
  Eye, 
  EyeOff, 
  TrendingUp, 
  DollarSign, 
  Users, 
  Calendar,
  Receipt,
  AlertTriangle,
  CheckCircle,
  XCircle
} from "lucide-react";

interface CorporateCard {
  id: number;
  organization_id: number;
  user_id: number;
  card_number_masked: string;
  cardholder_name: string;
  card_status: string;
  spending_limit: number;
  remaining_limit: number;
  purpose: string;
  department: string;
  created_at: string;
  user: {
    username: string;
    email: string;
  };
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
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch corporate cards
  const { data: cards = [], isLoading: cardsLoading } = useQuery({
    queryKey: ["/api/corporate-card/cards"],
    queryFn: () => apiRequest("GET", "/api/corporate-card/cards").then(res => res.json()),
  });

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

  // Issue new card mutation
  const issueCardMutation = useMutation({
    mutationFn: (cardData: any) => 
      apiRequest("POST", "/api/corporate-card/issue", cardData).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Card Issued Successfully",
        description: "New corporate card has been issued and activated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/corporate-card/cards"] });
      setIsIssueDialogOpen(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Issue Card",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    },
  });

  // Freeze/unfreeze card mutation
  const freezeCardMutation = useMutation({
    mutationFn: ({ cardId, freeze }: { cardId: number; freeze: boolean }) =>
      apiRequest("POST", `/api/corporate-card/${cardId}/freeze`, { freeze }).then(res => res.json()),
    onSuccess: (_, { freeze }) => {
      toast({
        title: freeze ? "Card Frozen" : "Card Unfrozen",
        description: `Card has been ${freeze ? "frozen" : "unfrozen"} successfully.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/corporate-card/cards"] });
    },
  });

  // Approve expense mutation
  const approveExpenseMutation = useMutation({
    mutationFn: (approvalData: any) =>
      apiRequest("POST", "/api/expenses/approve", approvalData).then(res => res.json()),
    onSuccess: () => {
      toast({
        title: "Expense Processed",
        description: "Expense approval status updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
  });

  const handleIssueCard = (formData: FormData) => {
    const cardData = {
      user_id: parseInt(formData.get("user_id") as string),
      spend_limit: parseInt(formData.get("spend_limit") as string) * 100, // Convert to cents
      interval: formData.get("interval") as string,
      cardholder_name: formData.get("cardholder_name") as string,
      purpose: formData.get("purpose") as string,
      department: formData.get("department") as string,
    };
    issueCardMutation.mutate(cardData);
  };

  const formatCurrency = (amount: number, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount / 100);
  };

  const getStatusBadge = (status: string) => {
    const statusColors = {
      active: "bg-green-100 text-green-800",
      inactive: "bg-yellow-100 text-yellow-800",
      canceled: "bg-red-100 text-red-800",
      pending: "bg-blue-100 text-blue-800",
      approved: "bg-green-100 text-green-800",
      rejected: "bg-red-100 text-red-800",
    };
    return (
      <Badge className={statusColors[status as keyof typeof statusColors] || "bg-gray-100 text-gray-800"}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (cardsLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Corporate Cards</h1>
          <p className="text-muted-foreground">Manage company cards, expenses, and spending controls</p>
        </div>
        <Dialog open={isIssueDialogOpen} onOpenChange={setIsIssueDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Issue New Card
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Issue New Corporate Card</DialogTitle>
              <DialogDescription>
                Create a virtual corporate card with spending limits and controls.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={(e) => {
              e.preventDefault();
              handleIssueCard(new FormData(e.currentTarget));
            }} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="user_email">User Email</Label>
                <Input id="user_email" name="user_email" type="email" placeholder="employee@company.com" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cardholder_name">Cardholder Name</Label>
                <Input id="cardholder_name" name="cardholder_name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="spend_limit">Spending Limit ($)</Label>
                <Input id="spend_limit" name="spend_limit" type="number" min="10" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="interval">Limit Interval</Label>
                <Select name="interval">
                  <SelectTrigger>
                    <SelectValue placeholder="Select interval" />
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
                <Input id="purpose" name="purpose" placeholder="e.g., travel, office supplies" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input id="department" name="department" placeholder="e.g., sales, engineering" />
              </div>
              <Button type="submit" className="w-full" disabled={issueCardMutation.isPending}>
                {issueCardMutation.isPending ? "Issuing..." : "Issue Card"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Analytics Overview */}
      {analytics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Spending</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(analytics.total_spending?.total || 0)}
              </div>
              <p className="text-xs text-muted-foreground">
                {analytics.total_spending?.count || 0} transactions
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Cards</CardTitle>
              <CreditCard className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {cards.filter((card: CorporateCard) => card.card_status === 'active').length}
              </div>
              <p className="text-xs text-muted-foreground">
                {cards.length} total cards
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Approvals</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {expenses.filter((expense: Expense) => expense.approval_status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Require review
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {formatCurrency(
                  expenses
                    .filter((expense: Expense) => 
                      new Date(expense.transaction_date).getMonth() === new Date().getMonth()
                    )
                    .reduce((sum: number, expense: Expense) => sum + expense.amount, 0)
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Current month spending
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="expenses">Expenses</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map((card: CorporateCard) => (
              <Card key={card.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{card.cardholder_name}</CardTitle>
                      <CardDescription>{card.user?.email}</CardDescription>
                    </div>
                    {getStatusBadge(card.card_status)}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Card Number</span>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono text-sm">
                        {showCardDetails ? card.card_number_masked : "••••-••••-••••-••••"}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowCardDetails(!showCardDetails)}
                      >
                        {showCardDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Spending Limit</span>
                      <span className="font-medium">{formatCurrency(card.spending_limit)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Remaining</span>
                      <span className="font-medium text-green-600">
                        {formatCurrency(card.remaining_limit)}
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${((card.spending_limit - card.remaining_limit) / card.spending_limit) * 100}%`
                        }}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Purpose</span>
                    <span>{card.purpose || "General"}</span>
                  </div>

                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Department</span>
                    <span>{card.department || "—"}</span>
                  </div>

                  <div className="flex space-x-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => 
                        freezeCardMutation.mutate({ 
                          cardId: card.id, 
                          freeze: card.card_status === 'active' 
                        })
                      }
                      disabled={freezeCardMutation.isPending}
                    >
                      {card.card_status === 'active' ? 'Freeze' : 'Unfreeze'}
                    </Button>
                    <Button variant="outline" size="sm">
                      <Settings className="w-4 h-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Expenses Tab */}
        <TabsContent value="expenses" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Expenses</CardTitle>
              <CardDescription>Review and approve company expenses</CardDescription>
            </CardHeader>
            <CardContent>
              {expensesLoading ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full" />
                </div>
              ) : (
                <div className="space-y-4">
                  {expenses.map((expense: Expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center space-x-4">
                        <Receipt className="w-8 h-8 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{expense.merchant_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {expense.user?.username} • {expense.expense_category}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(expense.transaction_date).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(expense.amount)}</div>
                          {getStatusBadge(expense.approval_status)}
                        </div>
                        {expense.approval_status === 'pending' && (
                          <div className="flex space-x-2">
                            <Button
                              size="sm"
                              onClick={() => 
                                approveExpenseMutation.mutate({
                                  expense_id: expense.id,
                                  status: 'approved'
                                })
                              }
                              disabled={approveExpenseMutation.isPending}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Approve
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => 
                                approveExpenseMutation.mutate({
                                  expense_id: expense.id,
                                  status: 'rejected'
                                })
                              }
                              disabled={approveExpenseMutation.isPending}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Reject
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Spending by Category</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.category_breakdown?.map((category: any) => (
                  <div key={category.category} className="flex justify-between items-center py-2">
                    <span className="capitalize">{category.category}</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(category.total)}</div>
                      <div className="text-xs text-muted-foreground">{category.count} transactions</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Top Spenders</CardTitle>
              </CardHeader>
              <CardContent>
                {analytics?.user_breakdown?.map((user: any) => (
                  <div key={user.user_id} className="flex justify-between items-center py-2">
                    <span>{user.username}</span>
                    <div className="text-right">
                      <div className="font-medium">{formatCurrency(user.total)}</div>
                      <div className="text-xs text-muted-foreground">{user.count} transactions</div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}