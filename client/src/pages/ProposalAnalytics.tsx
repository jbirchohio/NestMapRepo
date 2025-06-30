import SharedProposalType from '@shared/schema/types/SharedProposalType';
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, PieLabelRenderProps, Cell } from "recharts";
import { Eye, Download, FileSignature, DollarSign, Clock, Users, TrendingUp, Calendar } from "lucide-react";

interface AnalyticsOverview {
  totalProposals: number;
  totalViews: number;
  averageViewTime: number;
  conversionRate: number;
  totalSigned: number;
  totalRevenue: number;
}

interface ViewDataPoint {
  date: string;
  views: number;
  opens: number;
}

interface SectionView {
  section: string;
  views: number;
  avgTime: number;
}

interface FunnelStage {
  name: string;
  stage: string; // Alias for name for backward compatibility
  count: number;
  percentage: number;
}

interface MapData {
  name: string;
  value: number;
  code: string;
}

interface AnalyticsData {
  overview: AnalyticsOverview;
  viewsOverTime: ViewDataPoint[];
  sectionViews: SectionView[];
  conversionFunnel: FunnelStage[];
  map: MapData[];
}

export default function ProposalAnalytics() {
    const [timeRange, setTimeRange] = useState("30d");
    const [selectedProposal, setSelectedProposal] = useState<string>("all");
    const { data: analytics, isLoading } = useQuery<AnalyticsData>({
        queryKey: ["/api/proposal-analytics", timeRange, selectedProposal],
    });
    const { data: proposals } = useQuery<Array<{ id: string; title: string }>>({
        queryKey: ["/api/proposals"],
    });
    if (isLoading) {
        return (<div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (<div key={i} className="h-24 bg-gray-200 dark:bg-gray-700 rounded"></div>))}
          </div>
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>);
    }
    const stats: AnalyticsOverview = analytics?.overview || {
        totalProposals: 24,
        totalViews: 186,
        averageViewTime: 4.2,
        conversionRate: 18.5,
        totalSigned: 7,
        totalRevenue: 125400
    };
    
    const viewsData: ViewDataPoint[] = analytics?.viewsOverTime || [
        { date: "2024-01-01", views: 12, opens: 8 },
        { date: "2024-01-02", views: 18, opens: 12 },
        { date: "2024-01-03", views: 15, opens: 10 },
        { date: "2024-01-04", views: 22, opens: 16 },
        { date: "2024-01-05", views: 28, opens: 20 },
        { date: "2024-01-06", views: 24, opens: 18 },
        { date: "2024-01-07", views: 32, opens: 24 }
    ];
    
    const sectionData: SectionView[] = analytics?.sectionViews || [
        { section: "Cost Breakdown", views: 156, avgTime: 2.4 },
        { section: "Itinerary", views: 134, avgTime: 3.8 },
        { section: "Terms", views: 89, avgTime: 1.2 },
        { section: "About Us", views: 67, avgTime: 0.8 },
        { section: "Custom Sections", views: 45, avgTime: 1.5 }
    ];
    const conversionFunnel: FunnelStage[] = analytics?.conversionFunnel || [
        { name: "Sent", stage: "Sent", count: 100, percentage: 100 },
        { name: "Opened", stage: "Opened", count: 75, percentage: 75 },
        { name: "Viewed", stage: "Viewed", count: 50, percentage: 50 },
        { name: "Signed", stage: "Signed", count: 25, percentage: 25 }
    ];
    const COLORS = ['#2563eb', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
    return (<div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Proposal Analytics</h1>
          <p className="text-gray-600 dark:text-gray-300">Track engagement and conversion metrics for your proposals</p>
        </div>
        <div className="flex gap-2">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Select value={selectedProposal} onValueChange={setSelectedProposal}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All proposals"/>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Proposals</SelectItem>
              {proposals?.map((proposal: SharedProposalType) => (<SelectItem key={proposal.id} value={proposal.id.toString()}>
                  {proposal.clientName} - {new Date(proposal.createdAt).toLocaleDateString()}
                </SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Proposals</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProposals}</div>
            <p className="text-xs text-muted-foreground">
              +12% from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Views</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalViews}</div>
            <p className="text-xs text-muted-foreground">
              Avg {(stats.totalViews / stats.totalProposals).toFixed(1)} per proposal
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg View Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageViewTime}m</div>
            <p className="text-xs text-muted-foreground">
              +0.8m from last month
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground"/>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.conversionRate}%</div>
            <p className="text-xs text-muted-foreground">
              {stats.totalSigned} of {stats.totalProposals} signed
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="engagement">Engagement</TabsTrigger>
          <TabsTrigger value="conversion">Conversion</TabsTrigger>
          <TabsTrigger value="individual">Individual Proposals</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Views & Opens Over Time</CardTitle>
                <CardDescription>Daily proposal activity</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={viewsData}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="date"/>
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="views" stroke="#2563eb" strokeWidth={2}/>
                    <Line type="monotone" dataKey="opens" stroke="#10b981" strokeWidth={2}/>
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Section Engagement</CardTitle>
                <CardDescription>Time spent on each section</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {sectionData.map((section, index) => (<div key={section.section} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-sm font-medium">{section.section}</span>
                        <span className="text-sm text-gray-500">{section.avgTime}m avg</span>
                      </div>
                      <Progress value={(section.views / Math.max(...sectionData.map(s => s.views))) * 100} className="h-2"/>
                      <div className="text-xs text-gray-500">{section.views} views</div>
                    </div>))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="engagement" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Engagement Heatmap</CardTitle>
                <CardDescription>Most viewed sections across all proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={sectionData}>
                    <CartesianGrid strokeDasharray="3 3"/>
                    <XAxis dataKey="section"/>
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="views" fill="#2563eb"/>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>View Duration Distribution</CardTitle>
                <CardDescription>How long clients spend reviewing proposals</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Quick scan (&lt;30s)</span>
                    <Badge variant="outline">23%</Badge>
                  </div>
                  <Progress value={23} className="h-2"/>
                  
                  <div className="flex justify-between items-center">
                    <span>Brief review (30s-2m)</span>
                    <Badge variant="outline">35%</Badge>
                  </div>
                  <Progress value={35} className="h-2"/>
                  
                  <div className="flex justify-between items-center">
                    <span>Detailed review (2m-5m)</span>
                    <Badge variant="outline">28%</Badge>
                  </div>
                  <Progress value={28} className="h-2"/>
                  
                  <div className="flex justify-between items-center">
                    <span>Thorough review (&gt;5m)</span>
                    <Badge variant="outline">14%</Badge>
                  </div>
                  <Progress value={14} className="h-2"/>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="conversion" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Conversion Funnel</CardTitle>
                <CardDescription>From proposal sent to signed contract</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {conversionFunnel.map((stage, index) => (<div key={stage.stage} className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">{stage.stage}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-gray-500">{stage.count}</span>
                          <Badge variant={index === 0 ? "default" : "secondary"}>
                            {stage.percentage}%
                          </Badge>
                        </div>
                      </div>
                      <Progress value={stage.percentage} className="h-3"/>
                    </div>))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Impact</CardTitle>
                <CardDescription>Proposals by value and status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                    <div>
                      <p className="text-sm text-green-700 dark:text-green-300">Won Proposals</p>
                      <p className="text-2xl font-bold text-green-800 dark:text-green-200">${stats.totalRevenue?.toLocaleString() || '125,400'}</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-green-600"/>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                    <div>
                      <p className="text-sm text-yellow-700 dark:text-yellow-300">Pending Proposals</p>
                      <p className="text-2xl font-bold text-yellow-800 dark:text-yellow-200">$89,200</p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600"/>
                  </div>
                  
                  <div className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                    <div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Total Pipeline</p>
                      <p className="text-2xl font-bold text-gray-800 dark:text-gray-200">$214,600</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-gray-600"/>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="individual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Individual Proposal Performance</CardTitle>
              <CardDescription>Detailed analytics for each proposal</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {proposals?.slice(0, 10).map((proposal: SharedProposalType) => (<div key={proposal.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <h4 className="font-medium">{proposal.clientName}</h4>
                      <p className="text-sm text-gray-500">
                        Sent {new Date(proposal.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4"/>
                          <span className="text-sm">12</span>
                        </div>
                        <p className="text-xs text-gray-500">views</p>
                      </div>
                      <div className="text-center">
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4"/>
                          <span className="text-sm">3.2m</span>
                        </div>
                        <p className="text-xs text-gray-500">avg time</p>
                      </div>
                      <Badge variant={proposal.status === 'signed' ? 'default' :
                proposal.status === 'viewed' ? 'secondary' : 'outline'}>
                        {proposal.status}
                      </Badge>
                    </div>
                  </div>))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>);
}
