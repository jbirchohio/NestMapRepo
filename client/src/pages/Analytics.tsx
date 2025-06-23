import AnalyticsDashboard from "@/components/AnalyticsDashboard";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { motion } from "framer-motion";
import { Shield, BarChart3, Sparkles } from "lucide-react";
export default function Analytics() {
    const { user } = useAuth();
    // Check user permissions for analytics access
    const { data: userPermissions } = useQuery({
        queryKey: ['/api/user/permissions'],
        queryFn: async () => {
            const response = await fetch('/api/user/permissions', {
                credentials: 'include'
            });
            if (!response.ok)
                throw new Error('Failed to fetch permissions');
            const data = await response.json();
            return data.permissions || [];
        },
        enabled: !!user,
    });
    // Debug permissions
    console.log('User permissions for analytics:', userPermissions);
    console.log('User object:', user);
    const hasAnalyticsAccess = userPermissions && (userPermissions.canViewAnalytics ||
        userPermissions.canAccessAdmin ||
        userPermissions.canManageOrganization ||
        user?.role === 'admin');
    if (!user) {
        return (<div className="min-h-screen bg-soft-100 dark:bg-navy-900 flex items-center justify-center p-4">
        <Alert className="max-w-md glass-card electric-glow animated-card">
          <Shield className="h-4 w-4 text-electric-500"/>
          <AlertDescription className="text-navy-700 dark:text-navy-300">
            Please sign in to access analytics dashboard.
          </AlertDescription>
        </Alert>
      </div>);
    }
    if (!hasAnalyticsAccess) {
        return (<div className="min-h-screen bg-soft-100 dark:bg-navy-900 flex items-center justify-center p-4">
        <Alert className="max-w-md glass-card electric-glow animated-card">
          <Shield className="h-4 w-4 text-electric-500"/>
          <AlertDescription className="text-navy-700 dark:text-navy-300">
            You don't have permission to access analytics. Contact your administrator for access.
          </AlertDescription>
        </Alert>
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
                  <BarChart3 className="w-8 h-8 text-white"/>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white/80"/>
                  <span className="text-white/90 text-sm font-medium">Business Intelligence</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold mb-4 tracking-tight text-white">
                Analytics Dashboard
              </h1>
              <p className="text-xl text-white/90 mb-6 max-w-2xl">
                Comprehensive insights into travel patterns, spending analysis, and organizational performance metrics
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"/>
                  <span className="text-white/80">Real-time metrics</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"/>
                  <span className="text-white/80">Custom reports</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-electric-400 rounded-full"/>
                  <span className="text-white/80">Export capabilities</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">
        <AnalyticsDashboard />
      </div>
    </div>);
}
