import React, { useState } from 'react';
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Brain, 
  DollarSign, 
  Clock, 
  AlertTriangle, 
  TrendingUp, 
  Download, 
  Check, 
  X,
  RefreshCw,
  Users,
  MapPin,
  Calendar
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface OptimizedTrip {
  id: number;
  title: string;
  userId: number;
  userName?: string;
  department: string;
  city: string;
  country: string;
  originalStartDate: string;
  originalEndDate: string;
  suggestedStartDate?: string;
  suggestedEndDate?: string;
  originalCost: number;
  optimizedCost: number;
  savings: number;
  reasoning?: string;
  conflictFlags: any[];
  hasOptimization: boolean;
  travelMode?: string;
  budget?: string;
}

interface OptimizationResult {
  optimizedTrips: OptimizedTrip[];
  savings: {
    totalMoneySaved: number;
    totalTimeSaved: number;
    conflictsResolved: number;
  };
  recommendations: string[];
}

export default function CorporateTripOptimizer() {
  const { toast } = useToast();
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [optimizationResult, setOptimizationResult] = useState<OptimizationResult | null>(null);
  const [appliedChanges, setAppliedChanges] = useState<Set<number>>(new Set());

  // Fetch real corporate trips data from API
  const { data: corporateTrips, isLoading: isLoadingTrips } = useQuery<any[]>({
    queryKey: ['/api/trips/corporate']
  });

  const handleOptimizeTrips = async () => {
    if (!corporateTrips || !Array.isArray(corporateTrips) || corporateTrips.length === 0) {
      toast({
        title: "No Trips Found",
        description: "No corporate trips available for optimization.",
        variant: "destructive",
      });
      return;
    }

    setIsOptimizing(true);
    try {
      const response = await apiRequest('POST', '/api/optimize-corporate-trips', {
        trips: corporateTrips
      });

      if (!response.ok) {
        throw new Error('Failed to optimize trips');
      }

      const result = await response.json();
      setOptimizationResult(result);

      toast({
        title: "Optimization Complete!",
        description: `Found ${result.savings.conflictsResolved} conflicts and potential savings of $${result.savings.totalMoneySaved}`,
      });
    } catch (error) {
      console.error('Error optimizing trips:', error);
      toast({
        title: "Optimization Failed",
        description: "Unable to optimize trips. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsOptimizing(false);
    }
  };

  const handleApplyChanges = (tripId: number) => {
    setAppliedChanges(prev => new Set([...Array.from(prev), tripId]));
    toast({
      title: "Changes Applied",
      description: "Trip optimization has been applied successfully.",
    });
  };

  const handleRejectChanges = (tripId: number) => {
    toast({
      title: "Changes Rejected",
      description: "Trip optimization suggestions have been dismissed.",
    });
  };

  const exportToCSV = () => {
    if (!optimizationResult) return;

    const csvData = optimizationResult.optimizedTrips.map(trip => ({
      'Trip Title': trip.title,
      'Traveler': trip.userName || `User ${trip.userId}`,
      'Department': trip.department,
      'Destination': `${trip.city}, ${trip.country}`,
      'Original Dates': `${trip.originalStartDate} to ${trip.originalEndDate}`,
      'Suggested Dates': trip.suggestedStartDate ? `${trip.suggestedStartDate} to ${trip.suggestedEndDate}` : 'No change',
      'Original Cost': `$${trip.originalCost}`,
      'Optimized Cost': `$${trip.optimizedCost}`,
      'Savings': `$${trip.savings}`,
      'Conflicts': trip.conflictFlags.length,
      'Reasoning': trip.reasoning || 'No optimization needed'
    }));

    const csvContent = "data:text/csv;charset=utf-8," + 
      Object.keys(csvData[0]).join(",") + "\n" +
      csvData.map(row => Object.values(row).join(",")).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "corporate_trip_optimization.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast({
      title: "Export Complete",
      description: "Optimization results exported to CSV successfully.",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-6 w-6 text-blue-600" />
            Corporate Trip Optimizer
          </CardTitle>
          <CardDescription>
            AI-powered optimization for corporate travel with budget simulation and conflict detection
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">{Array.isArray(corporateTrips) ? corporateTrips.length : 0}</span> upcoming trips
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">4</span> departments
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="text-sm text-muted-foreground">
                <span className="font-medium">3</span> destinations
              </div>
            </div>
            <Button 
              onClick={handleOptimizeTrips} 
              disabled={isOptimizing}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isOptimizing ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  Optimize All Trips
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Optimization Results */}
      {optimizationResult && (
        <>
          {/* Savings Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-100 dark:bg-green-900 rounded-lg">
                    <DollarSign className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Money Saved</p>
                    <p className="text-xl font-bold text-green-600">
                      ${optimizationResult.savings.totalMoneySaved.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                    <Clock className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-xl font-bold text-blue-600">
                      {optimizationResult.savings.totalTimeSaved}h
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-100 dark:bg-orange-900 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Conflicts Resolved</p>
                    <p className="text-xl font-bold text-orange-600">
                      {optimizationResult.savings.conflictsResolved}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                AI Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {optimizationResult.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <div className="h-2 w-2 bg-blue-600 rounded-full mt-2 flex-shrink-0" />
                    <span className="text-sm">{rec}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Optimization Results Table */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Optimization Results</CardTitle>
                <Button variant="outline" onClick={exportToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Trip Details</TableHead>
                      <TableHead>Traveler</TableHead>
                      <TableHead>Current Dates</TableHead>
                      <TableHead>Suggested Changes</TableHead>
                      <TableHead>Cost Impact</TableHead>
                      <TableHead>Conflicts</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {optimizationResult.optimizedTrips.map((trip) => (
                      <TableRow key={trip.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{trip.title}</p>
                            <p className="text-sm text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {trip.city}, {trip.country}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{trip.userName || `User ${trip.userId}`}</p>
                            <Badge variant="outline" className="text-xs">
                              {trip.department}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            <span>{trip.originalStartDate}</span>
                            <span>to</span>
                            <span>{trip.originalEndDate}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {trip.hasOptimization ? (
                            <div>
                              <div className="flex items-center gap-1 text-sm text-blue-600">
                                <Calendar className="h-3 w-3" />
                                <span>{trip.suggestedStartDate}</span>
                                <span>to</span>
                                <span>{trip.suggestedEndDate}</span>
                              </div>
                              {trip.reasoning && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {trip.reasoning}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">No changes needed</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm">
                              <span className="line-through text-muted-foreground">${trip.originalCost}</span>
                              <span className="ml-2 font-medium">${trip.optimizedCost}</span>
                            </p>
                            {trip.savings > 0 && (
                              <p className="text-sm text-green-600 font-medium">
                                Save ${trip.savings}
                              </p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {trip.conflictFlags.length > 0 ? (
                            <Badge variant="destructive" className="text-xs">
                              {trip.conflictFlags.length} conflict{trip.conflictFlags.length > 1 ? 's' : ''}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs">
                              No conflicts
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {trip.hasOptimization && !appliedChanges.has(trip.id) ? (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplyChanges(trip.id)}
                                className="text-green-600 border-green-600 hover:bg-green-50"
                              >
                                <Check className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectChanges(trip.id)}
                                className="text-red-600 border-red-600 hover:bg-red-50"
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : appliedChanges.has(trip.id) ? (
                            <Badge variant="outline" className="text-green-600">
                              Applied
                            </Badge>
                          ) : (
                            <span className="text-sm text-muted-foreground">-</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Initial Trip Overview */}
      {!optimizationResult && (
        <Card>
          <CardHeader>
            <CardTitle>Upcoming Corporate Trips</CardTitle>
            <CardDescription>
              Current trips scheduled for optimization analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {isLoadingTrips ? (
                <div className="text-center py-8">
                  <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                  <p className="text-muted-foreground mt-2">Loading corporate trips...</p>
                </div>
              ) : corporateTrips && Array.isArray(corporateTrips) && corporateTrips.length > 0 ? (
                corporateTrips.map((trip: any) => (
                  <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
                        <Users className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <h4 className="font-medium">{trip.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {trip.city}, {trip.country}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {trip.startDate} to {trip.endDate} • {trip.budget || 'No budget set'}
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      business
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No corporate trips found for optimization.</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}