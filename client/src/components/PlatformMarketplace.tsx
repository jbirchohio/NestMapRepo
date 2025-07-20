import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Store, 
  Download, 
  Star, 
  Search, 

  Package,
  Zap,

  Users,
  TrendingUp,
  CheckCircle,
  ExternalLink
} from 'lucide-react';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface MarketplaceApp {
  id: string;
  name: string;
  description: string;
  category: 'travel' | 'finance' | 'productivity' | 'analytics' | 'integration';
  developer: string;
  version: string;
  rating: number;
  downloads: number;
  price: number;
  features: string[];
  screenshots: string[];
  installed: boolean;
  verified: boolean;
  lastUpdated: string;
}

interface Integration {
  id: string;
  name: string;
  type: 'api' | 'webhook' | 'plugin';
  status: 'active' | 'inactive' | 'pending';
  description: string;
  endpoints: number;
  usage: number;
}

export default function PlatformMarketplace() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTab, setSelectedTab] = useState('apps');

  const { data: apps } = useQuery({
    queryKey: ['/api/marketplace/apps', searchQuery, selectedCategory],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      if (selectedCategory !== 'all') params.append('category', selectedCategory);
      
      const response = await apiRequest('GET', `/api/marketplace/apps?${params}`);
      return response.data;
    }
  });

  const { data: integrations } = useQuery({
    queryKey: ['/api/marketplace/integrations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplace/integrations');
      return response.data;
    }
  });

  const { data: analytics } = useQuery({
    queryKey: ['/api/marketplace/analytics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/marketplace/analytics');
      return response.data;
    }
  });

  const installAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const response = await apiRequest('POST', `/api/marketplace/apps/${appId}/install`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/apps'] });
      toast({
        title: "App Installed",
        description: "The application has been successfully installed."
      });
    },
    onError: () => {
      toast({
        title: "Installation Failed",
        description: "Failed to install the application.",
        variant: "destructive"
      });
    }
  });

  const uninstallAppMutation = useMutation({
    mutationFn: async (appId: string) => {
      const response = await apiRequest('DELETE', `/api/marketplace/apps/${appId}/install`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/marketplace/apps'] });
      toast({
        title: "App Uninstalled",
        description: "The application has been removed."
      });
    }
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'travel', label: 'Travel & Booking' },
    { value: 'finance', label: 'Finance & Expense' },
    { value: 'productivity', label: 'Productivity' },
    { value: 'analytics', label: 'Analytics & Reporting' },
    { value: 'integration', label: 'Integrations' }
  ];

  const filteredApps = apps?.filter((app: MarketplaceApp) => {
    const matchesSearch = !searchQuery || 
      app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      app.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="w-full space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Platform Marketplace</h2>
          <p className="text-muted-foreground">
            Discover and install apps to extend your NestMap experience
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Package className="h-4 w-4 mr-2" />
            My Apps
          </Button>
          <Button>
            <Store className="h-4 w-4 mr-2" />
            Browse Store
          </Button>
        </div>
      </div>

      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="apps">Applications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="apps" className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search applications..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 border rounded-md"
            >
              {categories.map((category) => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredApps?.map((app: MarketplaceApp) => (
              <Card key={app.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg flex items-center gap-2">
                        {app.name}
                        {app.verified && (
                          <CheckCircle className="h-4 w-4 text-blue-500" />
                        )}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        by {app.developer}
                      </p>
                    </div>
                    <Badge variant="outline" className="capitalize">
                      {app.category}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="flex-1 flex flex-col">
                  <p className="text-sm text-muted-foreground mb-4 flex-1">
                    {app.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1">
                        <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                        <span>{app.rating.toFixed(1)}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Download className="h-4 w-4 text-muted-foreground" />
                        <span>{app.downloads.toLocaleString()}</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {app.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {feature}
                        </Badge>
                      ))}
                      {app.features.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{app.features.length - 3} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-lg font-semibold">
                        {app.price === 0 ? 'Free' : `$${app.price}`}
                      </div>
                      <Button
                        size="sm"
                        variant={app.installed ? "outline" : "default"}
                        onClick={() => app.installed 
                          ? uninstallAppMutation.mutate(app.id)
                          : installAppMutation.mutate(app.id)
                        }
                        disabled={installAppMutation.isPending || uninstallAppMutation.isPending}
                      >
                        {app.installed ? 'Uninstall' : 'Install'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredApps?.length === 0 && (
            <div className="text-center py-12">
              <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-semibold mb-2">No apps found</h3>
              <p className="text-muted-foreground">
                Try adjusting your search or category filter
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="integrations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Integrations</CardTitle>
                <Zap className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {integrations?.filter((i: Integration) => i.status === 'active').length || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  {integrations?.length || 0} total integrations
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">API Endpoints</CardTitle>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {integrations?.reduce((sum: number, i: Integration) => sum + i.endpoints, 0) || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  Available endpoints
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Monthly Usage</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {integrations?.reduce((sum: number, i: Integration) => sum + i.usage, 0)?.toLocaleString() || 0}
                </div>
                <p className="text-xs text-muted-foreground">
                  API calls this month
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Available Integrations</h3>
            <div className="grid gap-4">
              {integrations?.map((integration: Integration) => (
                <Card key={integration.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{integration.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{integration.description}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={integration.status === 'active' ? 'default' : 'secondary'}>
                          {integration.status}
                        </Badge>
                        <Badge variant="outline" className="capitalize">
                          {integration.type}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium">Endpoints</p>
                        <p className="text-2xl font-bold">{integration.endpoints}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Usage</p>
                        <p className="text-2xl font-bold">{integration.usage.toLocaleString()}</p>
                      </div>
                      <div className="flex items-center">
                        <Button variant="outline" size="sm">
                          Configure
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Apps</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.totalApps || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {analytics?.installedApps || 0} installed
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.activeUsers || 0}</div>
                <p className="text-xs text-muted-foreground">
                  This month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${analytics?.revenue?.toLocaleString() || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Monthly recurring
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Satisfaction</CardTitle>
                <Star className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{analytics?.avgRating?.toFixed(1) || 0}</div>
                <p className="text-xs text-muted-foreground">
                  Average rating
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Popular Categories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.popularCategories?.map((category: any) => (
                    <div key={category.name} className="flex items-center justify-between">
                      <span className="capitalize">{category.name}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-20 bg-muted rounded-full h-2">
                          <div 
                            className="bg-primary h-2 rounded-full" 
                            style={{ width: `${(category.count / analytics.totalApps) * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-sm text-muted-foreground">{category.count}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Top Developers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {analytics?.topDevelopers?.map((developer: any, index: number) => (
                    <div key={developer.name} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                          <span className="text-sm font-medium">{index + 1}</span>
                        </div>
                        <span>{developer.name}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">{developer.apps} apps</p>
                        <p className="text-xs text-muted-foreground">
                          {developer.downloads.toLocaleString()} downloads
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
