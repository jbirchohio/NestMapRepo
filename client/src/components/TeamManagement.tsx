import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, UserPlus, Mail, Shield, Eye, Edit3, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Permission schema with smart defaults
const inviteSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email address" }),
  role: z.string().min(1, { message: "Please select a role" }),
  permissions: z.object({
    canViewAllTrips: z.boolean(),
    canEditAllTrips: z.boolean(),
    canCreateTrips: z.boolean(),
    canInviteMembers: z.boolean(),
    canManageBudgets: z.boolean(),
    canExportData: z.boolean(),
    canAccessAnalytics: z.boolean(),
  })
});

type InviteFormValues = z.infer<typeof inviteSchema>;

// Smart permission defaults based on role
const getDefaultPermissions = (role: string) => {
  switch (role) {
    case 'admin':
      return {
        canViewAllTrips: true,
        canEditAllTrips: true,
        canCreateTrips: true,
        canInviteMembers: true,
        canManageBudgets: true,
        canExportData: true,
        canAccessAnalytics: true,
      };
    case 'manager':
      return {
        canViewAllTrips: true,
        canEditAllTrips: true,
        canCreateTrips: true,
        canInviteMembers: true,
        canManageBudgets: true,
        canExportData: true,
        canAccessAnalytics: false,
      };
    case 'user':
      return {
        canViewAllTrips: false,
        canEditAllTrips: false,
        canCreateTrips: true,
        canInviteMembers: false,
        canManageBudgets: false,
        canExportData: false,
        canAccessAnalytics: false,
      };
    default:
      return {
        canViewAllTrips: false,
        canEditAllTrips: false,
        canCreateTrips: false,
        canInviteMembers: false,
        canManageBudgets: false,
        canExportData: false,
        canAccessAnalytics: false,
      };
  }
};

// Mock team members data (replace with real API call)
const mockTeamMembers = [
  {
    id: 1,
    name: "Sarah Johnson",
    email: "sarah@company.com",
    role: "admin",
    status: "active",
    joinedAt: "2024-01-15",
    lastActive: "2 hours ago"
  },
  {
    id: 2,
    name: "Mike Chen",
    email: "mike@company.com", 
    role: "manager",
    status: "active",
    joinedAt: "2024-02-03",
    lastActive: "1 day ago"
  },
  {
    id: 3,
    name: "Emily Davis",
    email: "emily@company.com",
    role: "user",
    status: "pending",
    joinedAt: "2024-03-10",
    lastActive: "Never"
  }
];

export default function TeamManagement() {
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const { toast } = useToast();

  const form = useForm<InviteFormValues>({
    resolver: zodResolver(inviteSchema),
    defaultValues: {
      email: "",
      role: "",
      permissions: getDefaultPermissions("user")
    }
  });

  const selectedRole = form.watch("role");
  const currentPermissions = form.watch("permissions");

  // Update permissions when role changes
  React.useEffect(() => {
    if (selectedRole) {
      const defaultPerms = getDefaultPermissions(selectedRole);
      form.setValue("permissions", defaultPerms);
    }
  }, [selectedRole, form]);

  const onInviteSubmit = async (values: InviteFormValues) => {
    try {
      setIsInviting(true);
      
      // TODO: Replace with actual API call
      console.log("Sending invitation:", values);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: "Invitation Sent!",
        description: `Team invitation sent to ${values.email}`,
      });
      
      setShowInviteForm(false);
      form.reset();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to send invitation. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsInviting(false);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'inactive': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Users className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Team Management</h1>
            <p className="text-muted-foreground">Manage your organization's team members and permissions</p>
          </div>
        </div>
        <Button 
          onClick={() => setShowInviteForm(!showInviteForm)}
          className="flex items-center gap-2"
        >
          <UserPlus className="h-4 w-4" />
          Invite Team Member
        </Button>
      </div>

      {/* Invite Form */}
      {showInviteForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Invite New Team Member
            </CardTitle>
            <CardDescription>
              Send an invitation to join your organization with customized permissions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onInviteSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="colleague@company.com"
                    {...form.register("email")}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Role</Label>
                  <Select onValueChange={(value) => form.setValue("role", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full access to everything</SelectItem>
                      <SelectItem value="manager">Manager - Team oversight and trip management</SelectItem>
                      <SelectItem value="user">User - Basic trip planning access</SelectItem>
                    </SelectContent>
                  </Select>
                  {form.formState.errors.role && (
                    <p className="text-sm text-destructive">{form.formState.errors.role.message}</p>
                  )}
                </div>
              </div>

              {selectedRole && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Permissions ({selectedRole} defaults applied)
                    </h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>View All Trips</Label>
                          <p className="text-xs text-muted-foreground">Access to view organization's trips</p>
                        </div>
                        <Switch
                          checked={currentPermissions.canViewAllTrips}
                          onCheckedChange={(checked) => 
                            form.setValue("permissions.canViewAllTrips", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Edit All Trips</Label>
                          <p className="text-xs text-muted-foreground">Modify any trip in organization</p>
                        </div>
                        <Switch
                          checked={currentPermissions.canEditAllTrips}
                          onCheckedChange={(checked) => 
                            form.setValue("permissions.canEditAllTrips", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Create Trips</Label>
                          <p className="text-xs text-muted-foreground">Plan new business trips</p>
                        </div>
                        <Switch
                          checked={currentPermissions.canCreateTrips}
                          onCheckedChange={(checked) => 
                            form.setValue("permissions.canCreateTrips", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Invite Members</Label>
                          <p className="text-xs text-muted-foreground">Send team invitations</p>
                        </div>
                        <Switch
                          checked={currentPermissions.canInviteMembers}
                          onCheckedChange={(checked) => 
                            form.setValue("permissions.canInviteMembers", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Manage Budgets</Label>
                          <p className="text-xs text-muted-foreground">Set and track trip budgets</p>
                        </div>
                        <Switch
                          checked={currentPermissions.canManageBudgets}
                          onCheckedChange={(checked) => 
                            form.setValue("permissions.canManageBudgets", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Export Data</Label>
                          <p className="text-xs text-muted-foreground">Download reports and trip data</p>
                        </div>
                        <Switch
                          checked={currentPermissions.canExportData}
                          onCheckedChange={(checked) => 
                            form.setValue("permissions.canExportData", checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                          <Label>Access Analytics</Label>
                          <p className="text-xs text-muted-foreground">View organization insights</p>
                        </div>
                        <Switch
                          checked={currentPermissions.canAccessAnalytics}
                          onCheckedChange={(checked) => 
                            form.setValue("permissions.canAccessAnalytics", checked)
                          }
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}

              <div className="flex justify-end gap-3">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowInviteForm(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isInviting}>
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Team Members List */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            Current members of your organization
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {mockTeamMembers.map((member) => (
              <div key={member.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-medium">
                      {member.name.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-medium">{member.name}</h4>
                    <p className="text-sm text-muted-foreground">{member.email}</p>
                    <p className="text-xs text-muted-foreground">
                      Joined {member.joinedAt} • Last active {member.lastActive}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Badge className={getRoleBadgeColor(member.role)}>
                    {member.role}
                  </Badge>
                  <Badge className={getStatusBadgeColor(member.status)}>
                    {member.status}
                  </Badge>
                  <div className="flex gap-1">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Member Details",
                          description: `Viewing details for ${member.name} (${member.role})`,
                        });
                      }}
                      title="View member details"
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        toast({
                          title: "Edit Permissions",
                          description: `Editing permissions for ${member.name}`,
                        });
                      }}
                      title="Edit member permissions"
                    >
                      <Edit3 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="text-destructive"
                      onClick={() => {
                        toast({
                          title: "Remove Member",
                          description: `This would remove ${member.name} from the organization`,
                          variant: "destructive",
                        });
                      }}
                      title="Remove member"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}