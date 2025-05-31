import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Shield, Building, Globe, CreditCard, Check, X, Clock, AlertTriangle } from "lucide-react";

interface Organization {
  id: number;
  name: string;
  plan: string;
  white_label_enabled: boolean;
  white_label_plan: string;
  subscription_status: string;
  created_at: string;
}

interface WhiteLabelRequest {
  id: number;
  organization_id: number;
  organization_name: string;
  requested_by: number;
  requester_name: string;
  request_type: string;
  request_data: any;
  status: string;
  created_at: string;
}

interface CustomDomain {
  id: number;
  organization_id: number;
  organization_name: string;
  domain: string;
  subdomain: string;
  dns_verified: boolean;
  ssl_verified: boolean;
  status: string;
  created_at: string;
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [reviewDialog, setReviewDialog] = useState<WhiteLabelRequest | null>(null);

  // Fetch organizations
  const { data: organizations = [], isLoading: orgsLoading } = useQuery({
    queryKey: ['/api/admin/organizations'],
  });

  // Fetch white label requests
  const { data: requests = [], isLoading: requestsLoading } = useQuery({
    queryKey: ['/api/admin/white-label-requests'],
  });

  // Fetch custom domains
  const { data: domains = [], isLoading: domainsLoading } = useQuery({
    queryKey: ['/api/admin/custom-domains'],
  });

  // Update organization white label settings
  const updateOrgMutation = useMutation({
    mutationFn: async (data: { orgId: number; updates: any }) => {
      return apiRequest("PATCH", `/api/admin/organizations/${data.orgId}`, data.updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/organizations'] });
      toast({ title: "Organization updated successfully" });
    },
  });

  // Review white label request
  const reviewRequestMutation = useMutation({
    mutationFn: async (data: { requestId: number; status: string; notes?: string }) => {
      return apiRequest("PATCH", `/api/admin/white-label-requests/${data.requestId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/white-label-requests'] });
      setReviewDialog(null);
      toast({ title: "Request reviewed successfully" });
    },
  });

  // Verify domain
  const verifyDomainMutation = useMutation({
    mutationFn: async (domainId: number) => {
      return apiRequest("POST", `/api/admin/domains/${domainId}/verify`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-domains'] });
      toast({ title: "Domain verification initiated" });
    },
  });

  const handleEnableWhiteLabel = (org: Organization) => {
    updateOrgMutation.mutate({
      orgId: org.id,
      updates: {
        white_label_enabled: true,
        white_label_plan: 'basic'
      }
    });
  };

  const handleDisableWhiteLabel = (org: Organization) => {
    updateOrgMutation.mutate({
      orgId: org.id,
      updates: {
        white_label_enabled: false,
        white_label_plan: 'none'
      }
    });
  };

  const handleUpgradePlan = (org: Organization, plan: string) => {
    updateOrgMutation.mutate({
      orgId: org.id,
      updates: { white_label_plan: plan }
    });
  };

  const handleReviewRequest = (request: WhiteLabelRequest, status: 'approved' | 'rejected', notes?: string) => {
    reviewRequestMutation.mutate({
      requestId: request.id,
      status,
      notes
    });
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-slate-100">
            Admin Dashboard
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Manage white label access and organization settings
          </p>
        </div>
        <Badge variant="secondary" className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Platform Admin
        </Badge>
      </div>

      <Tabs defaultValue="organizations" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="organizations" className="flex items-center gap-2">
            <Building className="h-4 w-4" />
            Organizations
          </TabsTrigger>
          <TabsTrigger value="requests" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Pending Requests
          </TabsTrigger>
          <TabsTrigger value="domains" className="flex items-center gap-2">
            <Globe className="h-4 w-4" />
            Custom Domains
          </TabsTrigger>
          <TabsTrigger value="billing" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        {/* Organizations Tab */}
        <TabsContent value="organizations">
          <Card>
            <CardHeader>
              <CardTitle>Organization Management</CardTitle>
              <CardDescription>
                Manage white label access and settings for organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orgsLoading ? (
                <div className="text-center py-8">Loading organizations...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Plan</TableHead>
                      <TableHead>White Label</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {organizations.map((org: Organization) => (
                      <TableRow key={org.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{org.name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {org.id}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{org.plan}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.white_label_enabled ? "default" : "secondary"}>
                            {org.white_label_plan}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={org.subscription_status === 'active' ? "default" : "destructive"}>
                            {org.subscription_status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {!org.white_label_enabled ? (
                              <Button
                                size="sm"
                                onClick={() => handleEnableWhiteLabel(org)}
                                disabled={updateOrgMutation.isPending}
                              >
                                Enable White Label
                              </Button>
                            ) : (
                              <>
                                <Select
                                  value={org.white_label_plan}
                                  onValueChange={(plan) => handleUpgradePlan(org, plan)}
                                >
                                  <SelectTrigger className="w-32">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="basic">Basic</SelectItem>
                                    <SelectItem value="premium">Premium</SelectItem>
                                    <SelectItem value="enterprise">Enterprise</SelectItem>
                                  </SelectContent>
                                </Select>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => handleDisableWhiteLabel(org)}
                                  disabled={updateOrgMutation.isPending}
                                >
                                  Disable
                                </Button>
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Requests Tab */}
        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Pending White Label Requests</CardTitle>
              <CardDescription>
                Review and approve white label configuration requests
              </CardDescription>
            </CardHeader>
            <CardContent>
              {requestsLoading ? (
                <div className="text-center py-8">Loading requests...</div>
              ) : requests.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending requests
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Request Type</TableHead>
                      <TableHead>Requested By</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {requests.map((request: WhiteLabelRequest) => (
                      <TableRow key={request.id}>
                        <TableCell className="font-medium">
                          {request.organization_name}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {request.request_type.replace('_', ' ')}
                          </Badge>
                        </TableCell>
                        <TableCell>{request.requester_name}</TableCell>
                        <TableCell>
                          <Badge variant={
                            request.status === 'pending' ? 'secondary' :
                            request.status === 'approved' ? 'default' : 'destructive'
                          }>
                            {request.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(request.created_at).toLocaleDateString()}
                        </TableCell>
                        <TableCell>
                          {request.status === 'pending' && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button size="sm" onClick={() => setReviewDialog(request)}>
                                  Review
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Review Request</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <Label>Organization</Label>
                                    <div className="font-medium">{request.organization_name}</div>
                                  </div>
                                  <div>
                                    <Label>Request Type</Label>
                                    <div>{request.request_type}</div>
                                  </div>
                                  <div>
                                    <Label>Request Data</Label>
                                    <pre className="text-sm bg-slate-100 dark:bg-slate-800 p-2 rounded">
                                      {JSON.stringify(request.request_data, null, 2)}
                                    </pre>
                                  </div>
                                  <div>
                                    <Label htmlFor="review-notes">Review Notes</Label>
                                    <Textarea id="review-notes" placeholder="Optional notes..." />
                                  </div>
                                </div>
                                <DialogFooter>
                                  <Button
                                    variant="destructive"
                                    onClick={() => handleReviewRequest(request, 'rejected')}
                                    disabled={reviewRequestMutation.isPending}
                                  >
                                    <X className="h-4 w-4 mr-2" />
                                    Reject
                                  </Button>
                                  <Button
                                    onClick={() => handleReviewRequest(request, 'approved')}
                                    disabled={reviewRequestMutation.isPending}
                                  >
                                    <Check className="h-4 w-4 mr-2" />
                                    Approve
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Domains Tab */}
        <TabsContent value="domains">
          <Card>
            <CardHeader>
              <CardTitle>Custom Domain Management</CardTitle>
              <CardDescription>
                Manage and verify custom domains for organizations
              </CardDescription>
            </CardHeader>
            <CardContent>
              {domainsLoading ? (
                <div className="text-center py-8">Loading domains...</div>
              ) : domains.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No custom domains configured
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Organization</TableHead>
                      <TableHead>Domain</TableHead>
                      <TableHead>DNS Status</TableHead>
                      <TableHead>SSL Status</TableHead>
                      <TableHead>Overall Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {domains.map((domain: CustomDomain) => (
                      <TableRow key={domain.id}>
                        <TableCell className="font-medium">
                          {domain.organization_name}
                        </TableCell>
                        <TableCell>
                          <div>
                            <div className="font-medium">{domain.domain}</div>
                            {domain.subdomain && (
                              <div className="text-sm text-muted-foreground">
                                Subdomain: {domain.subdomain}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={domain.dns_verified ? "default" : "destructive"}>
                            {domain.dns_verified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={domain.ssl_verified ? "default" : "destructive"}>
                            {domain.ssl_verified ? "Verified" : "Pending"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant={
                            domain.status === 'active' ? 'default' :
                            domain.status === 'pending' ? 'secondary' : 'destructive'
                          }>
                            {domain.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => verifyDomainMutation.mutate(domain.id)}
                            disabled={verifyDomainMutation.isPending}
                          >
                            Verify
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle>White Label Billing</CardTitle>
              <CardDescription>
                Manage billing and subscription settings for white label features
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Basic Plan</CardTitle>
                      <CardDescription>$29/month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• Custom logo</li>
                        <li>• Basic color customization</li>
                        <li>• Up to 10 users</li>
                        <li>• Email support</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Premium Plan</CardTitle>
                      <CardDescription>$99/month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• Full color customization</li>
                        <li>• Subdomain hosting</li>
                        <li>• Up to 50 users</li>
                        <li>• Priority support</li>
                        <li>• Remove "Powered by" branding</li>
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Enterprise Plan</CardTitle>
                      <CardDescription>$299/month</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm">
                        <li>• Custom domain</li>
                        <li>• SSL certificates</li>
                        <li>• Unlimited users</li>
                        <li>• Dedicated support</li>
                        <li>• API access</li>
                        <li>• Custom email templates</li>
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800 dark:text-amber-200">
                        Billing Integration Required
                      </h4>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        To enable white label billing, you need to configure Stripe API keys. 
                        This will allow automatic subscription management and payment processing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}