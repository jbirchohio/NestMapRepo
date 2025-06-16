import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/components/ui/use-toast';
import WhiteLabelPreview from '@/components/WhiteLabelPreview';
import { useWhiteLabel } from '@/contexts/WhiteLabelContext';
import { useAuth } from '@/contexts/auth/AuthContext';
import { CheckCircle, AlertCircle, ChevronRight, Globe, Palette, Settings, Shield } from 'lucide-react';
import api from '@/services/api';

interface WhiteLabelStatus {
  organization: {
    id: number;
    name: string;
    plan: string;
  };
  whiteLabelStatus: {
    isEnabled: boolean;
    isConfigured: boolean;
    hasDomain: boolean;
    hasVerifiedDomain: boolean;
    isActive: boolean;
  };
  completionSteps: {
    subscription: boolean;
    branding: boolean;
    domain: boolean;
    domainVerification: boolean;
    active: boolean;
  };
  completionPercentage: number;
  settings: any | null;
  domains: Array<{
    id: number;
    domain: string;
    subdomain: string;
    dns_verified: boolean;
    ssl_verified: boolean;
    verification_token: string;
    created_at: string;
  }>;
  nextSteps: string[];
}

export default function WhiteLabelDashboard() {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { whiteLabelConfig, isWhiteLabelActive, updateWhiteLabelConfig } = useWhiteLabel();
  
  const [status, setStatus] = useState<WhiteLabelStatus | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Fetch white label status
  const fetchStatus = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/white-label/status');
      setStatus(response.data);
    } catch (error) {
      console.error('Error fetching white label status:', error);
      toast({
        title: 'Error',
        description: 'Failed to load white label status. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Activate white label
  const activateWhiteLabel = async () => {
    try {
      await api.post('/api/white-label/activate');
      toast({
        title: 'Success',
        description: 'White label features have been activated!',
      });
      fetchStatus();
    } catch (error) {
      console.error('Error activating white label:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate white label features. Please try again.',
        variant: 'destructive',
      });
    }
  };

  // Load status on component mount
  useEffect(() => {
    fetchStatus();
  }, []);

  // Navigate to settings pages
  const navigateTo = (path: string) => {
    navigate(path);
  };

  // Render loading state
  if (loading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading white label dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  // Render subscription upgrade required
  if (status && !status.completionSteps.subscription) {
    return (
      <div className="container mx-auto py-8 px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>White Label Features</CardTitle>
            <CardDescription>
              Customize your travel management platform with your own branding
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Subscription Upgrade Required</AlertTitle>
              <AlertDescription>
                White label features are available on Pro plan and higher. Upgrade your subscription to access these features.
              </AlertDescription>
            </Alert>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Custom Branding</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Apply your company's colors, logo, and name throughout the platform.
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Custom Domain</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Use your own domain for a seamless branded experience.
                  </p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigateTo('/billing')}>
              Upgrade Subscription
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">White Label Dashboard</h1>
          <p className="text-muted-foreground">Customize your travel management platform</p>
        </div>
        
        {status && status.whiteLabelStatus.isActive ? (
          <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Active
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Setup in Progress
          </Badge>
        )}
      </div>
      
      {status && (
        <Card className="mb-8">
          <CardHeader className="pb-2">
            <CardTitle>Setup Progress</CardTitle>
            <CardDescription>Complete all steps to activate white label features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Progress value={status.completionPercentage} className="h-2" />
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-2">
                <div className="flex items-center gap-2">
                  {status.completionSteps.subscription ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <span>Subscription</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {status.completionSteps.branding ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <span>Branding</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {status.completionSteps.domain ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <span>Domain</span>
                </div>
                
                <div className="flex items-center gap-2">
                  {status.completionSteps.active ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-500" />
                  )}
                  <span>Activation</span>
                </div>
              </div>
              
              {status.nextSteps.length > 0 && (
                <Alert>
                  <AlertTitle>Next Steps</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc pl-5 space-y-1 mt-2">
                      {status.nextSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-3 mb-8">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="domains">Domains</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>White Label Features</CardTitle>
              <CardDescription>
                Customize your travel management platform with your own branding
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="cursor-pointer hover:border-primary transition-colors" 
                      onClick={() => setActiveTab('branding')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Palette className="h-5 w-5 text-primary" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base mt-2">Branding Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Customize colors, logo, and company name
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => setActiveTab('domains')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Globe className="h-5 w-5 text-primary" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base mt-2">Custom Domains</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Set up and manage your custom domains
                    </p>
                  </CardContent>
                </Card>
                
                <Card className="cursor-pointer hover:border-primary transition-colors"
                      onClick={() => navigateTo('/settings/white-label')}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <Settings className="h-5 w-5 text-primary" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <CardTitle className="text-base mt-2">Advanced Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Configure additional white label options
                    </p>
                  </CardContent>
                </Card>
              </div>
              
              {status && !status.whiteLabelStatus.isActive && status.completionSteps.branding && status.completionSteps.domain && (
                <div className="mt-6">
                  <Button onClick={activateWhiteLabel}>
                    Activate White Label
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
          
          <WhiteLabelPreview 
            config={whiteLabelConfig} 
            isActive={isWhiteLabelActive} 
          />
        </TabsContent>
        
        <TabsContent value="branding">
          <Card>
            <CardHeader>
              <CardTitle>Branding Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of your travel management platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => navigateTo('/settings/white-label/branding')}>
                Edit Branding Settings
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domains</CardTitle>
              <CardDescription>
                Set up and manage your custom domains
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {status && status.domains.length > 0 ? (
                <div className="space-y-4">
                  {status.domains.map((domain) => (
                    <Card key={domain.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base">{domain.subdomain}.{domain.domain}</CardTitle>
                          <Badge variant={domain.dns_verified && domain.ssl_verified ? "default" : "outline"}>
                            {domain.dns_verified && domain.ssl_verified ? "Verified" : "Pending Verification"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">DNS Verification:</span>
                            {domain.dns_verified ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Verified</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">SSL Certificate:</span>
                            {domain.ssl_verified ? (
                              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Pending</Badge>
                            )}
                          </div>
                        </div>
                      </CardContent>
                      <CardFooter>
                        <Button variant="outline" onClick={() => navigateTo(`/settings/white-label/domains/${domain.id}`)}>
                          Manage Domain
                        </Button>
                      </CardFooter>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">No Custom Domains</h3>
                  <p className="text-muted-foreground mb-4">
                    Add a custom domain to provide a seamless branded experience for your clients.
                  </p>
                </div>
              )}
              
              <Button onClick={() => navigateTo('/settings/white-label/domains/new')}>
                Add Custom Domain
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
