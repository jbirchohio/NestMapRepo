import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import CorporateTripOptimizer from "@/components/CorporateTripOptimizer";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Brain, BarChart3 } from "lucide-react";

export default function Analytics() {
  const { user } = useAuth();
  
  // Check user permissions for analytics access
  const { data: userPermissions } = useQuery({
    queryKey: ['/api/user/permissions'],
    enabled: !!user,
  });

  const hasAnalyticsAccess = Array.isArray(userPermissions) && (
    userPermissions.includes('ACCESS_ANALYTICS') || 
    userPermissions.includes('MANAGE_ORGANIZATION')
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            Please sign in to access analytics dashboard.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!hasAnalyticsAccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 flex items-center justify-center p-4">
        <Alert className="max-w-md">
          <Shield className="h-4 w-4" />
          <AlertDescription>
            You don't have permission to access analytics. Contact your administrator for access.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Analytics & Optimization
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Comprehensive insights and AI-powered optimization for corporate travel management
          </p>
        </div>
        
        <Tabs defaultValue="analytics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics Dashboard
            </TabsTrigger>
            <TabsTrigger value="optimizer" className="flex items-center gap-2">
              <Brain className="h-4 w-4" />
              Trip Optimizer
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="analytics">
            <AnalyticsDashboard />
          </TabsContent>
          
          <TabsContent value="optimizer">
            <CorporateTripOptimizer />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}