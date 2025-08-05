// This is a reference file showing the organization-specific feature flag UI component

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Settings, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrganizationFeatureFlagsProps {
  organizationId: number;
  organizationName: string;
}

export function OrganizationFeatureFlags({ organizationId, organizationName }: OrganizationFeatureFlagsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch global feature flags
  const { data: globalFlags = [] } = useQuery({
    queryKey: ['/api/superadmin/flags'],
    queryFn: () => apiRequest('GET', '/api/superadmin/flags'),
  });

  // Fetch organization-specific overrides
  const { data: orgOverrides = [] } = useQuery({
    queryKey: [`/api/superadmin/organizations/${organizationId}/feature-flags`],
    queryFn: () => apiRequest('GET', `/api/superadmin/organizations/${organizationId}/feature-flags`),
    enabled: isOpen,
  });

  // Set organization feature flag override
  const setOrgFlag = useMutation({
    mutationFn: ({ flagId, enabled }: { flagId: number; enabled: boolean }) =>
      apiRequest('PUT', `/api/superadmin/organizations/${organizationId}/feature-flags/${flagId}`, {
        enabled
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/superadmin/organizations/${organizationId}/feature-flags`] });
      toast({ title: 'Feature flag updated for organization' });
    },
  });

  // Remove organization override (revert to global)
  const removeOrgOverride = useMutation({
    mutationFn: (flagId: number) =>
      apiRequest('DELETE', `/api/superadmin/organizations/${organizationId}/feature-flags/${flagId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [`/api/superadmin/organizations/${organizationId}/feature-flags`] });
      toast({ title: 'Organization override removed' });
    },
  });

  // Combine global flags with org overrides
  const combinedFlags = globalFlags.map((flag: any) => {
    const override = orgOverrides.find((o: any) => o.feature_flag_id === flag.id);
    return {
      ...flag,
      globalEnabled: flag.default_value,
      orgEnabled: override ? override.enabled : flag.default_value,
      hasOverride: !!override,
      overrideId: override?.id
    };
  });

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Settings className="w-4 h-4 mr-2" />
          Feature Flags
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Feature Flags for {organizationName}</DialogTitle>
          <DialogDescription>
            Override global feature flags for this organization. Unset overrides will use global defaults.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Feature</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-center">Global</TableHead>
                <TableHead className="text-center">Organization</TableHead>
                <TableHead className="text-center">Override</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {combinedFlags.map((flag: any) => (
                <TableRow key={flag.id}>
                  <TableCell className="font-medium">{flag.flag_name}</TableCell>
                  <TableCell className="text-sm text-gray-600">{flag.description}</TableCell>
                  <TableCell className="text-center">
                    <Badge variant={flag.globalEnabled ? 'default' : 'secondary'}>
                      {flag.globalEnabled ? 'On' : 'Off'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <Switch
                      checked={flag.orgEnabled}
                      onCheckedChange={(enabled) => {
                        setOrgFlag.mutate({ flagId: flag.id, enabled });
                      }}
                    />
                  </TableCell>
                  <TableCell className="text-center">
                    {flag.hasOverride ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeOrgOverride.mutate(flag.id)}
                      >
                        Remove
                      </Button>
                    ) : (
                      <span className="text-sm text-gray-400">Using global</span>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </DialogContent>
    </Dialog>
  );
}