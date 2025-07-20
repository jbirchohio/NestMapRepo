import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
 
  FileText,
  Settings,
  TrendingUp,
  Users,
  Calendar
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface PolicyRule {
  id: string;
  name: string;
  description: string;
  type: 'budget' | 'approval' | 'booking' | 'travel' | 'expense' | 'compliance';
  severity: 'warning' | 'error' | 'info';
  enabled: boolean;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
}

interface PolicyCondition {
  field: string;
  operator: string;
  value: any;
  logicalOperator?: 'AND' | 'OR';
}

interface PolicyAction {
  type: 'block' | 'require_approval' | 'notify' | 'auto_approve' | 'flag';
  message?: string;
  approverRoles?: string[];
}

interface PolicyViolation {
  id: string;
  ruleId: string;
  entityType: 'trip' | 'activity' | 'expense' | 'booking';
  entityId: number;
  severity: 'warning' | 'error' | 'info';
  message: string;
  status: 'active' | 'resolved' | 'ignored';
  createdAt: string;
}

interface ComplianceMetrics {
  totalPolicies: number;
  activePolicies: number;
  violationsLast30Days: number;
  complianceRate: number;
  topViolations: { rule: string; count: number }[];
}

export default function PolicyCompliancePanel() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedRule, setSelectedRule] = useState<PolicyRule | null>(null);
  const [showRuleDialog, setShowRuleDialog] = useState(false);

  // Fetch compliance metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<ComplianceMetrics>({
    queryKey: ['/api/compliance/metrics'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/compliance/metrics');
      return response.data;
    }
  });

  // Fetch policy rules
  const { data: rules, isLoading: rulesLoading, refetch: refetchRules } = useQuery<PolicyRule[]>({
    queryKey: ['/api/policies/rules'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/policies/rules');
      return response.data;
    }
  });

  // Fetch violations
  const { data: violations, isLoading: violationsLoading } = useQuery<PolicyViolation[]>({
    queryKey: ['/api/compliance/violations'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/compliance/violations');
      return response.data;
    }
  });

  // Toggle rule enabled/disabled
  const toggleRuleMutation = useMutation({
    mutationFn: ({ ruleId, enabled }: { ruleId: string; enabled: boolean }) =>
      apiRequest('PATCH', `/api/policies/rules/${ruleId}`, { enabled }),
    onSuccess: () => {
      toast({
        title: 'Policy Updated',
        description: 'Policy rule has been updated successfully'
      });
      refetchRules();
    },
    onError: () => {
      toast({
        title: 'Update Failed',
        description: 'Failed to update policy rule',
        variant: 'destructive'
      });
    }
  });

  // Resolve violation
  const resolveViolationMutation = useMutation({
    mutationFn: (violationId: string) =>
      apiRequest('POST', `/api/compliance/violations/${violationId}/resolve`),
    onSuccess: () => {
      toast({
        title: 'Violation Resolved',
        description: 'Policy violation has been marked as resolved'
      });
    },
    onError: () => {
      toast({
        title: 'Resolution Failed',
        description: 'Failed to resolve policy violation',
        variant: 'destructive'
      });
    }
  });

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <CheckCircle className="h-4 w-4 text-blue-500" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error':
        return 'destructive';
      case 'warning':
        return 'secondary';
      case 'info':
        return 'outline';
      default:
        return 'default';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'budget':
        return <TrendingUp className="h-4 w-4" />;
      case 'approval':
        return <CheckCircle className="h-4 w-4" />;
      case 'booking':
        return <Calendar className="h-4 w-4" />;
      case 'travel':
        return <Users className="h-4 w-4" />;
      case 'expense':
        return <FileText className="h-4 w-4" />;
      default:
        return <Shield className="h-4 w-4" />;
    }
  };

  if (metricsLoading || rulesLoading || violationsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Policy Compliance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="rules">Policy Rules</TabsTrigger>
              <TabsTrigger value="violations">Violations</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {metrics && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Total Policies</p>
                          <p className="text-2xl font-bold">{metrics.totalPolicies}</p>
                        </div>
                        <Settings className="h-8 w-8 text-muted-foreground" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Active Policies</p>
                          <p className="text-2xl font-bold">{metrics.activePolicies}</p>
                        </div>
                        <CheckCircle className="h-8 w-8 text-green-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Violations (30d)</p>
                          <p className="text-2xl font-bold">{metrics.violationsLast30Days}</p>
                        </div>
                        <AlertTriangle className="h-8 w-8 text-yellow-500" />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-muted-foreground">Compliance Rate</p>
                          <p className="text-2xl font-bold">{metrics.complianceRate}%</p>
                        </div>
                        <TrendingUp className="h-8 w-8 text-blue-500" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Compliance Score</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Overall Compliance</span>
                      <span>{metrics?.complianceRate}%</span>
                    </div>
                    <Progress value={metrics?.complianceRate || 0} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      Based on policy adherence over the last 30 days
                    </p>
                  </div>
                </CardContent>
              </Card>

              {metrics?.topViolations && metrics.topViolations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Top Policy Violations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {metrics.topViolations.map((violation, index) => (
                        <div key={index} className="flex items-center justify-between">
                          <span className="text-sm">{violation.rule}</span>
                          <Badge variant="secondary">{violation.count}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="rules" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Policy Rules</h3>
                <Button onClick={() => setShowRuleDialog(true)}>
                  Add Rule
                </Button>
              </div>

              <div className="space-y-3">
                {rules?.map((rule) => (
                  <Card key={rule.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getTypeIcon(rule.type)}
                          <div>
                            <h4 className="font-medium">{rule.name}</h4>
                            <p className="text-sm text-muted-foreground">{rule.description}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getSeverityColor(rule.severity)}>
                                {rule.severity}
                              </Badge>
                              <Badge variant="outline">{rule.type}</Badge>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedRule(rule);
                              setShowRuleDialog(true);
                            }}
                          >
                            Edit
                          </Button>
                          <Button
                            variant={rule.enabled ? "default" : "secondary"}
                            size="sm"
                            onClick={() => toggleRuleMutation.mutate({
                              ruleId: rule.id,
                              enabled: !rule.enabled
                            })}
                            disabled={toggleRuleMutation.isPending}
                          >
                            {rule.enabled ? 'Enabled' : 'Disabled'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="violations" className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Policy Violations</h3>
                <div className="flex gap-2">
                  <Badge variant="destructive">
                    {violations?.filter(v => v.severity === 'error').length || 0} Critical
                  </Badge>
                  <Badge variant="secondary">
                    {violations?.filter(v => v.severity === 'warning').length || 0} Warnings
                  </Badge>
                </div>
              </div>

              <div className="space-y-3">
                {violations?.map((violation) => (
                  <Card key={violation.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-3">
                          {getSeverityIcon(violation.severity)}
                          <div>
                            <h4 className="font-medium">{violation.message}</h4>
                            <p className="text-sm text-muted-foreground">
                              {violation.entityType} #{violation.entityId}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant={getSeverityColor(violation.severity)}>
                                {violation.severity}
                              </Badge>
                              <Badge variant="outline">{violation.status}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {new Date(violation.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        {violation.status === 'active' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => resolveViolationMutation.mutate(violation.id)}
                            disabled={resolveViolationMutation.isPending}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {violations?.length === 0 && (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">No Active Violations</h3>
                      <p className="text-muted-foreground">
                        All policies are being followed correctly.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={showRuleDialog} onOpenChange={setShowRuleDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {selectedRule ? 'Edit Policy Rule' : 'Add Policy Rule'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <Alert>
              <Settings className="h-4 w-4" />
              <AlertDescription>
                Policy rule configuration interface would be implemented here.
                This would include form fields for rule conditions, actions, and settings.
              </AlertDescription>
            </Alert>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowRuleDialog(false)}>
                Cancel
              </Button>
              <Button onClick={() => setShowRuleDialog(false)}>
                {selectedRule ? 'Update Rule' : 'Create Rule'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
