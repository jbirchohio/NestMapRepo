import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Shield, 
  AlertTriangle, 
  Eye, 
  Download, 
  Filter,
  Search,
  Clock,
  User,
  MapPin,
  Activity,
  Lock,
  Unlock,
  CheckCircle,
  XCircle,
  AlertCircle
} from "lucide-react";

interface SecurityEvent {
  id: string;
  timestamp: string;
  type: 'login' | 'failed_login' | 'permission_change' | 'data_access' | 'security_alert';
  severity: 'low' | 'medium' | 'high' | 'critical';
  user: {
    id: string;
    name: string;
    email: string;
  };
  details: string;
  ip: string;
  location: string;
  userAgent: string;
  resolved: boolean;
}

interface SecurityMetrics {
  totalEvents: number;
  criticalAlerts: number;
  failedLogins: number;
  suspiciousActivity: number;
  activeThreats: number;
}

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: '1',
    timestamp: '2025-06-07T02:30:00Z',
    type: 'security_alert',
    severity: 'critical',
    user: { id: '1', name: 'Admin User', email: 'admin@nestmap.com' },
    details: 'Multiple failed login attempts detected from suspicious IP',
    ip: '192.168.1.100',
    location: 'Unknown',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    resolved: false
  },
  {
    id: '2',
    timestamp: '2025-06-07T02:25:00Z',
    type: 'failed_login',
    severity: 'medium',
    user: { id: '2', name: 'John Doe', email: 'john@company.com' },
    details: 'Failed login attempt with incorrect password',
    ip: '203.0.113.42',
    location: 'New York, US',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    resolved: true
  },
  {
    id: '3',
    timestamp: '2025-06-07T02:20:00Z',
    type: 'permission_change',
    severity: 'high',
    user: { id: '3', name: 'Sarah Wilson', email: 'sarah@company.com' },
    details: 'User role elevated to administrator',
    ip: '198.51.100.15',
    location: 'San Francisco, US',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    resolved: true
  },
  {
    id: '4',
    timestamp: '2025-06-07T02:15:00Z',
    type: 'data_access',
    severity: 'low',
    user: { id: '4', name: 'Mike Chen', email: 'mike@company.com' },
    details: 'Accessed sensitive financial data outside normal hours',
    ip: '172.16.0.5',
    location: 'Seattle, US',
    userAgent: 'Mozilla/5.0 (iPad; CPU OS 15_6 like Mac OS X)',
    resolved: true
  },
  {
    id: '5',
    timestamp: '2025-06-07T02:10:00Z',
    type: 'login',
    severity: 'low',
    user: { id: '5', name: 'Lisa Johnson', email: 'lisa@company.com' },
    details: 'Successful login from new device',
    ip: '10.0.0.25',
    location: 'Chicago, US',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_6 like Mac OS X)',
    resolved: true
  }
];

const mockMetrics: SecurityMetrics = {
  totalEvents: 127,
  criticalAlerts: 3,
  failedLogins: 15,
  suspiciousActivity: 8,
  activeThreats: 2
};

export default function AdminSecurity() {
  const [selectedTab, setSelectedTab] = useState("events");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: securityEvents = mockSecurityEvents } = useQuery({
    queryKey: ['/api/admin/security/events'],
    queryFn: () => mockSecurityEvents
  });

  const { data: metrics = mockMetrics } = useQuery({
    queryKey: ['/api/admin/security/metrics'],
    queryFn: () => mockMetrics
  });

  const filteredEvents = securityEvents.filter(event => {
    const matchesType = filterType === "all" || event.type === filterType;
    const matchesSeverity = filterSeverity === "all" || event.severity === filterSeverity;
    const matchesSearch = !searchQuery || 
      event.user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      event.details.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesType && matchesSeverity && matchesSearch;
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-700 border-blue-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'login': return <CheckCircle className="w-4 h-4" />;
      case 'failed_login': return <XCircle className="w-4 h-4" />;
      case 'permission_change': return <Shield className="w-4 h-4" />;
      case 'data_access': return <Eye className="w-4 h-4" />;
      case 'security_alert': return <AlertTriangle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Security Dashboard
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Monitor security events and system access patterns
              </p>
            </div>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </div>
        </motion.div>

        {/* Security Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-8"
        >
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Events</p>
                  <p className="text-2xl font-bold">{metrics.totalEvents}</p>
                </div>
                <Activity className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Critical Alerts</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.criticalAlerts}</p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Failed Logins</p>
                  <p className="text-2xl font-bold text-orange-600">{metrics.failedLogins}</p>
                </div>
                <XCircle className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Suspicious Activity</p>
                  <p className="text-2xl font-bold text-yellow-600">{metrics.suspiciousActivity}</p>
                </div>
                <Eye className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Threats</p>
                  <p className="text-2xl font-bold text-red-600">{metrics.activeThreats}</p>
                </div>
                <Shield className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="events">Security Events</TabsTrigger>
              <TabsTrigger value="audit">Audit Logs</TabsTrigger>
              <TabsTrigger value="analytics">Analytics</TabsTrigger>
            </TabsList>

            <TabsContent value="events" className="space-y-6">
              {/* Filters */}
              <Card>
                <CardContent className="p-4">
                  <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex-1 min-w-[200px]">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                        <Input
                          placeholder="Search events..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                    
                    <Select value={filterType} onValueChange={setFilterType}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Event Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Types</SelectItem>
                        <SelectItem value="login">Login</SelectItem>
                        <SelectItem value="failed_login">Failed Login</SelectItem>
                        <SelectItem value="permission_change">Permission Change</SelectItem>
                        <SelectItem value="data_access">Data Access</SelectItem>
                        <SelectItem value="security_alert">Security Alert</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={filterSeverity} onValueChange={setFilterSeverity}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Severities</SelectItem>
                        <SelectItem value="critical">Critical</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="low">Low</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Events List */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Security Events</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    <div className="space-y-4">
                      {filteredEvents.map((event) => (
                        <div
                          key={event.id}
                          className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                        >
                          <div className="flex-shrink-0 p-2 rounded-lg bg-accent">
                            {getTypeIcon(event.type)}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <h4 className="font-medium capitalize">
                                  {event.type.replace('_', ' ')}
                                </h4>
                                <Badge className={getSeverityColor(event.severity)}>
                                  {event.severity}
                                </Badge>
                                {event.resolved ? (
                                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                    Resolved
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                    Active
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center text-sm text-muted-foreground">
                                <Clock className="w-4 h-4 mr-1" />
                                {new Date(event.timestamp).toLocaleString()}
                              </div>
                            </div>
                            
                            <p className="text-sm text-muted-foreground mb-2">
                              {event.details}
                            </p>
                            
                            <div className="flex items-center space-x-4 text-xs text-muted-foreground">
                              <div className="flex items-center">
                                <User className="w-3 h-3 mr-1" />
                                {event.user.name} ({event.user.email})
                              </div>
                              <div className="flex items-center">
                                <MapPin className="w-3 h-3 mr-1" />
                                {event.location}
                              </div>
                              <div>IP: {event.ip}</div>
                            </div>
                          </div>
                          
                          <div className="flex-shrink-0">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="audit" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>System Audit Logs</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <Lock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Audit Logs</h3>
                    <p>Detailed system audit logs and compliance tracking will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Security Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">Security Analytics</h3>
                    <p>Advanced security analytics and threat intelligence will be displayed here.</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </motion.div>
      </div>
    </div>
  );
}