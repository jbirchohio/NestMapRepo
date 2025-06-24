import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/auth/NewAuthContext";
import { apiRequest } from "@/lib/queryClient";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, AlertCircle, Info, CheckCircle, X, Bell, BellOff, Clock, Shield, Activity, Server, Network } from "lucide-react";
interface SystemAlert {
    id: string;
    type: 'critical' | 'warning' | 'info';
    category: 'performance' | 'security' | 'system' | 'network';
    title: string;
    message: string;
    timestamp: string;
    acknowledged: boolean;
    metadata?: Record<string, any>;
}
interface AlertsResponse {
    alerts: SystemAlert[];
    summary: {
        total: number;
        critical: number;
        warning: number;
        info: number;
        unacknowledged: number;
    };
}
function getAlertIcon(type: string, category: string) {
    if (type === 'critical')
        return AlertTriangle;
    if (type === 'warning')
        return AlertCircle;
    if (category === 'security')
        return Shield;
    if (category === 'performance')
        return Activity;
    if (category === 'system')
        return Server;
    if (category === 'network')
        return Network;
    return Info;
}
function getAlertColor(type: string) {
    switch (type) {
        case 'critical': return 'text-red-600 bg-red-50 border-red-200';
        case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
        case 'info': return 'text-blue-600 bg-blue-50 border-blue-200';
        default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
}
function getBadgeColor(type: string) {
    switch (type) {
        case 'critical': return 'bg-red-100 text-red-700';
        case 'warning': return 'bg-yellow-100 text-yellow-700';
        case 'info': return 'bg-blue-100 text-blue-700';
        default: return 'bg-gray-100 text-gray-700';
    }
}
function formatTimeAgo(timestamp: string): string {
    const now = new Date();
    const alertTime = new Date(timestamp);
    const diffMs = now.getTime() - alertTime.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    if (diffMinutes < 1)
        return 'Just now';
    if (diffMinutes < 60)
        return `${diffMinutes}m ago`;
    if (diffHours < 24)
        return `${diffHours}h ago`;
    return `${diffDays}d ago`;
}
export function AlertNotifications() {
    const { user } = useAuth();
    const [showAcknowledged, setShowAcknowledged] = useState(false);
    const { data: alertsData, refetch } = useQuery<AlertsResponse>({
        queryKey: ['/api/alerts', { acknowledged: showAcknowledged ? 'all' : 'false' }],
        refetchInterval: 30000, // Refresh every 30 seconds
        enabled: user?.role === 'superadmin',
    });
    const acknowledgeAlert = async (alertId: string) => {
        try {
            await apiRequest("POST", `/api/alerts/${alertId}/acknowledge`);
            refetch();
        }
        catch (error) {
            console.error('Failed to acknowledge alert:', error);
        }
    };
    const acknowledgeAll = async () => {
        try {
            await apiRequest("POST", "/api/alerts/acknowledge-all");
            refetch();
        }
        catch (error) {
            console.error('Failed to acknowledge all alerts:', error);
        }
    };
    if (user?.role !== 'superadmin') {
        return null;
    }
    const alerts = alertsData?.alerts || [];
    const summary = alertsData?.summary || { total: 0, critical: 0, warning: 0, info: 0, unacknowledged: 0 };
    return (<Card className="border-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="h-5 w-5"/>
            System Alerts
            {summary.unacknowledged > 0 && (<Badge className="bg-red-100 text-red-700 ml-2">
                {summary.unacknowledged} new
              </Badge>)}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowAcknowledged(!showAcknowledged)}>
              {showAcknowledged ? <BellOff className="h-4 w-4"/> : <Bell className="h-4 w-4"/>}
              {showAcknowledged ? 'Hide Acknowledged' : 'Show All'}
            </Button>
            {summary.unacknowledged > 0 && (<Button variant="outline" size="sm" onClick={acknowledgeAll}>
                <CheckCircle className="h-4 w-4 mr-1"/>
                Acknowledge All
              </Button>)}
          </div>
        </div>
        
        {summary.total > 0 && (<div className="flex gap-2 mt-2">
            {summary.critical > 0 && (<Badge className="bg-red-100 text-red-700">
                {summary.critical} Critical
              </Badge>)}
            {summary.warning > 0 && (<Badge className="bg-yellow-100 text-yellow-700">
                {summary.warning} Warning
              </Badge>)}
            {summary.info > 0 && (<Badge className="bg-blue-100 text-blue-700">
                {summary.info} Info
              </Badge>)}
          </div>)}
      </CardHeader>
      
      <CardContent>
        {alerts.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
            <CheckCircle className="h-12 w-12 mx-auto mb-3 text-green-500"/>
            <p className="text-lg font-medium">All Clear</p>
            <p className="text-sm">No system alerts at this time</p>
          </div>) : (<div className="space-y-3 max-h-96 overflow-y-auto">
            <AnimatePresence>
              {alerts.map((alert) => {
                const AlertIcon = getAlertIcon(alert.type, alert.category);
                return (<motion.div key={alert.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className={`p-4 rounded-lg border ${getAlertColor(alert.type)} ${alert.acknowledged ? 'opacity-60' : ''}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <AlertIcon className="h-5 w-5 mt-0.5 flex-shrink-0"/>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-medium text-sm">{alert.title}</h4>
                            <Badge className={getBadgeColor(alert.type)}>
                              {alert.type}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {alert.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            {alert.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3"/>
                            {formatTimeAgo(alert.timestamp)}
                            {alert.acknowledged && (<Badge className="bg-green-100 text-green-700 text-xs ml-2">
                                Acknowledged
                              </Badge>)}
                          </div>
                        </div>
                      </div>
                      
                      {!alert.acknowledged && (<Button variant="ghost" size="sm" onClick={() => acknowledgeAlert(alert.id)} className="flex-shrink-0">
                          <X className="h-4 w-4"/>
                        </Button>)}
                    </div>
                    
                    {alert.metadata && Object.keys(alert.metadata).length > 0 && (<div className="mt-3 pt-3 border-t border-current/20">
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium mb-1">
                            Additional Details
                          </summary>
                          <div className="pl-4 space-y-1">
                            {Object.entries(alert.metadata).map(([key, value]) => (<div key={key} className="flex justify-between">
                                <span className="font-medium">{key}:</span>
                                <span>{typeof value === 'object' ? JSON.stringify(value) : String(value)}</span>
                              </div>))}
                          </div>
                        </details>
                      </div>)}
                  </motion.div>);
            })}
            </AnimatePresence>
          </div>)}
      </CardContent>
    </Card>);
}
