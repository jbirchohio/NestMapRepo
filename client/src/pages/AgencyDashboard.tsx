import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/auth/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Briefcase, Users, FileText, TrendingUp, MapPin, DollarSign, Target, Clock, Plus, BarChart3, Settings, Sparkles, User } from "lucide-react";
import MainNavigation from "@/components/MainNavigation";
import NewTripModal from "@/components/NewTripModal";
interface Trip {
    id: number;
    title: string;
    destination: string;
    start_date: string;
    end_date: string;
    status: string;
    budget?: number;
    client_name?: string;
}
export default function AgencyDashboard() {
    const { userId, user } = useAuth();
    const [isNewTripModalOpen, setIsNewTripModalOpen] = useState(false);
    const { data: trips = [], isLoading: tripsLoading } = useQuery<Trip[]>({
        queryKey: ['/api/trips', { userId }],
        queryFn: async () => {
            const res = await fetch(`/api/trips?userId=${userId}`);
            if (!res.ok)
                throw new Error("Failed to fetch trips");
            return res.json();
        },
        enabled: !!userId,
    });
    const { data: analytics } = useQuery({
        queryKey: ['/api/analytics/agency', { userId }],
        queryFn: async () => {
            const res = await fetch(`/api/analytics/agency?userId=${userId}`);
            if (!res.ok)
                return { totalProposals: 0, totalRevenue: 0, winRate: 0, activeClients: 0 };
            return res.json();
        },
        enabled: !!userId,
    });
    const recentProposals = trips.slice(0, 3);
    const activeProjects = trips.filter(trip => trip.status === 'in_progress' || trip.status === 'pending').slice(0, 3);
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
                  <Briefcase className="w-8 h-8 text-white"/>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-white/80"/>
                  <span className="text-white/90 text-sm font-medium">Agency Dashboard</span>
                </div>
              </div>

              <h1 className="text-5xl font-bold mb-4 tracking-tight text-white">
                Client Travel Workspace
              </h1>
              <p className="text-xl text-white/90 mb-6 max-w-2xl">
                Create compelling travel proposals and manage client relationships with professional tools
              </p>

              <div className="flex flex-wrap items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full"/>
                  <span className="text-white/80">Client proposals</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full"/>
                  <span className="text-white/80">Revenue tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-electric-400 rounded-full"/>
                  <span className="text-white/80">Win rate analytics</span>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8 space-y-8">

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button onClick={() => setIsNewTripModalOpen(true)} className="h-16 flex items-center justify-center gap-3" size="lg">
            <Plus className="h-5 w-5"/>
            Create Client Proposal
          </Button>
          
          <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
            <Link href="/ai-generator">
              <Sparkles className="h-5 w-5"/>
              AI Proposal Generator
            </Link>
          </Button>
          
          <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
            <Link href="/analytics">
              <BarChart3 className="h-5 w-5"/>
              Client Analytics
            </Link>
          </Button>
          
          <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
            <Link href="/settings">
              <Settings className="h-5 w-5"/>
              Agency Settings
            </Link>
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.totalProposals || 0}</div>
              <p className="text-xs text-muted-foreground">
                +18% from last month
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${analytics?.totalRevenue?.toLocaleString() || 0}</div>
              <p className="text-xs text-muted-foreground">
                Commission + markups
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Proposal Win Rate</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.winRate || 0}%</div>
              <p className="text-xs text-muted-foreground">
                Above industry average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Clients</CardTitle>
              <User className="h-4 w-4 text-muted-foreground"/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{analytics?.activeClients || 0}</div>
              <p className="text-xs text-muted-foreground">
                Ongoing relationships
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Proposal Management */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Proposals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5"/>
                Recent Client Proposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tripsLoading ? (<div className="space-y-4">
                  {[1, 2, 3].map((i) => (<div key={i} className="h-16 bg-muted animate-pulse rounded"/>))}
                </div>) : recentProposals.length > 0 ? (<div className="space-y-4">
                  {recentProposals.map((trip) => (<div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-muted-foreground"/>
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {trip.client_name || 'Client'} • {trip.destination}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant={trip.status === 'completed' ? 'default' : 'secondary'}>
                          {trip.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          ${trip.budget?.toLocaleString() || 0}
                        </p>
                      </div>
                    </div>))}
                </div>) : (<div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                  <h3 className="text-lg font-medium mb-2">No client proposals yet</h3>
                  <p className="text-muted-foreground mb-4">Start creating proposals to win new business</p>
                  <Button onClick={() => setIsNewTripModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2"/>
                    Create First Proposal
                  </Button>
                </div>)}
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5"/>
                Active Client Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeProjects.length > 0 ? (<div className="space-y-4">
                  {activeProjects.map((trip) => (<div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground"/>
                        <div>
                          <p className="font-medium">{trip.title}</p>
                          <p className="text-sm text-muted-foreground">
                            {trip.client_name || 'Client'} • {trip.destination}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {new Date(trip.start_date).toLocaleDateString()}
                        </p>
                        <Badge variant="outline" className="mt-1">
                          {trip.status}
                        </Badge>
                      </div>
                    </div>))}
                </div>) : (<div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4"/>
                  <h3 className="text-lg font-medium mb-2">No active projects</h3>
                  <p className="text-muted-foreground">Win proposals to see active client work here</p>
                </div>)}
            </CardContent>
          </Card>
        </div>
      </div>

      <NewTripModal isOpen={isNewTripModalOpen} onClose={() => setIsNewTripModalOpen(false)} onSuccess={() => setIsNewTripModalOpen(false)} userId={userId!}/>
    </div>);
}
