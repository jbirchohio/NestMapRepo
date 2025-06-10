import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, AlertTriangle, XCircle, Clock } from "lucide-react";

interface SystemStatusProps {
  service: 'api' | 'database' | 'stripe' | 'monitoring' | 'payments' | 'registration';
  showIcon?: boolean;
  className?: string;
}

interface HealthData {
  status: 'healthy' | 'degraded' | 'unhealthy';
  performance: {
    avgResponseTime: number;
    errorRate: number;
  };
  endpoints: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
}

interface WhiteLabelConfig {
  config: {
    enablePublicSignup: boolean;
    enableSocialLogin: boolean;
    enableGuestMode: boolean;
    enableMobileApp: boolean;
  };
}

export function SystemStatusIndicator({ service, showIcon = false, className = "" }: SystemStatusProps) {
  const { data: healthData } = useQuery<HealthData>({
    queryKey: ['/api/health'],
    refetchInterval: 30000,
  });

  const { data: whiteLabelConfig } = useQuery<WhiteLabelConfig>({
    queryKey: ['/api/white-label/config'],
    refetchInterval: 60000,
  });

  const getServiceStatus = () => {
    switch (service) {
      case 'api':
        return {
          status: healthData?.status || 'unknown',
          text: healthData?.status === 'healthy' ? 'Healthy' : 
                healthData?.status === 'degraded' ? 'Degraded' : 
                healthData?.status === 'unhealthy' ? 'Unhealthy' : 'Unknown'
        };
      
      case 'database':
        const dbConnected = (healthData?.endpoints?.total || 0) > 0;
        return {
          status: dbConnected ? 'healthy' : 'unhealthy',
          text: dbConnected ? 'Connected' : 'Disconnected'
        };
      
      case 'stripe':
        // Check if Stripe environment variables are available
        const stripeConfigured = process.env.VITE_STRIPE_PUBLIC_KEY !== undefined;
        return {
          status: stripeConfigured ? 'healthy' : 'degraded',
          text: stripeConfigured ? 'Configured' : 'Not Configured'
        };
      
      case 'monitoring':
        return {
          status: healthData ? 'healthy' : 'unhealthy',
          text: healthData ? 'Active' : 'Disconnected'
        };
      
      case 'payments':
        const environment = process.env.NODE_ENV;
        return {
          status: 'healthy',
          text: environment === 'production' ? 'Live' : 'Test Mode'
        };
      
      case 'registration':
        const registrationEnabled = whiteLabelConfig?.config?.enablePublicSignup;
        return {
          status: registrationEnabled ? 'healthy' : 'degraded',
          text: registrationEnabled ? 'Enabled' : 'Disabled'
        };
      
      default:
        return {
          status: 'unknown',
          text: 'Unknown'
        };
    }
  };

  const { status, text } = getServiceStatus();

  const getBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary';
      case 'unhealthy': return 'destructive';
      default: return 'outline';
    }
  };

  const getBadgeColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-600 hover:bg-green-700';
      case 'degraded': return 'bg-yellow-600 hover:bg-yellow-700';
      case 'unhealthy': return 'bg-red-600 hover:bg-red-700';
      default: return '';
    }
  };

  const getIcon = (status: string) => {
    switch (status) {
      case 'healthy': return CheckCircle;
      case 'degraded': return AlertTriangle;
      case 'unhealthy': return XCircle;
      default: return Clock;
    }
  };

  const Icon = getIcon(status);

  return (
    <Badge 
      variant={getBadgeVariant(status)}
      className={`${getBadgeColor(status)} ${className}`}
    >
      {showIcon && <Icon className="w-3 h-3 mr-1" />}
      {text}
    </Badge>
  );
}

// Pre-configured components for common use cases
export const ApiHealthBadge = (props: Omit<SystemStatusProps, 'service'>) => 
  <SystemStatusIndicator service="api" {...props} />;

export const DatabaseStatusBadge = (props: Omit<SystemStatusProps, 'service'>) => 
  <SystemStatusIndicator service="database" {...props} />;

export const StripeStatusBadge = (props: Omit<SystemStatusProps, 'service'>) => 
  <SystemStatusIndicator service="stripe" {...props} />;

export const MonitoringStatusBadge = (props: Omit<SystemStatusProps, 'service'>) => 
  <SystemStatusIndicator service="monitoring" {...props} />;

export const PaymentModeBadge = (props: Omit<SystemStatusProps, 'service'>) => 
  <SystemStatusIndicator service="payments" {...props} />;

export const RegistrationStatusBadge = (props: Omit<SystemStatusProps, 'service'>) => 
  <SystemStatusIndicator service="registration" {...props} />;
