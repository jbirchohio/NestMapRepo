import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Users, UserPlus, Mail, Shield, Eye, Edit3, Trash2, User, X, Check, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';

interface TeamMemberPermissions {
  canViewAllTrips: boolean;
  canEditAllTrips: boolean;
  canCreateTrips: boolean;
  canInviteMembers: boolean;
  canManageBudgets: boolean;
  canExportData: boolean;
  canAccessAnalytics: boolean;
}

interface TeamMember {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
  joinedAt?: string;
  lastActive?: string;
  avatar?: string;
  permissions: TeamMemberPermissions;
}

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

export default function TeamManagement() {
  const [isInviting, setIsInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [showMemberDetails, setShowMemberDetails] = useState(false);
  const [showEditPermissions, setShowEditPermissions] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch real team members from API
  const { data: teamMembers, isLoading: isLoadingMembers } = useQuery({
    queryKey: ['/api/organizations/members'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/organizations/members");
      if (!response.ok) {
        throw new Error("Failed to fetch team members");
      }
      return response.json();
    }
  });

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

  const handleViewMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowMemberDetails(true);
  };

  const handleEditMember = (member: TeamMember) => {
    setSelectedMember(member);
    setShowEditPermissions(true);
  };

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId: number) => {
      const response = await apiRequest("DELETE", `/api/organizations/members/${memberId}`);
      if (!response.ok) {
        throw new Error("Failed to remove member");
      }
      return response.json();
    },
    onSuccess: (data, memberId) => {
      const member = teamMembers?.find((m: TeamMember) => m.id === memberId);
      queryClient.invalidateQueries({ queryKey: ['/api/organizations/members'] });
      toast({
        title: "Member Removed",
        description: `${member?.name || 'Member'} has been removed from the organization`,
        variant: "destructive",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to remove member. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleRemoveMember = (member: TeamMember) => {
    if (confirm(`Are you sure you want to remove ${member.name} from the organization? This action cannot be undone.`)) {
      removeMemberMutation.mutate(member.id);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-destructive/10 text-destructive border border-destructive/20';
      case 'manager': return 'bg-primary/10 text-primary border border-primary/20';
      case 'user': return 'bg-green-500/10 text-green-700 border border-green-500/20';
      default: return 'bg-muted text-muted-foreground border';
    }
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500/10 text-green-700 border border-green-500/20';
      case 'pending': return 'bg-yellow-500/10 text-yellow-700 border border-yellow-500/20';
      case 'inactive': return 'bg-muted text-muted-foreground border';
      default: return 'bg-muted text-muted-foreground border';
    }
  };

  return (
    <div className="min-h-screen bg-soft-100 dark:bg-navy-900 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-electric-100 dark:bg-electric-900/20 rounded-2xl">
              <Users className="h-8 w-8 text-electric-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-navy-900 dark:text-white">Team Management</h1>
              <p className="text-navy-600 dark:text-navy-300">Manage your organization's team members and permissions</p>
            </div>
          </div>
          <Button 
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="flex items-center gap-2 bg-electric-500 hover:bg-electric-600 text-white"
          >
            <UserPlus className="h-4 w-4" />
            Invite Team Member
          </Button>
        </div>

        {/* Invite Form */}
        {showInviteForm && (
          <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-navy-900 dark:text-white">
                <Mail className="h-5 w-5 text-electric-500" />
                Invite New Team Member
              </CardTitle>
              <CardDescription className="text-navy-600 dark:text-navy-300">
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
                      <SelectItem value="admin">Admin - Full organization control</SelectItem>
                      <SelectItem value="manager">Manager - Team leadership with trip oversight</SelectItem>
                      <SelectItem value="editor">Editor - Content creation and trip editing</SelectItem>
                      <SelectItem value="member">Member - Basic trip creation and personal management</SelectItem>
                      <SelectItem value="viewer">Viewer - Read-only access to assigned content</SelectItem>
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
                    <h4 className="text-sm font-medium mb-4 flex items-center gap-2 text-navy-900 dark:text-white">
                      <Shield className="h-4 w-4 text-electric-500" />
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
                  className="border-electric-300/30 text-navy-600 dark:text-navy-300 hover:bg-electric-50 dark:hover:bg-electric-900/20"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isInviting} className="bg-electric-500 hover:bg-electric-600 text-white">
                  {isInviting ? "Sending..." : "Send Invitation"}
                </Button>
              </div>
            </form>
          </CardContent>
          </Card>
        )}

        {/* Member Details Modal */}
        {showMemberDetails && selectedMember && (
          <Card className="mb-6 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2 text-navy-900 dark:text-white">
                  <User className="h-5 w-5 text-electric-500" />
                  Member Details: {selectedMember.name}
                </CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setShowMemberDetails(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Contact Information</Label>
                  <div className="mt-2 space-y-2">
                    <p className="text-sm"><span className="font-medium">Email:</span> {selectedMember.email}</p>
                    <p className="text-sm"><span className="font-medium">Role:</span> 
                      <Badge className={`ml-2 ${getRoleBadgeColor(selectedMember.role)}`}>
                        {selectedMember.role}
                      </Badge>
                    </p>
                    <p className="text-sm"><span className="font-medium">Status:</span> 
                      <Badge className={`ml-2 ${getStatusBadgeColor(selectedMember.status)}`}>
                        {selectedMember.status}
                      </Badge>
                    </p>
                  </div>
                </div>
                <div>
                  <Label className="text-sm font-medium">Activity</Label>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-muted-foreground">Joined: {selectedMember.joinedAt}</p>
                    <p className="text-sm text-muted-foreground">Last Active: {selectedMember.lastActive}</p>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Permissions</Label>
                  <div className="mt-2 grid grid-cols-1 gap-2">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">Create and manage trips</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-500" />
                      <span className="text-sm">View team analytics</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <X className="h-4 w-4 text-red-500" />
                      <span className="text-sm">Manage billing</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Edit Permissions Modal */}
      {showEditPermissions && selectedMember && (
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Edit Permissions: {selectedMember.name}
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowEditPermissions(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Role</Label>
                  <Select defaultValue={selectedMember.role}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin - Full organization control</SelectItem>
                      <SelectItem value="manager">Manager - Team leadership with trip oversight</SelectItem>
                      <SelectItem value="editor">Editor - Content creation and trip editing</SelectItem>
                      <SelectItem value="member">Member - Basic trip creation and personal management</SelectItem>
                      <SelectItem value="viewer">Viewer - Read-only access to assigned content</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select defaultValue={selectedMember.status}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="pending">Pending</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div>
                <Label className="text-sm font-medium mb-4 block">Individual Permissions</Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { key: 'viewTrips', label: 'View All Trips', desc: 'Access to view organization trips' },
                    { key: 'editTrips', label: 'Edit All Trips', desc: 'Modify any trip in organization' },
                    { key: 'createTrips', label: 'Create Trips', desc: 'Plan new business trips' },
                    { key: 'inviteMembers', label: 'Invite Members', desc: 'Send team invitations' },
                    { key: 'manageBudgets', label: 'Manage Budgets', desc: 'Set and track trip budgets' },
                    { key: 'accessAnalytics', label: 'Access Analytics', desc: 'View organization insights' }
                  ].map((permission) => (
                    <div key={permission.key} className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label className="text-sm">{permission.label}</Label>
                        <p className="text-xs text-muted-foreground">{permission.desc}</p>
                      </div>
                      <Switch 
                        defaultChecked={selectedMember.role === 'admin'} 
                        className="data-[state=checked]:bg-blue-600 data-[state=unchecked]:bg-gray-200 dark:data-[state=unchecked]:bg-gray-700 border border-gray-300 data-[state=checked]:border-blue-600"
                        style={{
                          backgroundColor: selectedMember.role === 'admin' ? '#2563eb' : '#e5e7eb'
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex justify-end gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => setShowEditPermissions(false)}
                  className="border-electric-300/30 text-navy-600 dark:text-navy-300 hover:bg-electric-50 dark:hover:bg-electric-900/20"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={() => {
                    toast({
                      title: "Permissions Updated",
                      description: `${selectedMember.name}'s permissions have been updated successfully`,
                    });
                    setShowEditPermissions(false);
                  }}
                  className="bg-electric-500 hover:bg-electric-600 text-white"
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
        )}

        {/* Team Members List */}
        <Card className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm border border-electric-300/20">
          <CardHeader>
            <CardTitle className="text-navy-900 dark:text-white">Team Members</CardTitle>
            <CardDescription className="text-navy-600 dark:text-navy-300">
              Current members of your organization
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
            {isLoadingMembers ? (
              <div className="text-center py-8">
                <p className="text-navy-500 dark:text-navy-400">Loading team members...</p>
              </div>
            ) : teamMembers && teamMembers.length > 0 ? (
              teamMembers.map((member: TeamMember) => (
                <div key={member.id} className="flex items-center justify-between p-4 border border-electric-300/20 rounded-lg bg-white/50 dark:bg-navy-900/50 backdrop-blur-sm">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-electric-100 dark:bg-electric-900/20 flex items-center justify-center">
                      <span className="text-sm font-medium text-electric-700 dark:text-electric-300">
                        {member.name.split(' ').map((n: string) => n[0]).join('')}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-navy-900 dark:text-white">{member.name}</h4>
                      <p className="text-sm text-navy-600 dark:text-navy-300">{member.email}</p>
                      <p className="text-xs text-navy-500 dark:text-navy-400">
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
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewMember(member)}
                        title="View member details"
                        className="border-electric-300/30 text-navy-600 dark:text-navy-300 hover:bg-electric-50 dark:hover:bg-electric-900/20"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleEditMember(member)}
                        title="Edit member permissions"
                        className="border-electric-300/30 text-navy-600 dark:text-navy-300 hover:bg-electric-50 dark:hover:bg-electric-900/20"
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-red-300/30 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        onClick={() => handleRemoveMember(member)}
                        title="Remove member"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-navy-500 dark:text-navy-400">No team members found. Invite your first member to get started.</p>
              </div>
            )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
