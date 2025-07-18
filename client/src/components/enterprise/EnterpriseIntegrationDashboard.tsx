import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Shield, 
  CheckCircle, 
  Settings, 
  Globe, 
  MessageSquare, 
  CreditCard, 
  FileText, 
  Users, 
  BarChart3,
  Zap,
  AlertTriangle,
  TrendingUp,
  Lock,
  Languages,
  Slack,
  DollarSign
} from 'lucide-react';
import PolicyCompliancePanel from '@/components/compliance/PolicyCompliancePanel';
import ApprovalWorkflowPanel from '@/components/approvals/ApprovalWorkflowPanel';
import MFASetup from '@/components/security/MFASetup';

interface FeatureStatus {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'inactive' | 'pending' | 'error';
  icon: React.ReactNode;
  category: 'security' | 'compliance' | 'integration' | 'localization' | 'communication';
  lastUpdated: string;
  metrics?: {
    label: string;
    value: string | number;
    trend?: 'up' | 'down' | 'stable';
  }[];
}

export default function EnterpriseIntegrationDashboard() {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedFeature, setSelectedFeature] = useState<string | null>(null);

  const enterpriseFeatures: FeatureStatus[] = [
    {
      id: 'policy-compliance',
      name: 'Policy Compliance',
      description: 'Corporate policy enforcement and compliance checking',
      status: 'active',
      icon: <Shield className="h-5 w-5" />,
      category: 'compliance',
      lastUpdated: '2 hours ago',
      metrics: [
        { label: 'Compliance Rate', value: '94%', trend: 'up' },
        { label: 'Active Policies', value: 12 },
        { label: 'Violations (30d)', value: 3, trend: 'down' }
      ]
    },
    {
      id: 'approval-workflow',
      name: 'Approval Workflows',
      description: 'Multi-level approval automation and management',
      status: 'active',
      icon: <CheckCircle className="h-5 w-5" />,
      category: 'compliance',
      lastUpdated: '1 hour ago',
      metrics: [
        { label: 'Pending Approvals', value: 7 },
        { label: 'Avg. Response Time', value: '2.3h', trend: 'down' },
        { label: 'Auto-approved', value: '67%', trend: 'up' }
      ]
    },
    {
      id: 'mfa-security',
      name: 'Multi-Factor Authentication',
      description: 'Enhanced security with TOTP and SMS verification',
      status: 'active',
      icon: <Lock className="h-5 w-5" />,
      category: 'security',
      lastUpdated: '30 minutes ago',
      metrics: [
        { label: 'Users with MFA', value: '89%', trend: 'up' },
        { label: 'Login Success Rate', value: '98.5%' },
        { label: 'Security Incidents', value: 0, trend: 'stable' }
      ]
    },
    {
      id: 'expense-integration',
      name: 'Expense Integration',
      description: 'Concur, Expensify, and other expense system integration',
      status: 'active',
      icon: <CreditCard className="h-5 w-5" />,
      category: 'integration',
      lastUpdated: '4 hours ago',
      metrics: [
        { label: 'Synced Expenses', value: 1247, trend: 'up' },
        { label: 'Integration Health', value: '100%' },
        { label: 'Last Sync', value: '15 min ago' }
      ]
    },
    {
      id: 'localization',
      name: 'Global Localization',
      description: 'Multi-language and currency support',
      status: 'active',
      icon: <Languages className="h-5 w-5" />,
      category: 'localization',
      lastUpdated: '6 hours ago',
      metrics: [
        { label: 'Supported Languages', value: 12 },
        { label: 'Currency Pairs', value: 45 },
        { label: 'Translation Coverage', value: '95%', trend: 'up' }
      ]
    },
    {
      id: 'communication',
      name: 'Communication Integration',
      description: 'Slack, Teams, and other communication platforms',
      status: 'active',
      icon: <MessageSquare className="h-5 w-5" />,
      category: 'communication',
      lastUpdated: '1 day ago',
      metrics: [
        { label: 'Connected Platforms', value: 3 },
        { label: 'Messages Sent', value: 156, trend: 'up' },
        { label: 'Delivery Rate', value: '99.2%' }
      ]
    },
    {
      id: 'enhanced-calendar',
      name: 'Enhanced Calendar Sync',
      description: 'Advanced calendar integration with multiple providers',
      status: 'active',
      icon: <FileText className="h-5 w-5" />,
      category: 'integration',
      lastUpdated: '3 hours ago',
      metrics: [
        { label: 'Synced Calendars', value: 24 },
        { label: 'Events Created', value: 89, trend: 'up' },
        { label: 'Sync Success Rate', value: '97%' }
      ]
    },
    {
      id: 'gdpr-compliance',
      name: 'GDPR/CCPA Compliance',
      description: 'Data protection and privacy compliance tools',
      status: 'active',
      icon: <Shield className="h-5 w-5" />,
      category: 'compliance',
      lastUpdated: '2 days ago',
      metrics: [
        { label: 'Data Subjects', value: 1456 },
        { label: 'Rights Requests', value: 12, trend: 'stable' },
        { label: 'Compliance Score', value: '98%', trend: 'up' }
      ]
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'default';
      case 'inactive':
        return 'secondary';
      case 'pending':
        return 'outline';
      case 'error':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'inactive':
        return <AlertTriangle className="h-4 w-4 text-gray-500" />;
      case 'pending':
        return <Zap className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Settings className="h-4 w-4" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-3 w-3 text-green-500" />;
      case 'down':
        return <TrendingUp className="h-3 w-3 text-red-500 rotate-180" />;
      default:
        return null;
    }
  };

  const getCategoryFeatures = (category: string) => {
    return enterpriseFeatures.filter(feature => feature.category === category);
  };

  const renderFeatureCard = (feature: FeatureStatus) => (
    <Card key={feature.id} className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => setSelectedFeature(feature.id)}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3">
            {feature.icon}
            <div className="flex-1">
              <h4 className="font-medium">{feature.name}</h4>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {feature.description}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <Badge variant={getStatusColor(feature.status)}>
                  {getStatusIcon(feature.status)}
                  {feature.status}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Updated {feature.lastUpdated}
                </span>
              </div>
            </div>
          </div>
        </div>
        
        {feature.metrics && (
          <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t">
            {feature.metrics.map((metric, index) => (
              <div key={index} className="text-center">
                <div className="flex items-center justify-center gap-1">
                  <span className="text-sm font-medium">{metric.value}</span>
                  {getTrendIcon(metric.trend)}
                </div>
                <span className="text-xs text-muted-foreground">{metric.label}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Active Features</p>
                <p className="text-2xl font-bold">
                  {enterpriseFeatures.filter(f => f.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Integrations</p>
                <p className="text-2xl font-bold">
                  {getCategoryFeatures('integration').length}
                </p>
              </div>
              <Settings className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Security Features</p>
                <p className="text-2xl font-bold">
                  {getCategoryFeatures('security').length}
                </p>
              </div>
              <Lock className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Compliance Tools</p>
                <p className="text-2xl font-bold">
                  {getCategoryFeatures('compliance').length}
                </p>
              </div>
              <Shield className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Feature Status Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {enterpriseFeatures.slice(0, 4).map(renderFeatureCard)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <Shield className="h-4 w-4 mr-2" />
                Configure Policy Rules
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Users className="h-4 w-4 mr-2" />
                Manage Approval Workflows
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Lock className="h-4 w-4 mr-2" />
                Setup Multi-Factor Auth
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Globe className="h-4 w-4 mr-2" />
                Configure Integrations
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderCategoryView = (category: string) => {
    const features = getCategoryFeatures(category);
    return (
      <div className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          {features.map(renderFeatureCard)}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Enterprise Integration Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="compliance">Compliance</TabsTrigger>
              <TabsTrigger value="integration">Integration</TabsTrigger>
              <TabsTrigger value="localization">Localization</TabsTrigger>
              <TabsTrigger value="communication">Communication</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {renderOverview()}
            </TabsContent>

            <TabsContent value="security" className="space-y-6">
              {renderCategoryView('security')}
              <MFASetup />
            </TabsContent>

            <TabsContent value="compliance" className="space-y-6">
              {renderCategoryView('compliance')}
              <PolicyCompliancePanel />
              <ApprovalWorkflowPanel />
            </TabsContent>

            <TabsContent value="integration" className="space-y-6">
              {renderCategoryView('integration')}
              <Card>
                <CardHeader>
                  <CardTitle>Integration Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-3">
                      <Card>
                        <CardContent className="p-4 text-center">
                          <CreditCard className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                          <h4 className="font-medium">Expense Systems</h4>
                          <p className="text-sm text-muted-foreground">Concur, Expensify</p>
                          <Badge variant="default" className="mt-2">Connected</Badge>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4 text-center">
                          <FileText className="h-8 w-8 mx-auto mb-2 text-green-500" />
                          <h4 className="font-medium">Calendar Systems</h4>
                          <p className="text-sm text-muted-foreground">Google, Outlook</p>
                          <Badge variant="default" className="mt-2">Connected</Badge>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardContent className="p-4 text-center">
                          <DollarSign className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                          <h4 className="font-medium">HR Systems</h4>
                          <p className="text-sm text-muted-foreground">Workday, BambooHR</p>
                          <Badge variant="secondary" className="mt-2">Available</Badge>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="localization" className="space-y-6">
              {renderCategoryView('localization')}
              <Card>
                <CardHeader>
                  <CardTitle>Localization Settings</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="font-medium mb-2">Supported Languages</h4>
                      <div className="flex flex-wrap gap-2">
                        {['English', 'Spanish', 'French', 'German', 'Japanese', 'Chinese'].map(lang => (
                          <Badge key={lang} variant="outline">{lang}</Badge>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Supported Currencies</h4>
                      <div className="flex flex-wrap gap-2">
                        {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map(currency => (
                          <Badge key={currency} variant="outline">{currency}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="communication" className="space-y-6">
              {renderCategoryView('communication')}
              <Card>
                <CardHeader>
                  <CardTitle>Communication Platforms</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Slack className="h-8 w-8 mx-auto mb-2 text-purple-500" />
                        <h4 className="font-medium">Slack</h4>
                        <p className="text-sm text-muted-foreground">Team notifications</p>
                        <Badge variant="default" className="mt-2">Connected</Badge>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <MessageSquare className="h-8 w-8 mx-auto mb-2 text-blue-500" />
                        <h4 className="font-medium">Microsoft Teams</h4>
                        <p className="text-sm text-muted-foreground">Enterprise chat</p>
                        <Badge variant="default" className="mt-2">Connected</Badge>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardContent className="p-4 text-center">
                        <Settings className="h-8 w-8 mx-auto mb-2 text-gray-500" />
                        <h4 className="font-medium">Webhooks</h4>
                        <p className="text-sm text-muted-foreground">Custom integrations</p>
                        <Badge variant="secondary" className="mt-2">Available</Badge>
                      </CardContent>
                    </Card>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
