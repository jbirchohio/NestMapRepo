import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Building2, Ban, UserCog, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface Organization {
  id: number;
  name: string;
  domain?: string;
  plan?: string;
  subscription_status?: string;
  employee_count?: number;
  created_at: string;
  user_count?: string;
  trip_count?: string;
  last_activity?: string;
}

interface OrganizationsListProps {
  organizations: Organization[];
  onOrganizationSelect: (orgId: number) => void;
}

export function OrganizationsList({ organizations, onOrganizationSelect }: OrganizationsListProps) {
  const [disableOrgDialog, setDisableOrgDialog] = useState<{ open: boolean; orgId: number | null }>({
    open: false,
    orgId: null
  });
  const [deleteOrgDialog, setDeleteOrgDialog] = useState<{ open: boolean; orgId: number | null }>({
    open: false,
    orgId: null
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const disableOrgMutation = useMutation({
    mutationFn: async (orgId: number) => {
      const response = await apiRequest('PUT', `/api/superadmin/organizations/${orgId}/disable`);
      if (!response.ok) {
        throw new Error('Failed to disable organization');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization Disabled",
        description: "The organization has been successfully disabled.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/dashboard'] });
      setDisableOrgDialog({ open: false, orgId: null });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to disable organization",
        variant: "destructive",
      });
    }
  });

  const deleteOrgMutation = useMutation({
    mutationFn: async (orgId: number) => {
      const response = await apiRequest('DELETE', `/api/superadmin/organizations/${orgId}`);
      if (!response.ok) {
        throw new Error('Failed to delete organization');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Organization Deleted",
        description: "The organization has been permanently deleted.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/superadmin/dashboard'] });
      setDeleteOrgDialog({ open: false, orgId: null });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete organization",
        variant: "destructive",
      });
    }
  });

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-green-100 text-green-800">Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="destructive">Suspended</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getPlanBadge = (plan?: string) => {
    switch (plan) {
      case 'enterprise':
        return <Badge variant="default" className="bg-purple-100 text-purple-800">Enterprise</Badge>;
      case 'team':
        return <Badge variant="default" className="bg-blue-100 text-blue-800">Team</Badge>;
      case 'basic':
        return <Badge variant="secondary">Basic</Badge>;
      default:
        return <Badge variant="outline">Free</Badge>;
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations ({organizations.length})
          </CardTitle>
          <CardDescription>
            Manage all organizations in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Organization</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead>Trips</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {organizations.map((org) => (
                  <TableRow key={org.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{org.name}</div>
                        {org.domain && (
                          <div className="text-sm text-muted-foreground">{org.domain}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{getPlanBadge(org.plan)}</TableCell>
                    <TableCell>{org.user_count || '0'}</TableCell>
                    <TableCell>{org.trip_count || '0'}</TableCell>
                    <TableCell>{getStatusBadge(org.subscription_status)}</TableCell>
                    <TableCell>
                      {formatDistanceToNow(new Date(org.created_at), { addSuffix: true })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onOrganizationSelect(org.id)}
                        >
                          <UserCog className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setDisableOrgDialog({ open: true, orgId: org.id })}
                        >
                          <Ban className="h-4 w-4 mr-1" />
                          Disable
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => setDeleteOrgDialog({ open: true, orgId: org.id })}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Disable Organization Dialog */}
      <Dialog open={disableOrgDialog.open} onOpenChange={(open) => 
        setDisableOrgDialog({ open, orgId: open ? disableOrgDialog.orgId : null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Disable Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to disable this organization? Users will no longer be able to access their accounts.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDisableOrgDialog({ open: false, orgId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => disableOrgDialog.orgId && disableOrgMutation.mutate(disableOrgDialog.orgId)}
              disabled={disableOrgMutation.isPending}
            >
              {disableOrgMutation.isPending ? 'Disabling...' : 'Disable Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Organization Dialog */}
      <Dialog open={deleteOrgDialog.open} onOpenChange={(open) => 
        setDeleteOrgDialog({ open, orgId: open ? deleteOrgDialog.orgId : null })
      }>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Organization</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete this organization? This action cannot be undone and will remove all associated data.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteOrgDialog({ open: false, orgId: null })}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => deleteOrgDialog.orgId && deleteOrgMutation.mutate(deleteOrgDialog.orgId)}
              disabled={deleteOrgMutation.isPending}
            >
              {deleteOrgMutation.isPending ? 'Deleting...' : 'Delete Organization'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}