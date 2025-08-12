import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { DollarSign, AlertTriangle, TrendingUp, TrendingDown, Receipt, Users } from 'lucide-react';
import { ClientTrip, BudgetSummary } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

interface BudgetTrackerProps {
  trip: ClientTrip;
  onBudgetUpdate?: () => void;
}

const CATEGORY_COLORS = {
  accommodation: '#3B82F6',
  transportation: '#10B981',
  food: '#F59E0B',
  activities: '#8B5CF6',
  shopping: '#EC4899',
  other: '#6B7280',
};

const CATEGORY_ICONS = {
  accommodation: '🏨',
  transportation: '🚗',
  food: '🍔',
  activities: '🎟️',
  shopping: '🛍️',
  other: '📦',
};

export default function BudgetTracker({ trip, onBudgetUpdate }: BudgetTrackerProps) {
  const [budgetSummary, setBudgetSummary] = useState<BudgetSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [showBudgetDialog, setShowBudgetDialog] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    budget: trip.budget || 0,
    currency: trip.currency || 'USD',
    categories: trip.budgetCategories || {},
    alertThreshold: trip.budgetAlertThreshold || 80,
  });
  const { toast } = useToast();

  useEffect(() => {
    if (trip.budget) {
      fetchBudgetSummary();
    }
  }, [trip.id, trip.budget]);

  const fetchBudgetSummary = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/budget/trips/${trip.id}/budget/summary`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setBudgetSummary(data);
      }
    } catch (error) {
      console.error('Failed to fetch budget summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBudgetUpdate = async () => {
    try {
      const response = await fetch(`/api/budget/trips/${trip.id}/budget`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({
          budget: budgetForm.budget,
          currency: budgetForm.currency,
          budget_categories: budgetForm.categories,
          budget_alert_threshold: budgetForm.alertThreshold,
        }),
      });

      if (response.ok) {
        toast({
          title: 'Budget updated',
          description: 'Your trip budget has been updated successfully.',
        });
        setShowBudgetDialog(false);
        fetchBudgetSummary();
        onBudgetUpdate?.();
      } else {
        throw new Error('Failed to update budget');
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update budget. Please try again.',
        variant: 'destructive',
      });
    }
  };

  if (!trip.budget && !showBudgetDialog) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <DollarSign className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-semibold mb-2">No budget set</h3>
            <p className="text-gray-600 mb-4">Track your expenses and stay within budget</p>
            <Button onClick={() => setShowBudgetDialog(true)}>
              Set Trip Budget
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const getProgressColor = (percent: number) => {
    if (percent >= 100) return 'bg-red-500';
    if (percent >= (budgetSummary?.alertThreshold || 80)) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const formatCurrency = (amount: number, currency = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount);
  };

  const pieData = budgetSummary
    ? Object.entries(budgetSummary.spendingByCategory)
        .filter(([_, amount]) => amount > 0)
        .map(([category, amount]) => ({
          name: category,
          value: amount,
          percentage: ((amount / budgetSummary.totalSpent) * 100).toFixed(1),
        }))
    : [];

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Budget Tracker</CardTitle>
              <CardDescription>
                {budgetSummary && (
                  <>
                    {formatCurrency(budgetSummary.remaining, budgetSummary.currency)} remaining
                  </>
                )}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowBudgetDialog(true)}>
              Edit Budget
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              <div className="h-4 bg-gray-200 rounded animate-pulse" />
              <div className="h-32 bg-gray-200 rounded animate-pulse" />
            </div>
          ) : budgetSummary ? (
            <div className="space-y-6">
              {/* Progress Bar */}
              <div>
                <div className="flex justify-between text-sm mb-2">
                  <span>{formatCurrency(budgetSummary.totalSpent, budgetSummary.currency)} spent</span>
                  <span>{formatCurrency(budgetSummary.budget, budgetSummary.currency)} budget</span>
                </div>
                <Progress 
                  value={budgetSummary.percentUsed} 
                  className={`h-3 ${getProgressColor(budgetSummary.percentUsed)}`} 
                />
                <div className="text-center text-sm text-gray-600 mt-1">
                  {budgetSummary.percentUsed.toFixed(1)}% used
                </div>
              </div>

              {/* Alert if over threshold */}
              {budgetSummary.percentUsed >= budgetSummary.alertThreshold && (
                <Alert className={budgetSummary.percentUsed >= 100 ? 'border-red-500' : 'border-yellow-500'}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    {budgetSummary.percentUsed >= 100
                      ? `You've exceeded your budget by ${formatCurrency(Math.abs(budgetSummary.remaining), budgetSummary.currency)}`
                      : `You've used ${budgetSummary.percentUsed.toFixed(1)}% of your budget`}
                  </AlertDescription>
                </Alert>
              )}

              {/* Spending by Category */}
              {pieData.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold mb-3">Spending by Category</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="h-48">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={70}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry, index) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={CATEGORY_COLORS[entry.name as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other} 
                              />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => formatCurrency(value, budgetSummary.currency)} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="space-y-2">
                      {pieData.map((category) => (
                        <div key={category.name} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: CATEGORY_COLORS[category.name as keyof typeof CATEGORY_COLORS] || CATEGORY_COLORS.other }}
                            />
                            <span className="capitalize">
                              {CATEGORY_ICONS[category.name as keyof typeof CATEGORY_ICONS]} {category.name}
                            </span>
                          </div>
                          <span className="font-medium">
                            {formatCurrency(category.value, budgetSummary.currency)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Daily Average */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div>
                  <div className="text-sm text-gray-600">Daily Average</div>
                  <div className="text-lg font-semibold">
                    {formatCurrency(
                      budgetSummary.totalSpent / Math.max(1, new Date().getDate() - new Date(budgetSummary.startDate).getDate() + 1),
                      budgetSummary.currency
                    )}
                  </div>
                </div>
                <div>
                  <div className="text-sm text-gray-600">Projected Total</div>
                  <div className="text-lg font-semibold flex items-center gap-1">
                    {formatCurrency(
                      (budgetSummary.totalSpent / Math.max(1, new Date().getDate() - new Date(budgetSummary.startDate).getDate() + 1)) *
                      (new Date(budgetSummary.endDate).getDate() - new Date(budgetSummary.startDate).getDate() + 1),
                      budgetSummary.currency
                    )}
                    {budgetSummary.percentUsed < 50 ? (
                      <TrendingDown className="w-4 h-4 text-green-500" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              {budgetSummary.groupExpensesCount > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1">
                    <Users className="w-4 h-4 mr-2" />
                    Group Expenses ({budgetSummary.groupExpensesCount})
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1">
                    <Receipt className="w-4 h-4 mr-2" />
                    Add Expense
                  </Button>
                </div>
              )}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Budget Settings Dialog */}
      <Dialog open={showBudgetDialog} onOpenChange={setShowBudgetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Set Trip Budget</DialogTitle>
            <DialogDescription>
              Define your budget and spending categories for this trip
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="budget">Total Budget</Label>
                <Input
                  id="budget"
                  type="number"
                  min="0"
                  step="100"
                  value={budgetForm.budget}
                  onChange={(e) => setBudgetForm({ ...budgetForm, budget: parseFloat(e.target.value) || 0 })}
                />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <select
                  id="currency"
                  className="w-full h-10 px-3 rounded-md border border-input bg-background"
                  value={budgetForm.currency}
                  onChange={(e) => setBudgetForm({ ...budgetForm, currency: e.target.value })}
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="JPY">JPY (¥)</option>
                  <option value="AUD">AUD (A$)</option>
                  <option value="CAD">CAD (C$)</option>
                </select>
              </div>
            </div>

            <div>
              <Label htmlFor="alertThreshold">Alert Threshold (%)</Label>
              <Input
                id="alertThreshold"
                type="number"
                min="50"
                max="100"
                step="5"
                value={budgetForm.alertThreshold}
                onChange={(e) => setBudgetForm({ ...budgetForm, alertThreshold: parseInt(e.target.value) || 80 })}
              />
              <p className="text-sm text-gray-600 mt-1">
                Get notified when spending exceeds {budgetForm.alertThreshold}%
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowBudgetDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleBudgetUpdate}>
                Save Budget
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}