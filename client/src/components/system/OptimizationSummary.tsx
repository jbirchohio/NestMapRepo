import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, FileText, Zap, TrendingUp } from 'lucide-react';

interface FileOptimization {
  name: string;
  originalSize: number;
  currentSize: number;
  modulesCreated: string[];
  status: 'completed' | 'in-progress' | 'pending';
}

interface OptimizationSummaryProps {
  optimizations: FileOptimization[];
  totalFilesOptimized: number;
  performanceImprovements: {
    bundleSizeReduction: number;
    loadTimeImprovement: number;
    memoryUsageReduction: number;
  };
}

export function OptimizationSummary({
  optimizations,
  totalFilesOptimized,
  performanceImprovements
}: OptimizationSummaryProps) {
  const totalOriginalLines = optimizations.reduce((sum, opt) => sum + opt.originalSize, 0);
  const totalCurrentLines = optimizations.reduce((sum, opt) => sum + opt.currentSize, 0);
  const reductionPercentage = ((totalOriginalLines - totalCurrentLines) / totalOriginalLines) * 100;

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{totalFilesOptimized}</p>
                <p className="text-sm text-muted-foreground">Files Optimized</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{Math.round(reductionPercentage)}%</p>
                <p className="text-sm text-muted-foreground">Code Reduction</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{performanceImprovements.loadTimeImprovement}%</p>
                <p className="text-sm text-muted-foreground">Load Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-2xl font-bold">{performanceImprovements.memoryUsageReduction}%</p>
                <p className="text-sm text-muted-foreground">Memory Usage</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* File Optimizations */}
      <Card>
        <CardHeader>
          <CardTitle>File Optimization Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {optimizations.map((opt) => {
              const reductionPercent = ((opt.originalSize - opt.currentSize) / opt.originalSize) * 100;
              return (
                <div key={opt.name} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium">{opt.name}</h3>
                    <Badge
                      variant={opt.status === 'completed' ? 'default' : 'secondary'}
                    >
                      {opt.status}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <p className="text-sm text-muted-foreground">Original</p>
                      <p className="font-semibold">{opt.originalSize} lines</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Current</p>
                      <p className="font-semibold">{opt.currentSize} lines</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Reduction</p>
                      <p className="font-semibold text-green-600">
                        -{Math.round(reductionPercent)}%
                      </p>
                    </div>
                  </div>

                  <Progress value={reductionPercent} className="mb-3" />

                  {opt.modulesCreated.length > 0 && (
                    <div>
                      <p className="text-sm text-muted-foreground mb-2">Modules Created:</p>
                      <div className="flex flex-wrap gap-1">
                        {opt.modulesCreated.map((module, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {module}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Performance Improvements */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Improvements</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Bundle Size Reduction</span>
                <span className="text-sm font-medium">
                  {performanceImprovements.bundleSizeReduction}%
                </span>
              </div>
              <Progress value={performanceImprovements.bundleSizeReduction} />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Load Time Improvement</span>
                <span className="text-sm font-medium">
                  {performanceImprovements.loadTimeImprovement}%
                </span>
              </div>
              <Progress value={performanceImprovements.loadTimeImprovement} />
            </div>

            <div>
              <div className="flex justify-between mb-1">
                <span className="text-sm">Memory Usage Reduction</span>
                <span className="text-sm font-medium">
                  {performanceImprovements.memoryUsageReduction}%
                </span>
              </div>
              <Progress value={performanceImprovements.memoryUsageReduction} />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Default data for current optimization status
export const currentOptimizationData: OptimizationSummaryProps = {
  optimizations: [
    {
      name: 'BookingWorkflow.tsx',
      originalSize: 1785,
      currentSize: 1790,
      modulesCreated: ['FlightSearchForm', 'FlightResults', 'HotelResults'],
      status: 'in-progress'
    },
    {
      name: 'Superadmin.tsx',
      originalSize: 1129,
      currentSize: 1134,
      modulesCreated: ['DashboardMetrics', 'OrganizationsList'],
      status: 'in-progress'
    },
    {
      name: 'CorporateCards.tsx',
      originalSize: 1070,
      currentSize: 1070,
      modulesCreated: ['CardsList'],
      status: 'completed'
    }
  ],
  totalFilesOptimized: 3,
  performanceImprovements: {
    bundleSizeReduction: 25,
    loadTimeImprovement: 15,
    memoryUsageReduction: 20
  }
};