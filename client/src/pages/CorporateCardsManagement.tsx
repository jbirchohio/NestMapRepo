import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, CreditCard, DollarSign, Lock, Unlock, Eye, EyeOff } from "lucide-react";
import { motion } from "framer-motion";

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

interface CardTransaction {
  id: number;
  amount: number;
  currency: string;
  merchant_name: string;
  merchant_category: string;
  status: string;
  transaction_type: string;
  created_at: string;
}

export default function CorporateCardsManagement() {
  const [selectedCard, setSelectedCard] = useState<CorporateCard | null>(null);
  const [showCreateCard, setShowCreateCard] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showTransactions, setShowTransactions] = useState(false);
  const [addFundsAmount, setAddFundsAmount] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch organization cards
  const { data: cards, isLoading } = useQuery({
    queryKey: ["/api/corporate-cards/cards"],
    queryFn: () => apiRequest("GET", "/api/corporate-cards/cards").then(res => res.json()),
  });

  // Fetch card transactions
  const { data: transactions } = useQuery({
    queryKey: ["/api/corporate-cards/cards", selectedCard?.id, "transactions"],
    queryFn: () => apiRequest("GET", `/api/corporate-cards/cards/${selectedCard?.id}/transactions`).then(res => res.json()),
    enabled: !!selectedCard,
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

  const handleAddFunds = () => {
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
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
        return "bg-green-100 text-green-800";
      case "frozen":
      case "inactive":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between"
        >
          <div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">
              Corporate Cards
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Manage corporate cards with Stripe Issuing integration
            </p>
          </div>
          <Button
            onClick={() => setShowCreateCard(true)}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Card
          </Button>
        </motion.div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards?.cards?.map((card: CorporateCard) => (
            <motion.div
              key={card.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              whileHover={{ scale: 1.02 }}
              className="cursor-pointer"
              onClick={() => setSelectedCard(card)}
            >
              <Card className="h-full border-0 shadow-lg bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 hover:shadow-xl transition-all duration-300">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold">
                      {card.cardholder_name}
                    </CardTitle>
                    <Badge className={getStatusColor(card.status)}>
                      {card.status.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-300">
                    <CreditCard className="w-4 h-4" />
                    <span>{card.card_number_masked}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Available Balance</p>
                      <p className="text-lg font-bold text-green-600">
                        ${(card.available_balance / 100).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 uppercase tracking-wide">Spending Limit</p>
                      <p className="text-lg font-bold text-gray-900 dark:text-white">
                        ${(card.spending_limit / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <Badge variant="outline" className="text-xs">
                      {card.card_type.toUpperCase()}
                    </Badge>
                    <span className="text-xs text-gray-500">
                      {card.user?.username || "Unassigned"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Card Details Dialog */}
        <Dialog open={!!selectedCard} onOpenChange={() => setSelectedCard(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5" />
                <span>Card Details - {selectedCard?.cardholder_name}</span>
              </DialogTitle>
            </DialogHeader>

            {selectedCard && (
              <div className="space-y-6">
                {/* Card Info */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <DollarSign className="w-8 h-8 mx-auto text-green-600 mb-2" />
                        <p className="text-sm text-gray-600">Available Balance</p>
                        <p className="text-xl font-bold text-green-600">
                          ${(selectedCard.available_balance / 100).toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <CreditCard className="w-8 h-8 mx-auto text-blue-600 mb-2" />
                        <p className="text-sm text-gray-600">Spending Limit</p>
                        <p className="text-xl font-bold">
                          ${(selectedCard.spending_limit / 100).toFixed(2)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <Badge className={`${getStatusColor(selectedCard.status)} mb-2`}>
                          {selectedCard.status.toUpperCase()}
                        </Badge>
                        <p className="text-sm text-gray-600">Card Status</p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="text-center">
                        <p className="text-sm text-gray-600 mb-2">Card Type</p>
                        <Badge variant="outline">
                          {selectedCard.card_type.toUpperCase()}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
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

                  <Button
                    onClick={() => setShowTransactions(true)}
                    variant="outline"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    View Transactions
                  </Button>
                </div>

                {/* Transactions List */}
                {showTransactions && transactions?.transactions && (
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Recent Transactions</h3>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {transactions.transactions.map((transaction: CardTransaction) => (
                        <Card key={transaction.id}>
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium">{transaction.merchant_name}</p>
                                <p className="text-sm text-gray-600">
                                  {transaction.merchant_category} • {transaction.transaction_type}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold">
                                  ${(transaction.amount / 100).toFixed(2)}
                                </p>
                                <Badge
                                  className={
                                    transaction.status === "completed"
                                      ? "bg-green-100 text-green-800"
                                      : "bg-yellow-100 text-yellow-800"
                                  }
                                >
                                  {transaction.status}
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Add Funds Dialog */}
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
                  onClick={handleAddFunds}
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
      </div>
    </div>
  );
}