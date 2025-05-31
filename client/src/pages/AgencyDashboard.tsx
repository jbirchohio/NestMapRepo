import { useState } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { 
  Briefcase, 
  Users, 
  FileText, 
  TrendingUp, 
  MapPin, 
  DollarSign,
  Target,
  Clock,
  Plus,
  BarChart3,
  Settings,
  Sparkles,
  User
} from "lucide-react";
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
      if (!res.ok) throw new Error("Failed to fetch trips");
      return res.json();
    },
    enabled: !!userId,
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/analytics/agency', { userId }],
    queryFn: async () => {
      const res = await fetch(`/api/analytics/agency?userId=${userId}`);
      if (!res.ok) return { totalProposals: 0, totalRevenue: 0, winRate: 0, activeClients: 0 };
      return res.json();
    },
    enabled: !!userId,
  });

  const recentProposals = trips.slice(0, 3);
  const activeProjects = trips.filter(trip => trip.status === 'in_progress' || trip.status === 'pending').slice(0, 3);

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Client Travel Proposal Workspace
          </h1>
          <p className="text-muted-foreground">
            Create compelling travel proposals and manage client relationships
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => setIsNewTripModalOpen(true)}
            className="h-16 flex items-center justify-center gap-3 text-[#0f172a]"
            size="lg"
          >
            <Plus className="h-5 w-5" />
            Create Client Proposal
          </Button>
          
          <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
            <Link href="/ai-generator">
              <Sparkles className="h-5 w-5" />
              AI Proposal Generator
            </Link>
          </Button>
          
          <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
            <Link href="/analytics">
              <BarChart3 className="h-5 w-5" />
              Client Analytics
            </Link>
          </Button>
          
          <Button variant="outline" className="h-16 flex items-center justify-center gap-3" asChild>
            <Link href="/settings">
              <Settings className="h-5 w-5" />
              Agency Settings
            </Link>
          </Button>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
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
              <DollarSign className="h-4 w-4 text-muted-foreground" />
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
              <Target className="h-4 w-4 text-muted-foreground" />
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
              <User className="h-4 w-4 text-muted-foreground" />
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
                <FileText className="h-5 w-5" />
                Recent Client Proposals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {tripsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                  ))}
                </div>
              ) : recentProposals.length > 0 ? (
                <div className="space-y-4">
                  {recentProposals.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No client proposals yet</h3>
                  <p className="text-muted-foreground mb-4">Start creating proposals to win new business</p>
                  <Button onClick={() => setIsNewTripModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Proposal
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Projects */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Active Client Projects
              </CardTitle>
            </CardHeader>
            <CardContent>
              {activeProjects.length > 0 ? (
                <div className="space-y-4">
                  {activeProjects.map((trip) => (
                    <div key={trip.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <MapPin className="h-4 w-4 text-muted-foreground" />
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
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No active projects</h3>
                  <p className="text-muted-foreground">Win proposals to see active client work here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <NewTripModal 
        isOpen={isNewTripModalOpen} 
        onClose={() => setIsNewTripModalOpen(false)} 
        onSuccess={() => setIsNewTripModalOpen(false)}
        userId={userId!}
      />
    </div>
  );
}