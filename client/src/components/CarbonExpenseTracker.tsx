import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Leaf, 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Camera,
  Download,
  Upload,
  Target,
  AlertCircle,
  CheckCircle,
  BarChart3,
  PieChart,
  Receipt
} from 'lucide-react';
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';

interface CarbonExpenseTrackerProps {
  tripId: number;
  activities: any[];
  budget?: number;
}

export default function CarbonExpenseTracker({ tripId, activities, budget }: CarbonExpenseTrackerProps) {
  const [selectedTab, setSelectedTab] = useState('carbon');
  const [newExpense, setNewExpense] = useState({
    amount: '',
    category: '',
    description: '',
    vendor: ''
  });

  // Fetch carbon footprint data
  const { data: carbonData, isLoading: carbonLoading } = useQuery({
    queryKey: ['/api/carbon/footprint', tripId],
    enabled: !!tripId
  });

  // Fetch expense data
  const { data: expenseData, isLoading: expenseLoading } = useQuery({
    queryKey: ['/api/expenses/report', tripId],
    enabled: !!tripId
  });

  // Fetch offset options
  const { data: offsetOptions, isLoading: offsetLoading } = useQuery({
    queryKey: ['/api/carbon/offsets', tripId],
    enabled: !!tripId && !!carbonData
  });

  // Add expense mutation
  const addExpenseMutation = useMutation({
    mutationFn: (expense: any) => apiRequest('POST', '/api/expenses/add', { tripId, ...expense }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/expenses/report', tripId] });
      setNewExpense({ amount: '', category: '', description: '', vendor: '' });
    }
  });

  // Purchase offset mutation
  const purchaseOffsetMutation = useMutation({
    mutationFn: (offsetData: any) => apiRequest('POST', '/api/carbon/purchase-offset', { tripId, ...offsetData }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/carbon/footprint', tripId] });
    }
  });

  const COLORS = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c'];

  if (carbonLoading || expenseLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600" />
            Carbon & Expense Tracking
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-3/4"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded animate-pulse w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Carbon Footprint</p>
                <p className="text-2xl font-bold text-green-600">
                  {carbonData?.totalEmissions || 0} kg
                </p>
                <p className="text-xs text-gray-500">CO₂ equivalent</p>
              </div>
              <Leaf className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Expenses</p>
                <p className="text-2xl font-bold text-blue-600">
                  ${expenseData?.totalCost || 0}
                </p>
                <p className="text-xs text-gray-500">{expenseData?.currency || 'USD'}</p>
              </div>
              <DollarSign className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">vs Average Trip</p>
                <p className="text-2xl font-bold text-purple-600">
                  {carbonData?.comparison?.reductionPotential ? '-' : '+'}
                  {Math.abs(carbonData?.comparison?.reductionPotential || 0)}%
                </p>
                <p className="text-xs text-gray-500">Carbon impact</p>
              </div>
              <Target className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Budget Status</p>
                <p className="text-2xl font-bold text-orange-600">
                  {budget ? Math.round(((expenseData?.totalCost || 0) / budget) * 100) : 0}%
                </p>
                <p className="text-xs text-gray-500">of ${budget || 0}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tracking Interface */}
      <Card>
        <CardContent className="pt-6">
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="carbon">Carbon Tracking</TabsTrigger>
              <TabsTrigger value="expenses">Expense Management</TabsTrigger>
              <TabsTrigger value="offsets">Carbon Offsets</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
            </TabsList>

            <TabsContent value="carbon" className="space-y-6">
              <CarbonTrackingTab carbonData={carbonData} />
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <ExpenseManagementTab 
                expenseData={expenseData}
                budget={budget}
                newExpense={newExpense}
                setNewExpense={setNewExpense}
                onAddExpense={(expense) => addExpenseMutation.mutate(expense)}
                isAdding={addExpenseMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="offsets" className="space-y-6">
              <CarbonOffsetsTab 
                offsetOptions={offsetOptions}
                carbonFootprint={carbonData?.totalEmissions || 0}
                onPurchaseOffset={(offsetData) => purchaseOffsetMutation.mutate(offsetData)}
                isPurchasing={purchaseOffsetMutation.isPending}
              />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <ReportsTab carbonData={carbonData} expenseData={expenseData} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function CarbonTrackingTab({ carbonData }: { carbonData: any }) {
  if (!carbonData) {
    return <div className="text-center py-8 text-gray-500">No carbon data available yet.</div>;
  }

  const { breakdown, comparison, recommendations } = carbonData;

  const chartData = Object.entries(breakdown || {}).map(([key, value]) => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    value: value as number,
    percentage: Math.round(((value as number) / carbonData.totalEmissions) * 100)
  }));

  return (
    <div className="space-y-6">
      {/* Emissions Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Emissions Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <RechartsPieChart>
                <RechartsPieChart data={chartData}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </RechartsPieChart>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Environmental Impact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <span>vs Average Trip</span>
              <Badge className={comparison?.reductionPotential > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {comparison?.reductionPotential > 0 ? '-' : '+'}
                {Math.abs(comparison?.reductionPotential || 0)}%
              </Badge>
            </div>
            
            <div className="flex justify-between items-center">
              <span>Offset Cost</span>
              <span className="font-bold">${comparison?.offsetCost || 0}</span>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm">Reduction Potential</span>
                <span className="text-sm">{comparison?.reductionPotential || 0}%</span>
              </div>
              <Progress value={comparison?.reductionPotential || 0} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Carbon Reduction Recommendations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recommendations?.map((rec: any, index: number) => (
              <Alert key={index}>
                <Leaf className="w-4 h-4" />
                <AlertDescription>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{rec.action}</div>
                      <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                        Potential saving: {rec.potentialSaving} kg CO₂
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Badge variant="outline" className="text-xs">
                        {rec.implementation}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rec.costImpact} cost
                      </Badge>
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExpenseManagementTab({ 
  expenseData, 
  budget, 
  newExpense, 
  setNewExpense, 
  onAddExpense, 
  isAdding 
}: any) {
  const categories = ['flights', 'accommodation', 'meals', 'transportation', 'activities', 'miscellaneous'];

  return (
    <div className="space-y-6">
      {/* Quick Add Expense */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="0.00"
                value={newExpense.amount}
                onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select
                id="category"
                className="w-full p-2 border rounded-md"
                value={newExpense.category}
                onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value })}
              >
                <option value="">Select category</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                placeholder="Vendor name"
                value={newExpense.vendor}
                onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={() => onAddExpense(newExpense)}
                disabled={isAdding || !newExpense.amount || !newExpense.category}
                className="w-full"
              >
                <Receipt className="w-4 h-4 mr-2" />
                {isAdding ? 'Adding...' : 'Add Expense'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expense Breakdown */}
      {expenseData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Spending by Category</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={Object.entries(expenseData.breakdown || {}).map(([key, value]) => ({
                  category: key.charAt(0).toUpperCase() + key.slice(1),
                  amount: value as number
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="category" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="amount" fill="#2563eb" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget vs Actual</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {expenseData.categories?.map((cat: any, index: number) => (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{cat.name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">${cat.actual}</span>
                        <Badge 
                          className={cat.status === 'under' ? 'bg-green-100 text-green-800' : 
                                   cat.status === 'over' ? 'bg-red-100 text-red-800' : 
                                   'bg-yellow-100 text-yellow-800'}
                        >
                          {cat.status}
                        </Badge>
                      </div>
                    </div>
                    <Progress 
                      value={(cat.actual / cat.budgeted) * 100} 
                      className="h-2"
                    />
                    <div className="text-xs text-gray-500">
                      Budget: ${cat.budgeted} | Variance: ${cat.variance}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Expenses */}
      {expenseData?.receipts && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {expenseData.receipts.slice(0, 5).map((receipt: any, index: number) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium">{receipt.description}</div>
                    <div className="text-sm text-gray-600 dark:text-gray-300">
                      {receipt.vendor} • {receipt.date}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold">${receipt.amount}</div>
                    <Badge variant="outline" className="text-xs">
                      {receipt.category}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function CarbonOffsetsTab({ offsetOptions, carbonFootprint, onPurchaseOffset, isPurchasing }: any) {
  return (
    <div className="space-y-6">
      <Alert>
        <Leaf className="w-4 h-4" />
        <AlertDescription>
          Your trip generated <strong>{carbonFootprint} kg CO₂</strong>. Consider purchasing carbon offsets to neutralize your environmental impact.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {offsetOptions?.map((option: any, index: number) => (
          <Card key={index} className="relative">
            <CardHeader>
              <CardTitle className="text-lg">{option.provider}</CardTitle>
              <CardDescription>{option.project}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">${option.cost}</div>
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    for {carbonFootprint} kg CO₂
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Quality</span>
                    <Badge>{option.quality}</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Certification</span>
                    <span className="text-xs text-gray-500">{option.certification}</span>
                  </div>
                </div>

                <Button 
                  className="w-full"
                  onClick={() => onPurchaseOffset(option)}
                  disabled={isPurchasing}
                >
                  {isPurchasing ? 'Processing...' : 'Purchase Offset'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ReportsTab({ carbonData, expenseData }: any) {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sustainability & Financial Reports</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Carbon Report
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export Expense Report
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sustainability Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Emissions</span>
              <span className="font-bold">{carbonData?.totalEmissions || 0} kg CO₂</span>
            </div>
            <div className="flex justify-between">
              <span>vs Industry Average</span>
              <span className="font-bold text-green-600">
                {carbonData?.comparison?.reductionPotential || 0}% better
              </span>
            </div>
            <div className="flex justify-between">
              <span>Offset Opportunities</span>
              <span className="font-bold">${carbonData?.comparison?.offsetCost || 0}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financial Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between">
              <span>Total Expenses</span>
              <span className="font-bold">${expenseData?.totalCost || 0}</span>
            </div>
            <div className="flex justify-between">
              <span>Tax Deductible</span>
              <span className="font-bold text-blue-600">
                ${Math.round((expenseData?.totalCost || 0) * 0.7)}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Compliance Status</span>
              <Badge className="bg-green-100 text-green-800">
                <CheckCircle className="w-3 h-3 mr-1" />
                Compliant
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Compliance Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Corporate Compliance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <div className="font-medium">Policy Compliant</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">All expenses within limits</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Receipt className="w-8 h-8 text-blue-600 mx-auto mb-2" />
              <div className="font-medium">Receipts Complete</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">100% documentation</div>
            </div>
            <div className="text-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <Leaf className="w-8 h-8 text-purple-600 mx-auto mb-2" />
              <div className="font-medium">Sustainability Goals</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">On track for carbon targets</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}