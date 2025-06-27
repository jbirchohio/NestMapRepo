import SharedErrorType from '@/types/SharedErrorType';
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Users, UserPlus, Shield, Building } from "lucide-react";
interface TripCollaborator {
    id: number;
    trip_id: number;
    user_id: number;
    role: string;
    status: string;
    user?: {
        username: string;
        email: string;
        display_name?: string;
    };
}
interface RoleManagementProps {
    tripId: number;
    userRole?: string;
}
const TRIP_ROLES = {
    admin: { label: "Admin", color: "destructive", description: "Full access including deletion" },
    editor: { label: "Editor", color: "default", description: "Can edit trip and activities" },
    viewer: { label: "Viewer", color: "secondary", description: "Read-only access" },
    commenter: { label: "Commenter", color: "outline", description: "Can view and add notes" }
};
export function RoleManagement({ tripId, userRole }: RoleManagementProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("viewer");
    const { toast } = useToast();
    const queryClient = useQueryClient();
    const { data: collaborators = [] as TripCollaborator[], isLoading } = useQuery<TripCollaborator[]>({
        queryKey: [`/api/trips/${tripId}/collaborators`],
        enabled: !!tripId
    });
    const inviteMutation = useMutation({
        mutationFn: async (data: { email: string; role: string }) => {
            return apiRequest(`/api/trips/${tripId}/collaborators`, JSON.stringify({
                method: "POST",
                body: JSON.stringify(data),
            }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/collaborators`] });
            setInviteEmail("");
            setInviteRole("viewer");
            toast({
                title: "Invitation sent",
                description: "The user has been invited to collaborate on this trip.",
            });
        },
        onError: (error: SharedErrorType) => {
            toast({
                title: "Failed to send invitation",
                description: error.message || "Please try again.",
                variant: "destructive",
            });
        },
    });
    const updateRoleMutation = useMutation({
        mutationFn: async (data: { collaboratorId: number; role: string }) => {
            return apiRequest(`/api/trips/${tripId}/collaborators/${data.collaboratorId}`, JSON.stringify({
                method: "PUT",
                body: JSON.stringify({ role: data.role }),
            }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/collaborators`] });
            toast({
                title: "Role updated",
                description: "The collaborator's role has been updated.",
            });
        },
    });
    const removeCollaboratorMutation = useMutation({
        mutationFn: async (collaboratorId: number) => {
            return apiRequest(`/api/trips/${tripId}/collaborators/${collaboratorId}`, JSON.stringify({
                method: "DELETE",
            }));
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: [`/api/trips/${tripId}/collaborators`] });
            toast({
                title: "Collaborator removed",
                description: "The collaborator has been removed from this trip.",
            });
        },
    });
    const canManageRoles = userRole === "admin";
    const handleInvite = () => {
        if (!inviteEmail.trim()) {
            toast({
                title: "Email required",
                description: "Please enter an email address.",
                variant: "destructive",
            });
            return;
        }
        inviteMutation.mutate({ email: inviteEmail, role: inviteRole });
    };
    if (!canManageRoles) {
        return null;
    }
    return (<Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Users className="h-4 w-4 mr-2"/>
          Manage Access
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5"/>
            Trip Access Management
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Invite New Collaborator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <UserPlus className="h-5 w-5"/>
                Invite Collaborator
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email Address</Label>
                  <Input id="email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)}/>
                </div>
                <div>
                  <Label htmlFor="role">Access Level</Label>
                  <Select value={inviteRole} onValueChange={setInviteRole}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(TRIP_ROLES).map(([role, config]) => (<SelectItem key={role} value={role}>
                          <div className="flex flex-col">
                            <span>{config.label}</span>
                            <span className="text-xs text-muted-foreground">
                              {config.description}
                            </span>
                          </div>
                        </SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <Button onClick={handleInvite} disabled={inviteMutation.isPending} className="w-full">
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </CardContent>
          </Card>

          {/* Current Collaborators */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Building className="h-5 w-5"/>
                Current Access ({collaborators.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (<div className="text-center py-4">Loading collaborators...</div>) : collaborators.length === 0 ? (<div className="text-center py-8 text-muted-foreground">
                  No collaborators yet. Invite team members to start collaborating!
                </div>) : (<div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead>Access Level</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {collaborators.map((collaborator: TripCollaborator) => (<TableRow key={collaborator.id}>
                          <TableCell>
                            <div>
                              <div className="font-medium">
                                {collaborator.user?.display_name || collaborator.user?.username}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {collaborator.user?.email}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Select value={collaborator.role} onValueChange={(newRole) => updateRoleMutation.mutate({
                    collaboratorId: collaborator.id,
                    role: newRole,
                })} disabled={!canManageRoles}>
                              <SelectTrigger className="w-32">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(TRIP_ROLES).map(([role, config]) => (<SelectItem key={role} value={role}>
                                    {config.label}
                                  </SelectItem>))}
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Badge variant={collaborator.status === "accepted" ? "default" : "secondary"}>
                              {collaborator.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" onClick={() => removeCollaboratorMutation.mutate(collaborator.id)} disabled={!canManageRoles || removeCollaboratorMutation.isPending}>
                              Remove
                            </Button>
                          </TableCell>
                        </TableRow>))}
                    </TableBody>
                  </Table>
                </div>)}
            </CardContent>
          </Card>

          {/* Role Explanations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Access Levels</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(TRIP_ROLES).map(([role, config]) => (<div key={role} className="flex items-center justify-between p-3 rounded border">
                  <div>
                    <div className="font-medium">{config.label}</div>
                    <div className="text-sm text-muted-foreground">
                      {config.description}
                    </div>
                  </div>
                  <Badge variant={config.color as any /** FIXANYERROR: Replace 'any' */}>{config.label}</Badge>
                </div>))}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>);
}
