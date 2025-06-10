import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';
import { Globe, Plus, Trash2, CheckCircle, AlertCircle, ExternalLink, Copy } from 'lucide-react';

interface Domain {
  id: number;
  domain: string;
  subdomain: string;
  status: 'pending' | 'active' | 'failed' | 'disabled';
  dns_verified: boolean;
  ssl_verified: boolean;
  created_at: string;
  verified_at: string;
}

interface DomainDashboard {
  hasAccess: boolean;
  currentPlan: string;
  whiteLabelEnabled: boolean;
  domains: Domain[];
  branding: any;
  features: {
    customDomain: boolean;
    customBranding: boolean;
    sslCertificates: boolean;
    subdomains: boolean;
  };
}

export default function DomainManagement() {
  const [addDomainOpen, setAddDomainOpen] = useState(false);
  const [customDomain, setCustomDomain] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [domainType, setDomainType] = useState<'custom' | 'subdomain'>('subdomain');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: dashboard, isLoading } = useQuery<DomainDashboard>({
    queryKey: ['/api/domains/dashboard'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/domains/dashboard');
      return response.json();
    }
  });

  const addDomainMutation = useMutation({
    mutationFn: async (data: { domain?: string; subdomain?: string }) => {
      const response = await apiRequest('POST', '/api/domains', data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains/dashboard'] });
      setAddDomainOpen(false);
      setCustomDomain('');
      setSubdomain('');
      toast({
        title: "Domain Added",
        description: data.domain ? "Custom domain added successfully" : "Subdomain configured successfully"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Add Domain",
        description: error.message || "An error occurred",
        variant: "destructive"
      });
    }
  });

  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: number) => {
      const response = await apiRequest('POST', `/api/domains/${domainId}/verify`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains/dashboard'] });
      toast({
        title: "Domain Verified",
        description: "Domain verification successful"
      });
    },
    onError: (error: any) => {
      toast({
        title: "Verification Failed",
        description: error.message || "DNS verification failed",
        variant: "destructive"
      });
    }
  });

  const deleteDomainMutation = useMutation({
    mutationFn: async (domainId: number) => {
      const response = await apiRequest('DELETE', `/api/domains/${domainId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/domains/dashboard'] });
      toast({
        title: "Domain Deleted",
        description: "Domain removed successfully"
      });
    }
  });

  const getStatusBadge = (domain: Domain) => {
    switch (domain.status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Active</Badge>;
      case 'pending':
        return <Badge className="bg-yellow-100 text-yellow-800">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-red-100 text-red-800">Failed</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied",
      description: "DNS record copied to clipboard"
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Failed to load domain dashboard. Please try again.
        </AlertDescription>
      </Alert>
    );
  }

  if (!dashboard.hasAccess) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Custom Domains
          </CardTitle>
          <CardDescription>
            Custom domains require Pro plan or higher
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Upgrade to Pro plan ($99/month) to enable custom domains and white label branding.
            </AlertDescription>
          </Alert>
          <Button className="mt-4" disabled>
            Upgrade Required
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Domain Management
              </CardTitle>
              <CardDescription>
                Configure custom domains for your white label deployment
              </CardDescription>
            </div>
            <Dialog open={addDomainOpen} onOpenChange={setAddDomainOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Domain
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Domain</DialogTitle>
                  <DialogDescription>
                    Add a custom domain or configure a subdomain for your organization
                  </DialogDescription>
                </DialogHeader>
                <Tabs value={domainType} onValueChange={(v) => setDomainType(v as 'custom' | 'subdomain')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="subdomain">Subdomain</TabsTrigger>
                    <TabsTrigger value="custom">Custom Domain</TabsTrigger>
                  </TabsList>
                  <TabsContent value="subdomain" className="space-y-4">
                    <div>
                      <Label htmlFor="subdomain">Subdomain</Label>
                      <div className="flex items-center space-x-2">
                        <Input
                          id="subdomain"
                          placeholder="mycompany"
                          value={subdomain}
                          onChange={(e) => setSubdomain(e.target.value)}
                        />
                        <span className="text-sm text-gray-500">.nestmap.com</span>
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="custom" className="space-y-4">
                    <div>
                      <Label htmlFor="custom-domain">Custom Domain</Label>
                      <Input
                        id="custom-domain"
                        placeholder="travel.mycompany.com"
                        value={customDomain}
                        onChange={(e) => setCustomDomain(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                </Tabs>
                <DialogFooter>
                  <Button
                    onClick={() => {
                      if (domainType === 'custom') {
                        addDomainMutation.mutate({ domain: customDomain });
                      } else {
                        addDomainMutation.mutate({ subdomain });
                      }
                    }}
                    disabled={addDomainMutation.isPending}
                  >
                    {addDomainMutation.isPending ? 'Adding...' : 'Add Domain'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {dashboard.domains.length === 0 ? (
            <div className="text-center py-8">
              <Globe className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No domains configured</h3>
              <p className="text-gray-500 mb-4">Add your first custom domain to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {dashboard.domains.map((domain) => (
                <Card key={domain.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div>
                          <h4 className="font-medium">
                            {domain.domain || `${domain.subdomain}.nestmap.com`}
                          </h4>
                          <div className="flex items-center space-x-2 mt-1">
                            {getStatusBadge(domain)}
                            {domain.dns_verified && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                DNS Verified
                              </Badge>
                            )}
                            {domain.ssl_verified && (
                              <Badge variant="outline" className="text-green-600">
                                <CheckCircle className="h-3 w-3 mr-1" />
                                SSL Active
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {domain.status === 'pending' && (
                          <Button
                            size="sm"
                            onClick={() => verifyDomainMutation.mutate(domain.id)}
                            disabled={verifyDomainMutation.isPending}
                          >
                            Verify
                          </Button>
                        )}
                        {domain.status === 'active' && (
                          <Button size="sm" variant="outline" asChild>
                            <a
                              href={`https://${domain.domain || `${domain.subdomain}.nestmap.com`}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <ExternalLink className="h-4 w-4 mr-1" />
                              Visit
                            </a>
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteDomainMutation.mutate(domain.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {domain.domain && domain.status === 'pending' && (
                      <Alert className="mt-4">
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription>
                          <div className="space-y-2">
                            <p>Add this CNAME record to your DNS:</p>
                            <div className="bg-gray-100 p-2 rounded font-mono text-sm flex items-center justify-between">
                              <span>{domain.domain} CNAME your-nestmap-domain.com</span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(`${domain.domain} CNAME your-nestmap-domain.com`)}
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
