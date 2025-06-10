import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Clock, Users, Zap } from 'lucide-react';

interface OptimizationResult {
  originalCost: number;
  optimizedCost: number;
  savings: number;
  savingsPercentage: number;
  timeReduction: number;
  carbonReduction: number;
  optimizations: Array<{
    type: 'route' | 'timing' | 'accommodation' | 'transport';
    description: string;
    savings: number;
    impact: 'high' | 'medium' | 'low';
  }>;
}

interface OptimizationSummaryProps {
  result: OptimizationResult;
  onApplyChanges: () => void;
  onReject: () => void;
  isLoading?: boolean;
}

export function OptimizationSummary({ result, onApplyChanges, onReject, isLoading }: OptimizationSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const getOptimizationIcon = (type: string) => {
    switch (type) {
      case 'route':
        return '🛣️';
      case 'timing':
        return '⏰';
      case 'accommodation':
        return '🏨';
      case 'transport':
        return '✈️';
      default:
        return '💡';
    }
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Savings</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {formatCurrency(result.savings)}
                </p>
                <p className="text-sm text-gray-500">
                  {result.savingsPercentage.toFixed(1)}% reduction
                </p>
              </div>
              <div className="h-12 w-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Time Saved</p>
                <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                  {result.timeReduction}h
                </p>
                <p className="text-sm text-gray-500">
                  Travel time reduction
                </p>
              </div>
              <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Carbon Reduction</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {result.carbonReduction}kg
                </p>
                <p className="text-sm text-gray-500">
                  CO₂ emissions saved
                </p>
              </div>
              <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cost Comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Cost Comparison
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
              <span className="font-medium">Original Cost</span>
              <span className="text-lg font-bold text-gray-700 dark:text-gray-300">
                {formatCurrency(result.originalCost)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <span className="font-medium">Optimized Cost</span>
              <span className="text-lg font-bold text-green-600 dark:text-green-400">
                {formatCurrency(result.optimizedCost)}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border-2 border-blue-200 dark:border-blue-800">
              <span className="font-medium text-blue-800 dark:text-blue-200">Your Savings</span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {formatCurrency(result.savings)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Optimization Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {result.optimizations.map((optimization, index) => (
              <div key={index} className="flex items-start justify-between p-3 border rounded-lg dark:border-gray-700">
                <div className="flex items-start gap-3 flex-1">
                  <span className="text-xl">{getOptimizationIcon(optimization.type)}</span>
                  <div className="flex-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">
                      {optimization.description}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      Savings: {formatCurrency(optimization.savings)}
                    </p>
                  </div>
                </div>
                <Badge className={getImpactColor(optimization.impact)}>
                  {optimization.impact} impact
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="flex justify-between items-center pt-4 border-t dark:border-gray-700">
        <Button variant="outline" onClick={onReject} disabled={isLoading}>
          Keep Original
        </Button>
        <div className="flex gap-3">
          <Button 
            onClick={onApplyChanges} 
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            {isLoading ? 'Applying...' : 'Apply Optimizations'}
          </Button>
        </div>
      </div>
    </div>
  );
}
