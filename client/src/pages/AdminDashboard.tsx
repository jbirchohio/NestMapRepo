` tags.

```text
<replit_final_file>
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { 
  Shield, 
  Users, 
  Building2, 
  Settings, 
  BarChart3,
  CreditCard,
  Bell,
  Sparkles,
  Plus,
  TrendingUp,
  Activity
} from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/admin'],
    queryFn: async () => {
      const res = await fetch('/api/analytics', {
        credentials: 'include'
      });
      if (!res.ok) return { totalUsers: 0, totalOrganizations: 0, totalTrips: 0, activeUsers: 0 };
      const data = await res.json();
      return {
        totalUsers: data.overview?.totalUsers || 0,
        totalOrganizations: data.overview?.totalOrganizations || 0,
        totalTrips: data.overview?.totalTrips || 0,
        activeUsers: data.overview?.activeUsers || 0
      };
    },
    enabled: !!user,
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
      <div className="container mx-auto px-4 py-8">
        {/* Hero Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative overflow-hidden bg-gradient-to-br from-electric-500 via-electric-600 to-electric-700 text-white mb-8 rounded-xl"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
          <div className="absolute inset-0 opacity-30" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
          }} />

          <div className="relative container mx-auto px-6 py-16">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="flex-1"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/10 backdrop-blur-sm rounded-2xl">
                    <Shield className="w-8 h-8" />
                  </div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-electric-200" />
                    <span className="text-electric-100 text-sm font-medium">Admin Control Center</span>
                  </div>
                </div>

                <h1 className="text-5xl font-bold mb-4 tracking-tight">
                  Admin Dashboard
                </h1>
                <p className="text-xl text-electric-100 mb-6 max-w-2xl">
                  Comprehensive system administration and platform oversight
                </p>

                <div className="flex flex-wrap items-center gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full" />
                    <span className="text-electric-100">User management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-400 rounded-full" />
                    <span className="text-electric-100">System monitoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-400 rounded-full" />
                    <span className="text-electric-100">Platform analytics</span>
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
                className="flex flex-col sm:flex-row gap-4"
              >
                <Button 
                  className="bg-white hover:bg-white/90 text-electric-600 font-semibold px-8 py-3 h-auto rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 electric-glow"
                  size="lg"
                >
                  <Settings className="h-5 w-5 mr-2" />
                  System Settings
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Users</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{analytics?.totalUsers || 0}</p>
              </div>
              <div className="p-3 bg-electric-100 dark:bg-electric-900/20 rounded-xl">
                <Users className="w-6 h-6 text-electric-600" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Organizations</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{analytics?.totalOrganizations || 0}</p>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-xl">
                <Building2 className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Trips</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{analytics?.totalTrips || 0}</p>
              </div>
              <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-xl">
                <TrendingUp className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </AnimatedCard>

          <AnimatedCard variant="soft" className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Users</p>
                <p className="text-3xl font-bold text-navy-900 dark:text-white">{analytics?.activeUsers || 0}</p>
              </div>
              <div className="p-3 bg-orange-100 dark:bg-orange-900/20 rounded-xl">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </AnimatedCard>
        </motion.div>

        {/* Management Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* User Management */}
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Users className="h-6 w-6 text-electric-600" />
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white">User Management</h3>
            </div>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">User Registration</p>
                    <p className="text-sm text-muted-foreground">Manage new user approvals</p>
                  </div>
                  <Badge variant="secondary">Active</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Role Management</p>
                    <p className="text-sm text-muted-foreground">Configure user permissions</p>
                  </div>
                  <Button variant="outline" size="sm">Configure</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Account Security</p>
                    <p className="text-sm text-muted-foreground">Monitor security events</p>
                  </div>
                  <Button variant="outline" size="sm">Monitor</Button>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>

          {/* System Monitoring */}
          <AnimatedCard variant="glow" className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <BarChart3 className="h-6 w-6 text-electric-600" />
              <h3 className="text-xl font-semibold text-navy-900 dark:text-white">System Monitoring</h3>
            </div>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Performance Metrics</p>
                    <p className="text-sm text-muted-foreground">View system performance</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Healthy</Badge>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">Error Monitoring</p>
                    <p className="text-sm text-muted-foreground">Track system errors</p>
                  </div>
                  <Button variant="outline" size="sm">View Logs</Button>
                </div>
                <div className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">API Health</p>
                    <p className="text-sm text-muted-foreground">Monitor API endpoints</p>
                  </div>
                  <Badge className="bg-green-100 text-green-700">Online</Badge>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </div>
      </div>
    </div>
  );
}