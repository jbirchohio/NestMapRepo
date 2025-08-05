import { useState } from 'react';
import { useLocation } from 'wouter';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/JWTAuthContext';
import { 
  Plane, Users, BarChart3, Shield, Zap, Globe, 
  CheckCircle, Play, ArrowRight, Clock, RefreshCw 
} from 'lucide-react';

export default function Demo() {
  const [, setLocation] = useLocation();
  const { signIn } = useAuth();
  const [loading, setLoading] = useState(false);
  const [selectedRole, setSelectedRole] = useState<'admin' | 'manager' | 'user'>('admin');

  const features = [
    {
      icon: <Plane className="h-5 w-5" />,
      title: "Trip Planning",
      description: "Create and manage business trips with flights, hotels, and activities"
    },
    {
      icon: <Users className="h-5 w-5" />,
      title: "Team Collaboration", 
      description: "Real-time collaboration with team members on shared trips"
    },
    {
      icon: <BarChart3 className="h-5 w-5" />,
      title: "Analytics Dashboard",
      description: "Comprehensive travel spend analytics and reporting"
    },
    {
      icon: <Shield className="h-5 w-5" />,
      title: "Policy Compliance",
      description: "Automated travel policy enforcement and approval workflows"
    },
    {
      icon: <Zap className="h-5 w-5" />,
      title: "AI Assistant",
      description: "Smart trip recommendations and automated planning"
    },
    {
      icon: <Globe className="h-5 w-5" />,
      title: "White Label",
      description: "Full branding customization for your organization"
    }
  ];

  const demoAccounts = {
    admin: {
      email: 'sarah.chen@techcorp.demo',
      password: 'demo123',
      name: 'Sarah Chen',
      role: 'Admin',
      description: 'Full platform access with administrative controls',
      capabilities: [
        'Manage all trips and users',
        'View analytics dashboard',
        'Configure travel policies',
        'Approve expenses',
        'Access all features'
      ]
    },
    manager: {
      email: 'mike.rodriguez@techcorp.demo',
      password: 'demo123',
      name: 'Mike Rodriguez',
      role: 'Manager',
      description: 'Team management and trip oversight capabilities',
      capabilities: [
        'Create team trips',
        'Approve team expenses',
        'View team analytics',
        'Manage team members',
        'Collaborative planning'
      ]
    },
    user: {
      email: 'emma.thompson@techcorp.demo',
      password: 'demo123',
      name: 'Emma Thompson',
      role: 'User',
      description: 'Standard employee travel planning access',
      capabilities: [
        'Create personal trips',
        'Submit expenses',
        'Book travel',
        'Collaborate on trips',
        'Mobile access'
      ]
    }
  };

  const handleQuickStart = async () => {
    setLoading(true);
    try {
      const account = demoAccounts[selectedRole];
      await signIn(account.email, account.password);
      setLocation('/dashboard');
    } catch (error) {
      console.error('Demo login failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <Badge className="mb-4" variant="secondary">
            <Play className="h-3 w-3 mr-1" />
            Live Demo
          </Badge>
          <h1 className="text-4xl font-bold mb-4">
            Experience Remvana
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Explore our enterprise travel management platform with full access. 
            No signup required. Data resets every 30 minutes.
          </p>
        </div>

        {/* Quick Start Card */}
        <Card className="max-w-4xl mx-auto mb-12 border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Quick Start Demo
            </CardTitle>
            <CardDescription>
              Choose a role and start exploring immediately
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={selectedRole} onValueChange={(v) => setSelectedRole(v as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="admin">Admin</TabsTrigger>
                <TabsTrigger value="manager">Manager</TabsTrigger>
                <TabsTrigger value="user">User</TabsTrigger>
              </TabsList>
              
              {Object.entries(demoAccounts).map(([key, account]) => (
                <TabsContent key={key} value={key} className="space-y-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-lg">{account.name}</h3>
                      <p className="text-sm text-muted-foreground">{account.role} • {account.email}</p>
                      <p className="mt-2">{account.description}</p>
                    </div>
                    <Badge variant="outline">{account.role}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2">
                    {account.capabilities.map((cap, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        <span>{cap}</span>
                      </div>
                    ))}
                  </div>

                  <Button 
                    onClick={handleQuickStart} 
                    disabled={loading}
                    className="w-full"
                    size="lg"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Starting Demo...
                      </>
                    ) : (
                      <>
                        Start as {account.name}
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </>
                    )}
                  </Button>
                </TabsContent>
              ))}
            </Tabs>

            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Demo data automatically resets every 30 minutes to ensure a clean experience
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Features Grid */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-center mb-8">
            What You Can Explore
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {features.map((feature, i) => (
              <Card key={i} className="border-muted">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <div className="p-2 bg-primary/10 rounded-lg text-primary">
                      {feature.icon}
                    </div>
                    {feature.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Additional Info */}
        <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Demo Limitations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground">
                • No real bookings or payments
              </p>
              <p className="text-sm text-muted-foreground">
                • Email notifications disabled
              </p>
              <p className="text-sm text-muted-foreground">
                • Data resets every 30 minutes
              </p>
              <p className="text-sm text-muted-foreground">
                • Limited to 10 trips per session
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ready for More?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Get a personalized demo or start your free trial
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setLocation('/contact')}>
                  Contact Sales
                </Button>
                <Button variant="outline" onClick={() => setLocation('/signup')}>
                  Start Free Trial
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}