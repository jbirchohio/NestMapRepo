import SharedBillingDataType from '@/types/SharedBillingDataType';
import SharedBackgroundJobsType from '@/types/SharedBackgroundJobsType';
import SharedActiveSessionsType from '@/types/SharedActiveSessionsType';
import SharedAuditLogsType from '@/types/SharedAuditLogsType';
import SharedUsersType from '@/types/SharedUsersType';
import SharedOrganizationsType from '@/types/SharedOrganizationsType';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Users, Building2, Activity, DollarSign, TrendingUp } from 'lucide-react';
interface DashboardData {
    organizations: SharedOrganizationsType[];
    users: SharedUsersType[];
    auditLogs: SharedAuditLogsType[];
    activeSessions: SharedActiveSessionsType[];
    backgroundJobs: SharedBackgroundJobsType[];
    billingData: SharedBillingDataType[];
}
interface DashboardMetricsProps {
    data: DashboardData;
}
export function DashboardMetrics({ data }: DashboardMetricsProps) {
    const totalOrganizations = data.organizations?.length || 0;
    const totalUsers = data.users?.length || 0;
    const activeUsers = data.activeSessions?.length || 0;
    const totalRevenue = data.billingData?.reduce((sum, billing) => sum + (billing.amount_cents || 0), 0) / 100 || 0;
    const recentAuditLogs = data.auditLogs?.slice(0, 5) || [];
    const runningJobs = data.backgroundJobs?.filter(job => job.status === 'running')?.length || 0;
    const metrics = [
        {
            title: "Total Organizations",
            value: totalOrganizations.toLocaleString(),
            description: "Active organizations",
            icon: Building2,
            color: "text-blue-600"
        },
        {
            title: "Total Users",
            value: totalUsers.toLocaleString(),
            description: `${activeUsers} currently active`,
            icon: Users,
            color: "text-green-600"
        },
        {
            title: "System Activity",
            value: recentAuditLogs.length.toString(),
            description: "Recent audit events",
            icon: Activity,
            color: "text-yellow-600"
        },
        {
            title: "Revenue",
            value: `$${totalRevenue.toLocaleString()}`,
            description: "Total billing volume",
            icon: DollarSign,
            color: "text-electric-600"
        }
    ];
    return (<div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (<Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <Icon className={`h-4 w-4 ${metric.color}`}/>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <p className="text-xs text-muted-foreground">{metric.description}</p>
            </CardContent>
          </Card>);
        })}
    </div>);
}
