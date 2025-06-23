import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Building, Users, Search, MoreHorizontal, Eye, Settings, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
interface Organization {
    id: number;
    name: string;
    domain: string;
    plan: string;
    employee_count: number;
    user_count: string;
    subscription_status: string;
    white_label_enabled: boolean;
    stripe_connect_onboarded: boolean;
    funding_source_status: string;
    created_at: string;
}
interface OrganizationsListProps {
    organizations: Organization[];
    onOrganizationSelect: (org: Organization) => void;
    isLoading?: boolean;
}
export function OrganizationsList({ organizations, onOrganizationSelect, isLoading }: OrganizationsListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const filteredOrganizations = organizations.filter(org => org.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        org.domain.toLowerCase().includes(searchTerm.toLowerCase()));
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active':
                return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
            case 'inactive':
                return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
            case 'pending':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
        }
    };
    const getPlanColor = (plan: string) => {
        switch (plan) {
            case 'enterprise':
                return 'bg-electric-100 text-electric-800 dark:bg-electric-900/20 dark:text-electric-300';
            case 'team':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300';
            case 'basic':
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
        }
    };
    if (isLoading) {
        return (<Card>
        <CardHeader>
          <CardTitle>Organizations</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, index) => (<div key={index} className="animate-pulse">
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
              </div>))}
          </div>
        </CardContent>
      </Card>);
    }
    return (<Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5"/>
          Organizations ({organizations.length})
        </CardTitle>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4"/>
          <Input placeholder="Search organizations..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-10"/>
        </div>
      </CardHeader>
      <CardContent>
        {filteredOrganizations.length === 0 ? (<div className="text-center py-8">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-4"/>
            <p className="text-gray-600 dark:text-gray-400">
              {searchTerm ? 'No organizations found matching your search.' : 'No organizations found.'}
            </p>
          </div>) : (<div className="space-y-4">
            {filteredOrganizations.map((org) => (<div key={org.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                        {org.name}
                      </h3>
                      <Badge className={getPlanColor(org.plan)}>
                        {org.plan}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {org.domain}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3"/>
                        {org.user_count} users
                      </span>
                      <span>
                        Created: {new Date(org.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(org.subscription_status)}>
                      {org.subscription_status}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4"/>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onOrganizationSelect(org)}>
                          <Eye className="h-4 w-4 mr-2"/>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Settings className="h-4 w-4 mr-2"/>
                          Manage Settings
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <CreditCard className="h-4 w-4 mr-2"/>
                          Billing Info
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">White Label:</span>
                    <Badge variant={org.white_label_enabled ? "default" : "secondary"} className="text-xs">
                      {org.white_label_enabled ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Stripe:</span>
                    <Badge variant={org.stripe_connect_onboarded ? "default" : "secondary"} className="text-xs">
                      {org.stripe_connect_onboarded ? 'Connected' : 'Not Connected'}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Funding:</span>
                    <Badge className={getStatusColor(org.funding_source_status)} className="text-xs">
                      {org.funding_source_status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-gray-500">Employees:</span>
                    <span className="font-medium">{org.employee_count}</span>
                  </div>
                </div>
              </div>))}
          </div>)}
      </CardContent>
    </Card>);
}
