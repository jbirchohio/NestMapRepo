import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Globe, Settings, Palette, Shield, ExternalLink } from 'lucide-react';
import DomainManagement from '@/components/DomainManagement';
import WhiteLabelSettings from '@/components/WhiteLabelSettings';
import { apiRequest } from '@/lib/queryClient';

interface WhiteLabelConfig {
  isWhiteLabelActive: boolean;
  config: {
    companyName: string;
    primaryColor: string;
    secondaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };
}

export default function WhiteLabelDomains() {
  const [activeTab, setActiveTab] = useState('domains');

  const { data: whiteLabelConfig, isLoading: configLoading } = useQuery<WhiteLabelConfig>({
    queryKey: ['/api/white-label/config'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/white-label/config');
      return response.json();
    }
  });

  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['/api/white-label/permissions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/white-label/permissions');
      return response.json();
    }
  });

  if (configLoading || permissionsLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  const hasWhiteLabelAccess = permissions?.canAccessWhiteLabel;
  const currentPlan = permissions?.currentPlan || 'basic';

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">White Label Configuration</h1>
          <p className="text-gray-600 mt-2">
            Configure your custom branding and domain settings
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Badge variant={hasWhiteLabelAccess ? "default" : "secondary"}>
            {currentPlan.toUpperCase()} Plan
          </Badge>
          {whiteLabelConfig?.isWhiteLabelActive && (
            <Badge className="bg-green-100 text-green-800">
              White Label Active
            </Badge>
          )}
        </div>
      </div>

      {!hasWhiteLabelAccess && (
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            White label branding and custom domains require Pro plan ($99/month) or higher. 
            <Button variant="link" className="p-0 ml-2">
              Upgrade Now
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Domains
          </TabsTrigger>
          <TabsTrigger value="branding" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Branding
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="domains" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Domain Overview</CardTitle>
              <CardDescription>
                Manage custom domains and subdomains for your white label deployment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Globe className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Custom Domains</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <Shield className="h-5 w-5 text-green-500" />
                      <div>
                        <p className="text-sm font-medium">SSL Verified</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center space-x-2">
                      <ExternalLink className="h-5 w-5 text-electric-500" />
                      <div>
                        <p className="text-sm font-medium">Active</p>
                        <p className="text-2xl font-bold">0</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
          
          <DomainManagement />
        </TabsContent>

        <TabsContent value="branding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Brand Preview</CardTitle>
              <CardDescription>
                Preview how your branding will appear to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {whiteLabelConfig?.isWhiteLabelActive ? (
                <div className="p-6 border rounded-lg bg-gradient-to-r from-blue-50 to-electric-50">
                  <div 
                    className="text-2xl font-bold mb-2"
                    style={{ color: whiteLabelConfig.config.primaryColor }}
                  >
                    {whiteLabelConfig.config.companyName}
                  </div>
                  <p className="text-gray-600">Your branded travel management platform</p>
                  <div className="flex space-x-2 mt-4">
                    <div 
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: whiteLabelConfig.config.primaryColor }}
                    />
                    <div 
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: whiteLabelConfig.config.secondaryColor }}
                    />
                    <div 
                      className="w-6 h-6 rounded"
                      style={{ backgroundColor: whiteLabelConfig.config.accentColor }}
                    />
                  </div>
                </div>
              ) : (
                <div className="p-6 border rounded-lg bg-gray-50">
                  <div className="text-2xl font-bold mb-2 text-gray-400">
                    NestMap
                  </div>
                  <p className="text-gray-500">Default branding (configure to customize)</p>
                </div>
              )}
            </CardContent>
          </Card>

          <WhiteLabelSettings />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>White Label Settings</CardTitle>
              <CardDescription>
                Advanced configuration for your white label deployment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Plan</label>
                  <p className="text-lg font-bold">{currentPlan.toUpperCase()}</p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">White Label Status</label>
                  <p className="text-lg font-bold">
                    {whiteLabelConfig?.isWhiteLabelActive ? 'Active' : 'Inactive'}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Custom Domains</label>
                  <p className="text-lg font-bold">
                    {hasWhiteLabelAccess ? 'Available' : 'Upgrade Required'}
                  </p>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">SSL Certificates</label>
                  <p className="text-lg font-bold">
                    {hasWhiteLabelAccess ? 'Auto-Provisioned' : 'Not Available'}
                  </p>
                </div>
              </div>

              {!hasWhiteLabelAccess && (
                <Alert>
                  <AlertDescription>
                    <div className="space-y-2">
                      <p>Unlock white label features with Pro plan:</p>
                      <ul className="list-disc list-inside space-y-1 text-sm">
                        <li>Custom branding and colors</li>
                        <li>Custom domain hosting</li>
                        <li>SSL certificate provisioning</li>
                        <li>Remove NestMap branding</li>
                        <li>Email template customization</li>
                      </ul>
                    </div>
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
