import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/JWTAuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { motion } from "framer-motion";
import {
  Activity,
  Cpu,
  HardDrive,
  MemoryStick,
  Network,
  Server,
  AlertTriangle,
  CheckCircle,
  XCircle,
  RefreshCw,
  Zap,
  Clock,
  TrendingUp,
  AlertCircle
} from "lucide-react";
import { AlertNotifications } from "@/components/AlertNotifications";

interface SystemMetrics {
  server: {
    uptime: number;
    nodeVersion: string;
    platform: string;
    architecture: string;
    pid: number;
  };
  memory: {
    totalSystemMemory: number;
    freeSystemMemory: number;
    usedSystemMemory: number;
    nodeMemoryUsage: {
      rss: number;
      heapUsed: number;
      heapTotal: number;
      external: number;
    };
    memoryUtilization: number;
  };
  cpu: {
    loadAverage: number[];
    cpuCount: number;
    cpuUsage: number;
  };
  disk: {
    totalSpace: number;
    freeSpace: number;
    usedSpace: number;
    diskUtilization: number;
  };
  network: {
    activeConnections: number;
    requestsPerSecond: number;
    bandwidth: {
      incoming: number;
      outgoing: number;
    };
  };
  performance: {
    responseTimeP50: number;
    responseTimeP95: number;
    responseTimeP99: number;
    errorRate: number;
    throughput: number;
  };
  alerts: {
    critical: number;
    warning: number;
    info: number;
  };
  timestamp: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

function getStatusColor(value: number, thresholds: { warning: number; critical: number }): string {
  if (value >= thresholds.critical) return "text-red-600 bg-red-50";
  if (value >= thresholds.warning) return "text-yellow-600 bg-yellow-50";
  return "text-green-600 bg-green-50";
}

function getProgressColor(value: number, thresholds: { warning: number; critical: number }): string {
  if (value >= thresholds.critical) return "bg-red-500";
  if (value >= thresholds.warning) return "bg-yellow-500";
  return "bg-green-500";
}

export default function AdminSystemMetrics() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [autoRefresh, setAutoRefresh] = useState(true);

  const { data: metrics, isLoading, refetch } = useQuery<SystemMetrics>({
    queryKey: ['/api/system/metrics'],
    refetchInterval: autoRefresh ? 10000 : false, // Refresh every 10 seconds
    staleTime: 5000,
  });

  const { data: healthSummary } = useQuery<{
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    memory: { utilization: number; used: number; total: number };
    cpu: { usage: number; loadAverage: number };
    disk: { utilization: number };
    performance: { errorRate: number; averageResponseTime: number; requestsProcessed: number };
    timestamp: string;
  }>({
    queryKey: ['/api/system/health-summary'],
    refetchInterval: autoRefresh ? 15000 : false,
  });

  const resetMetrics = async () => {
    try {
      await apiRequest("POST", "/api/system/metrics/reset");
      toast({
        title: "Metrics Reset",
        description: "System metrics counters have been reset successfully.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Reset Failed",
        description: "Failed to reset metrics counters.",
        variant: "destructive",
      });
    }
  };

  if (!user || user.role !== 'superadmin') {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Restricted</h2>
        <p className="text-muted-foreground">System metrics access requires superadmin privileges.</p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">System Metrics</h1>
          <p className="text-muted-foreground">Real-time server performance monitoring</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
            className={autoRefresh ? "bg-green-50 border-green-200" : ""}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto Refresh {autoRefresh ? 'On' : 'Off'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Now
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={resetMetrics}
          >
            Reset Metrics
          </Button>
        </div>
      </div>

      {/* Status Overview */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System Status</p>
                  <p className="text-lg font-semibold">
                    {healthSummary?.status === 'healthy' ? 'Healthy' : 
                     healthSummary?.status === 'warning' ? 'Warning' : 'Critical'}
                  </p>
                </div>
                {healthSummary?.status === 'healthy' ? (
                  <CheckCircle className="h-8 w-8 text-green-500" />
                ) : healthSummary?.status === 'warning' ? (
                  <AlertTriangle className="h-8 w-8 text-yellow-500" />
                ) : (
                  <XCircle className="h-8 w-8 text-red-500" />
                )}
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                  <p className="text-lg font-semibold">
                    {metrics ? formatUptime(metrics.server.uptime) : 'Loading...'}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-blue-500" />
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Alerts</p>
                  <div className="flex gap-2">
                    {(metrics?.alerts?.critical || 0) > 0 && (
                      <Badge className="bg-red-100 text-red-700">{metrics?.alerts?.critical} Critical</Badge>
                    )}
                    {(metrics?.alerts?.warning || 0) > 0 && (
                      <Badge className="bg-yellow-100 text-yellow-700">{metrics?.alerts?.warning} Warning</Badge>
                    )}
                    {(metrics?.alerts?.critical || 0) === 0 && (metrics?.alerts?.warning || 0) === 0 && (
                      <Badge className="bg-green-100 text-green-700">All Clear</Badge>
                    )}
                  </div>
                </div>
                <AlertCircle className="h-8 w-8 text-orange-500" />
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Throughput</p>
                  <p className="text-lg font-semibold">
                    {metrics?.performance.throughput.toFixed(1) || '0'} req/s
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>
      </motion.div>

      {/* Resource Utilization */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {/* Memory Usage */}
        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <MemoryStick className="h-4 w-4" />
                Memory Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Utilization</span>
                  <span className={getStatusColor(metrics?.memory.memoryUtilization || 0, { warning: 75, critical: 90 })}>
                    {metrics?.memory.memoryUtilization.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={metrics?.memory.memoryUtilization || 0} 
                  className="h-2"
                />
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>Heap: {formatBytes(metrics?.memory.nodeMemoryUsage.heapUsed || 0)}</div>
                  <div>RSS: {formatBytes(metrics?.memory.nodeMemoryUsage.rss || 0)}</div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        {/* CPU Usage */}
        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Cpu className="h-4 w-4" />
                CPU Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Usage</span>
                  <span className={getStatusColor(metrics?.cpu.cpuUsage || 0, { warning: 70, critical: 85 })}>
                    {metrics?.cpu.cpuUsage.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={metrics?.cpu.cpuUsage || 0} 
                  className="h-2"
                />
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>Cores: {metrics?.cpu.cpuCount}</div>
                  <div>Load: {metrics?.cpu.loadAverage[0]?.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        {/* Disk Usage */}
        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                Disk Usage
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Utilization</span>
                  <span className={getStatusColor(metrics?.disk.diskUtilization || 0, { warning: 85, critical: 95 })}>
                    {metrics?.disk.diskUtilization.toFixed(1)}%
                  </span>
                </div>
                <Progress 
                  value={metrics?.disk.diskUtilization || 0} 
                  className="h-2"
                />
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>Used: {formatBytes(metrics?.disk.usedSpace || 0)}</div>
                  <div>Free: {formatBytes(metrics?.disk.freeSpace || 0)}</div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        {/* Network Activity */}
        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Network className="h-4 w-4" />
                Network Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span>Connections</span>
                  <span>{metrics?.network.activeConnections}</span>
                </div>
                <div className="text-xs space-y-1 text-muted-foreground">
                  <div>Requests/sec: {metrics?.network.requestsPerSecond.toFixed(2)}</div>
                  <div>In: {metrics?.network.bandwidth.incoming.toFixed(1)} KB/s</div>
                  <div>Out: {metrics?.network.bandwidth.outgoing.toFixed(1)} KB/s</div>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>
      </motion.div>

      {/* Real-time Alerts */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="mb-6"
      >
        <motion.div variants={itemVariants}>
          <AlertNotifications />
        </motion.div>
      </motion.div>

      {/* Performance Metrics */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
      >
        {/* Response Times */}
        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Response Times
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">50th Percentile</span>
                  <span className="text-sm">{metrics?.performance.responseTimeP50.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">95th Percentile</span>
                  <span className="text-sm">{metrics?.performance.responseTimeP95.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">99th Percentile</span>
                  <span className="text-sm">{metrics?.performance.responseTimeP99.toFixed(0)}ms</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Error Rate</span>
                  <span className={`text-sm ${(metrics?.performance.errorRate || 0) > 1 ? 'text-red-600' : 'text-green-600'}`}>
                    {metrics?.performance.errorRate.toFixed(2)}%
                  </span>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>

        {/* Server Information */}
        <motion.div variants={itemVariants}>
          <AnimatedCard>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Server Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Node Version</span>
                  <span className="text-sm">{metrics?.server.nodeVersion}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Platform</span>
                  <span className="text-sm">{metrics?.server.platform} ({metrics?.server.architecture})</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Process ID</span>
                  <span className="text-sm">{metrics?.server.pid}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Last Updated</span>
                  <span className="text-sm">
                    {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleTimeString() : 'Never'}
                  </span>
                </div>
              </div>
            </CardContent>
          </AnimatedCard>
        </motion.div>
      </motion.div>
    </div>
  );
}