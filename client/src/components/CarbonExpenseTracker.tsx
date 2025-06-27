import SharedOptionType from '@/types/SharedOptionType';
import SharedRecType from '@/types/SharedRecType';
import SharedActivitiesType from '@/types/SharedActivitiesType';
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
import { Receipt, Plus, TrendingUp, TrendingDown, ExternalLink as ExternalLinkIcon, Leaf, DollarSign, BarChart2, FileText, CheckCircle, BarChart3, PieChart, Download, Target } from 'lucide-react'; // Added Target icon
import { PieChart as RechartsPieChart, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line } from 'recharts';

// Type definitions
interface CarbonData {
  totalEmissions: number;
  comparison?: {
    reductionPotential?: number;
    offsetCost?: number;
  };
  breakdown: Record<string, number>;
  recommendations?: string[];
}

interface ExpenseData {
  totalCost: number;
  currency: string;
  expenses: Expense[];
  breakdown?: Record<string, number>;
  categories?: Record<string, number>;
  receipts?: Array<{
    id: string;
    url: string;
    uploadedAt: string;
  }>;
}

interface Expense {
  id: string;
  amount: number;
  category: string;
  description: string;
  vendor: string;
  date: string;
}

interface OffsetOption {
  id: string;
  name: string;
  description: string;
  costPerTon: number;
  type: string;
}

const COLORS = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c'] as const;
interface CarbonExpenseTrackerProps {
  tripId: number;
  activities: SharedActivitiesType[];
  budget?: number;
}

interface CarbonTrackingTabProps {
  carbonData: CarbonData | null;
}

interface NewExpense {
  amount: string;
  category: string;
  description: string;
  vendor: string;
}

interface ExpenseFormData extends Omit<Expense, 'id' | 'date'> {
  // This is the type for the expense data after form submission
}

interface ExpenseManagementTabProps {
  expenseData: ExpenseData | null;
  budget: number | undefined;
  newExpense: NewExpense;
  setNewExpense: (expense: NewExpense) => void;
  onAddExpense: (expense: Omit<Expense, 'id' | 'date'>) => void;
  isAdding: boolean;
}

interface CarbonOffsetsTabProps {
  offsetOptions: OffsetOption[] | null;
  carbonFootprint: number;
  onPurchaseOffset: (offsetData: { optionId: string; amount: number }) => void;
  isPurchasing: boolean;
}

interface ReportsTabProps {
  carbonData: CarbonData | null;
  expenseData: ExpenseData | null;
}
export default function CarbonExpenseTracker({ tripId, activities, budget }: CarbonExpenseTrackerProps) {
    const [selectedTab, setSelectedTab] = useState('carbon');
    const [newExpense, setNewExpense] = useState<NewExpense>({
        amount: '',
        category: '',
        description: '',
        vendor: ''
    });
    // Fetch carbon footprint data
    const { data: carbonData, isLoading: carbonLoading } = useQuery<CarbonData>({
        queryKey: ['/api/carbon/footprint', tripId],
        enabled: !!tripId
    });
    // Fetch expense data
    const { data: expenseData, isLoading: expenseLoading } = useQuery<ExpenseData>({
        queryKey: ['/api/expenses/report', tripId],
        enabled: !!tripId,
        initialData: {
          totalCost: 0,
          currency: 'USD',
          expenses: [],
          receipts: []
        }
    });
    // Fetch offset options
    const { data: offsetOptions, isLoading: offsetLoading } = useQuery<OffsetOption[]>({
        queryKey: ['/api/carbon/offsets', tripId],
        enabled: !!tripId && !!carbonData
    });
    // Add expense mutation
    const addExpenseMutation = useMutation({
        mutationFn: (expense: ExpenseFormData) =>
          apiRequest('/api/expenses', 'POST', { 
            ...expense, 
            tripId, 
            date: new Date().toISOString() 
          }),
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['/api/expenses/report', tripId] });
          setNewExpense({ amount: '', category: '', description: '', vendor: '' });
        },
      });
    // Purchase offset mutation
    const purchaseOffsetMutation = useMutation({
        mutationFn: (offsetData: { optionId: string; amount: number }) => 
            apiRequest('/api/carbon/offsets/purchase', 'POST', { tripId, ...offsetData }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['/api/carbon/footprint', tripId] });
            queryClient.invalidateQueries({ queryKey: ['/api/carbon/offsets', tripId] });
        }
    });
    const COLORS = ['#2563eb', '#dc2626', '#059669', '#7c3aed', '#ea580c'];
    if (carbonLoading || expenseLoading) {
        return (<Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Leaf className="w-5 h-5 text-green-600"/>
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
      </Card>);
    }
    return (<div className="space-y-6">
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
              <Leaf className="w-8 h-8 text-green-600"/>
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
              <DollarSign className="w-8 h-8 text-blue-600"/>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">vs Average Trip</p>
                <p className="text-2xl font-bold text-electric-600">
                  {carbonData?.comparison?.reductionPotential ? (carbonData.comparison.reductionPotential > 0 ? '-' : '+') : ''}
                  {Math.abs(carbonData?.comparison?.reductionPotential || 0)}%
                </p>
                <p className="text-xs text-gray-500">Carbon impact</p>
              </div>
              <Target className="w-8 h-8 text-electric-600"/>
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
              <BarChart3 className="w-8 h-8 text-orange-600"/>
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
              <CarbonTrackingTab carbonData={carbonData || null}/>
            </TabsContent>

            <TabsContent value="expenses" className="space-y-6">
              <ExpenseManagementTab 
              expenseData={expenseData || null} 
              budget={budget} 
              newExpense={newExpense} 
              setNewExpense={setNewExpense} 
              onAddExpense={(expense) => addExpenseMutation.mutate(expense)} 
              isAdding={addExpenseMutation.isPending}
            />
            </TabsContent>

            <TabsContent value="offsets" className="space-y-6">
              <CarbonOffsetsTab 
              offsetOptions={offsetOptions as OffsetOption[] | null} 
              carbonFootprint={carbonData?.totalEmissions || 0} 
              onPurchaseOffset={(offsetData) => purchaseOffsetMutation.mutate(offsetData)} 
              isPurchasing={purchaseOffsetMutation.isPending}
            />
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <ReportsTab carbonData={carbonData || null} expenseData={expenseData || null}/>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>);
}
function CarbonTrackingTab({ carbonData }: CarbonTrackingTabProps) {
    if (!carbonData) {
        return <div className="text-center py-8 text-gray-500">No carbon data available yet.</div>;
    }
    const { breakdown, comparison, recommendations } = carbonData;
    const chartData = Object.entries(breakdown || {}).map(([key, value]) => ({
        name: key.charAt(0).toUpperCase() + key.slice(1),
        value: value as number,
        percentage: Math.round(((value as number) / carbonData.totalEmissions) * 100)
    }));
    return (<div className="space-y-6">
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
                  {chartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]}/>))}
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
              <Badge className={(comparison?.reductionPotential ?? 0) > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                {(comparison?.reductionPotential ?? 0) > 0 ? '-' : '+'}
                {Math.abs(comparison?.reductionPotential ?? 0)}%
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
              <Progress value={comparison?.reductionPotential ?? 0} className="h-2"/>
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
            {recommendations?.map((rec: SharedRecType, index: number) => (<Alert key={index}>
                <Leaf className="w-4 h-4"/>
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
              </Alert>))}
          </div>
        </CardContent>
      </Card>
    </div>);
}
function ExpenseManagementTab({ expenseData = { totalCost: 0, currency: 'USD', expenses: [], receipts: [] }, budget, newExpense, setNewExpense, onAddExpense, isAdding }: ExpenseManagementTabProps) {
    const categories = ['flights', 'accommodation', 'meals', 'transportation', 'activities', 'miscellaneous'] as const;
  
  // Ensure expenseData.receipts is always defined
  const receipts = expenseData?.receipts || [];
    const handleCategoryChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
      setNewExpense({
        ...newExpense,
        category: e.target.value
      });
    };
    
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setNewExpense({
        ...newExpense,
        [e.target.name]: e.target.value
      });
    };
    
    const handleSubmitExpense = () => {
      if (!newExpense.amount || !newExpense.category) return;
      
      const expenseData: Omit<Expense, 'id' | 'date'> = {
        amount: parseFloat(newExpense.amount) || 0,
        category: newExpense.category,
        description: newExpense.description || '',
        vendor: newExpense.vendor || ''
      };
      onAddExpense(expenseData);
    };
    return (<div className="space-y-6">
      {/* Quick Add Expense */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Add New Expense</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input id="amount" type="number" placeholder="0.00" value={newExpense.amount} onChange={handleInputChange}/>
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <select id="category" className="w-full p-2 border rounded-md" value={newExpense.category} onChange={handleCategoryChange}>
                <option value="">Select category</option>
                {categories.map(cat => (<option key={cat} value={cat}>
                    {cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </option>))}
              </select>
            </div>
            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input id="vendor" placeholder="Vendor name" value={newExpense.vendor} onChange={handleInputChange}/>
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleSubmitExpense} 
                disabled={isAdding || !newExpense.amount || !newExpense.category} 
                className="w-full"
              >
                <Receipt className="w-4 h-4 mr-2"/>
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
              {expenseData.breakdown ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart 
                    data={Object.entries(expenseData.breakdown).map(([key, value]) => ({
                      category: key.charAt(0).toUpperCase() + key.slice(1),
                      amount: value as number
                    }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="amount" fill="#2563eb" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No spending data available
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Budget Overview</CardTitle>
            </CardHeader>
            <CardContent>
              {expenseData.breakdown ? (
                <div className="space-y-4">
                  {Object.entries(expenseData.breakdown).map(([category, amount], index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{category}</span>
                        <span>${amount}</span>
                      </div>
                      {budget && expenseData?.breakdown && (
                        <>
                          <Progress 
                            value={Math.min((amount / (budget / Object.keys(expenseData.breakdown).length)) * 100, 100)} 
                            className="h-2" 
                          />
                          <div className="text-xs text-gray-500">
                            {budget && `Budget: $${(budget / Object.keys(expenseData.breakdown).length).toFixed(2)}`}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No budget data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Receipts */}
      {receipts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Receipts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {receipts.slice(0, 5).map((receipt, index) => (
                <div key={receipt.id || index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <div className="font-medium">Receipt #{index + 1}</div>
                    <div className="text-sm text-gray-500">
                      Uploaded on {new Date(receipt.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                  <a 
                    href={receipt.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline flex items-center"
                  >
                    <span className="mr-1">View</span>
                    <ExternalLinkIcon className="w-4 h-4" />
                  </a>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>);
}
function CarbonOffsetsTab({ offsetOptions, carbonFootprint, onPurchaseOffset, isPurchasing }: CarbonOffsetsTabProps) {
    return (<div className="space-y-6">
      <Alert>
        <Leaf className="w-4 h-4"/>
        <AlertDescription>
          Your trip generated <strong>{carbonFootprint} kg CO₂</strong>. Consider purchasing carbon offsets to neutralize your environmental impact.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {offsetOptions?.map((option: SharedOptionType, index: number) => (<Card key={index} className="relative">
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

                <Button className="w-full" onClick={() => onPurchaseOffset(option)} disabled={isPurchasing}>
                  {isPurchasing ? 'Processing...' : 'Purchase Offset'}
                </Button>
              </div>
            </CardContent>
          </Card>))}
      </div>
    </div>);
}
function ReportsTab({ carbonData, expenseData }: ReportsTabProps) {
    return (<div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Sustainability & Financial Reports</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2"/>
            Export Carbon Report
          </Button>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2"/>
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
              <p className="text-sm text-gray-500">
                {carbonData?.comparison?.offsetCost ? `$${carbonData.comparison.offsetCost.toFixed(2)} to offset` : 'Calculating offset cost...'}
              </p>
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
                <CheckCircle className="w-3 h-3 mr-1"/>
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
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2"/>
              <div className="font-medium">Policy Compliant</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">All expenses within limits</div>
            </div>
            <div className="text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <Receipt className="w-8 h-8 text-blue-600 mx-auto mb-2"/>
              <div className="font-medium">Receipts Complete</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">100% documentation</div>
            </div>
            <div className="text-center p-4 bg-electric-50 dark:bg-electric-900/20 rounded-lg">
              <Leaf className="w-8 h-8 text-electric-600 mx-auto mb-2"/>
              <div className="font-medium">Sustainability Goals</div>
              <div className="text-sm text-gray-600 dark:text-gray-300">On track for carbon targets</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>);
}
