import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Building2, Users, MapPin, Calendar, RefreshCw, LogIn, Palette } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useLocation } from "wouter";

interface DemoOrganization {
  id: number;
  name: string;
  domain: string;
  primary_color: string;
  secondary_color: string;
  logo_url: string;
}

interface DemoUser {
  id: number;
  email: string;
  display_name: string;
  role: string;
}

export default function Demo() {
  const { toast } = useToast();
  const { signOut } = useAuth();
  const [, setLocation] = useLocation();
  const [selectedOrg, setSelectedOrg] = useState<DemoOrganization | null>(null);

  // Fetch demo organizations
  const { data: orgsData, isLoading: orgsLoading, error: orgsError } = useQuery({
    queryKey: ["/api/demo/organizations"],
    staleTime: 5 * 60 * 1000,
  });

  // Fetch demo users for selected organization
  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ["/api/demo/users", selectedOrg?.id],
    enabled: !!selectedOrg,
    staleTime: 5 * 60 * 1000,
  });

  // Demo login mutation
  const loginMutation = useMutation({
    mutationFn: async (organizationId: number) => {
      const response = await apiRequest(`/api/demo/login`, {
        method: "POST",
        body: { organizationId },
      });
      return response;
    },
    onSuccess: (data) => {
      toast({
        title: "Demo Login Successful",
        description: `Welcome to ${data.organization.name}! You're now logged in as ${data.user.displayName}.`,
      });
      
      // Redirect to dashboard
      setTimeout(() => {
        setLocation("/");
      }, 1500);
    },
    onError: (error: any) => {
      toast({
        title: "Demo Login Failed",
        description: error.message || "Unable to log into demo organization.",
        variant: "destructive",
      });
    },
  });

  // Reset demo data mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest(`/api/demo/reset`, {
        method: "POST",
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: "Demo Data Reset",
        description: "All demo data has been refreshed with new sample content.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/demo/organizations"] });
    },
    onError: (error: any) => {
      toast({
        title: "Reset Failed",
        description: error.message || "Unable to reset demo data.",
        variant: "destructive",
      });
    },
  });

  const handleDemoLogin = (org: DemoOrganization) => {
    loginMutation.mutate(org.id);
  };

  const handleResetDemo = () => {
    resetMutation.mutate();
  };

  const handleSignOut = async () => {
    await signOut();
    setLocation("/demo");
  };

  const organizations = orgsData?.organizations || [];
  const users = usersData?.users || [];

  if (orgsError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Demo Unavailable</CardTitle>
            <CardDescription>
              Unable to load demo organizations. Please try again later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => window.location.reload()} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto py-8 px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            NestMap Demo Environment
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-6">
            Experience our multi-tenant travel platform with different organizational configurations
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              onClick={handleResetDemo}
              disabled={resetMutation.isPending}
              variant="outline"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${resetMutation.isPending ? 'animate-spin' : ''}`} />
              Reset Demo Data
            </Button>
            <Button onClick={handleSignOut} variant="ghost">
              <LogIn className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>

        {orgsLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader>
                  <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="h-10 bg-gray-200 rounded"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Tabs defaultValue="organizations" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="organizations">Demo Organizations</TabsTrigger>
              <TabsTrigger value="details">Organization Details</TabsTrigger>
            </TabsList>

            <TabsContent value="organizations" className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {organizations.map((org: DemoOrganization) => (
                  <Card 
                    key={org.id} 
                    className="hover:shadow-lg transition-shadow cursor-pointer border-2"
                    style={{ borderColor: org.primary_color + '20' }}
                    onClick={() => setSelectedOrg(org)}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div 
                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold"
                            style={{ backgroundColor: org.primary_color }}
                          >
                            {org.name.charAt(0)}
                          </div>
                          <div>
                            <CardTitle className="text-lg">{org.name}</CardTitle>
                            <p className="text-sm text-gray-500">{org.domain}</p>
                          </div>
                        </div>
                        <Badge variant="secondary">Enterprise</Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Palette className="w-4 h-4" />
                          <span className="text-sm">Custom Branding</span>
                          <div 
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: org.primary_color }}
                          ></div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Building2 className="w-4 h-4" />
                          <span className="text-sm">Multi-tenant Ready</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Users className="w-4 h-4" />
                          <span className="text-sm">Role-based Access</span>
                        </div>
                        <Button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDemoLogin(org);
                          }}
                          disabled={loginMutation.isPending}
                          className="w-full mt-4"
                          style={{ backgroundColor: org.primary_color }}
                        >
                          <LogIn className="w-4 h-4 mr-2" />
                          Demo Login
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="details" className="space-y-6">
              {selectedOrg ? (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-3">
                      <div 
                        className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold text-xl"
                        style={{ backgroundColor: selectedOrg.primary_color }}
                      >
                        {selectedOrg.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="text-2xl">{selectedOrg.name}</h3>
                        <p className="text-gray-500">{selectedOrg.domain}</p>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Tabs defaultValue="users" className="w-full">
                      <TabsList>
                        <TabsTrigger value="users">Demo Users</TabsTrigger>
                        <TabsTrigger value="branding">Branding</TabsTrigger>
                        <TabsTrigger value="features">Features</TabsTrigger>
                      </TabsList>

                      <TabsContent value="users" className="space-y-4">
                        {usersLoading ? (
                          <div className="space-y-2">
                            {[1, 2, 3].map((i) => (
                              <div key={i} className="h-16 bg-gray-200 rounded animate-pulse"></div>
                            ))}
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {users.map((user: DemoUser) => (
                              <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                    {user.display_name?.charAt(0) || user.email.charAt(0)}
                                  </div>
                                  <div>
                                    <p className="font-medium">{user.display_name || user.email}</p>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                  </div>
                                </div>
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                  {user.role}
                                </Badge>
                              </div>
                            ))}
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent value="branding" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-3">
                            <h4 className="font-medium">Color Scheme</h4>
                            <div className="flex space-x-2">
                              <div className="flex flex-col items-center">
                                <div 
                                  className="w-12 h-12 rounded border"
                                  style={{ backgroundColor: selectedOrg.primary_color }}
                                ></div>
                                <span className="text-xs mt-1">Primary</span>
                              </div>
                              <div className="flex flex-col items-center">
                                <div 
                                  className="w-12 h-12 rounded border"
                                  style={{ backgroundColor: selectedOrg.secondary_color }}
                                ></div>
                                <span className="text-xs mt-1">Secondary</span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h4 className="font-medium">Domain Configuration</h4>
                            <p className="text-sm text-gray-600">
                              Custom domain: <code className="bg-gray-100 px-2 py-1 rounded">{selectedOrg.domain}</code>
                            </p>
                            <p className="text-sm text-gray-600">
                              White-label enabled with custom branding
                            </p>
                          </div>
                        </div>
                      </TabsContent>

                      <TabsContent value="features" className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <h4 className="font-medium">Enterprise Features</h4>
                            <ul className="space-y-1 text-sm">
                              <li>✓ Multi-tenant isolation</li>
                              <li>✓ Role-based access control</li>
                              <li>✓ Custom branding</li>
                              <li>✓ Team collaboration</li>
                              <li>✓ Advanced analytics</li>
                            </ul>
                          </div>
                          <div className="space-y-2">
                            <h4 className="font-medium">Demo Data</h4>
                            <ul className="space-y-1 text-sm">
                              <li>✓ Sample trips and itineraries</li>
                              <li>✓ Demo user accounts</li>
                              <li>✓ Expense tracking</li>
                              <li>✓ Booking integration</li>
                              <li>✓ Reporting dashboard</li>
                            </ul>
                          </div>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="text-center py-12">
                    <Building2 className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-500">Select an organization to view details</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </div>
  );
}