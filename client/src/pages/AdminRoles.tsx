import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AnimatedCard } from "@/components/ui/animated-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/JWTAuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Users, 
  Settings, 
  ArrowLeft,
  Plus,
  Edit,
  Trash2,
  Eye,
  UserCheck
} from "lucide-react";

interface Role {
  id: number;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  created_at: string;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

export default function AdminRoles() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);

  // Fetch roles
  const { data: roles, isLoading: rolesLoading } = useQuery({
    queryKey: ['/api/admin/roles'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/roles");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch available permissions
  const { data: permissions } = useQuery({
    queryKey: ['/api/admin/permissions'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/admin/permissions");
      return response.json();
    },
    enabled: !!user,
  });

  // Fetch users for the organization
  const { data: users } = useQuery({
    queryKey: ['/api/organizations/users'],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/organizations/users");
      return response.json();
    },
    enabled: !!user,
  });

  // Create role mutation
  const createRoleMutation = useMutation({
    mutationFn: async (roleData: { name: string; description: string; permissions: string[] }) => {
      const response = await apiRequest("POST", "/api/admin/roles", roleData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      toast({
        title: "Role Created",
        description: "New role has been created successfully.",
      });
      setIsCreateDialogOpen(false);
      setNewRoleName("");
      setNewRoleDescription("");
      setSelectedPermissions([]);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create role",
        variant: "destructive",
      });
    },
  });

  // Update role mutation
  const updateRoleMutation = useMutation({
    mutationFn: async ({ roleId, permissions }: { roleId: number; permissions: string[] }) => {
      const response = await apiRequest("PUT", `/api/admin/roles/${roleId}`, { permissions });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
      toast({
        title: "Role Updated",
        description: "Role permissions have been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update role",
        variant: "destructive",
      });
    },
  });

  const handleCreateRole = () => {
    if (!newRoleName.trim()) {
      toast({
        title: "Validation Error",
        description: "Role name is required",
        variant: "destructive",
      });
      return;
    }

    createRoleMutation.mutate({
      name: newRoleName,
      description: newRoleDescription,
      permissions: selectedPermissions
    });
  };

  const handleUpdatePermissions = (roleId: number, permissions: string[]) => {
    updateRoleMutation.mutate({ roleId, permissions });
  };

  const groupedPermissions = permissions?.reduce((acc: any, permission: Permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {}) || {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-navy-50 to-soft-100 dark:from-navy-900 dark:to-navy-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-6">
            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Admin
              </Button>
            </Link>
          </div>
          
          <div className="relative">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-electric-600 to-electric-700 bg-clip-text text-transparent mb-2">
              Role Management
            </h1>
            <p className="text-navy-600 dark:text-navy-300 text-lg">
              Configure user roles and permissions for your organization
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Roles List */}
          <div className="lg:col-span-2">
            <AnimatedCard variant="glow" className="p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Shield className="h-6 w-6 text-electric-600" />
                  <h3 className="text-xl font-semibold text-navy-900 dark:text-white">System Roles</h3>
                </div>
                <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Role
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                      <DialogTitle>Create New Role</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="roleName">Role Name</Label>
                        <Input
                          id="roleName"
                          value={newRoleName}
                          onChange={(e) => setNewRoleName(e.target.value)}
                          placeholder="e.g., Travel Manager"
                        />
                      </div>
                      <div>
                        <Label htmlFor="roleDescription">Description</Label>
                        <Input
                          id="roleDescription"
                          value={newRoleDescription}
                          onChange={(e) => setNewRoleDescription(e.target.value)}
                          placeholder="Role description..."
                        />
                      </div>
                      <div>
                        <Label>Permissions</Label>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {Object.entries(groupedPermissions).map(([category, perms]: [string, any]) => (
                            <div key={category}>
                              <h4 className="font-medium text-sm text-gray-700 mb-1">{category}</h4>
                              {perms.map((permission: Permission) => (
                                <div key={permission.id} className="flex items-center space-x-2">
                                  <input
                                    type="checkbox"
                                    id={permission.id}
                                    checked={selectedPermissions.includes(permission.id)}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setSelectedPermissions([...selectedPermissions, permission.id]);
                                      } else {
                                        setSelectedPermissions(selectedPermissions.filter(p => p !== permission.id));
                                      }
                                    }}
                                  />
                                  <Label htmlFor={permission.id} className="text-sm">
                                    {permission.name}
                                  </Label>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button onClick={handleCreateRole} disabled={createRoleMutation.isPending}>
                          Create Role
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              <div className="space-y-4">
                {rolesLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 border rounded-lg animate-pulse">
                        <div className="h-4 bg-gray-200 rounded w-1/4 mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                      </div>
                    ))}
                  </div>
                ) : roles?.length > 0 ? (
                  roles.map((role: Role) => (
                    <div 
                      key={role.id} 
                      className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                        selectedRole?.id === role.id ? 'border-electric-500 bg-electric-50 dark:bg-electric-900/20' : ''
                      }`}
                      onClick={() => setSelectedRole(role)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-navy-900 dark:text-white">{role.name}</h4>
                          <p className="text-sm text-gray-600 dark:text-gray-400">{role.description}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant="secondary">
                              <Users className="h-3 w-3 mr-1" />
                              {role.userCount} users
                            </Badge>
                            <Badge variant="outline">
                              {role.permissions?.length || 0} permissions
                            </Badge>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setSelectedRole(role)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Shield className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>No roles found. Create your first role to get started.</p>
                  </div>
                )}
              </div>
            </AnimatedCard>
          </div>

          {/* Role Details */}
          <div>
            <AnimatedCard variant="glow" className="p-6">
              <h3 className="text-lg font-semibold text-navy-900 dark:text-white mb-4">
                Role Details
              </h3>
              {selectedRole ? (
                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium">Role Name</Label>
                    <p className="text-navy-900 dark:text-white">{selectedRole.name}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Description</Label>
                    <p className="text-gray-600 dark:text-gray-400">{selectedRole.description}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Users Assigned ({selectedRole.userCount})</Label>
                    <div className="space-y-2 max-h-32 overflow-y-auto">
                      {users?.filter((user: any) => user.role === selectedRole.value || user.role?.toLowerCase() === selectedRole.name.toLowerCase()).map((user: any) => (
                        <div key={user.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-800 rounded">
                          <div className="w-8 h-8 bg-electric-500 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                            {(user.displayName || user.display_name)?.charAt(0) || user.username?.charAt(0) || user.email?.charAt(0)}
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-navy-900 dark:text-white">
                              {user.displayName || user.display_name || user.username}
                            </p>
                            <p className="text-xs text-gray-500">{user.email}</p>
                          </div>
                        </div>
                      )) || <p className="text-gray-500 text-sm">No users assigned to this role</p>}
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Permissions</Label>
                    <div className="space-y-1 max-h-64 overflow-y-auto">
                      {selectedRole.permissions?.map((permission) => (
                        <Badge key={permission} variant="secondary" className="mr-1 mb-1">
                          {permission}
                        </Badge>
                      )) || <p className="text-gray-500">No permissions assigned</p>}
                    </div>
                  </div>
                  <Button 
                    className="w-full"
                    onClick={() => {
                      // Open edit permissions dialog
                      toast({
                        title: "Edit Permissions",
                        description: "Permission editing interface will open here",
                      });
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Edit Permissions
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserCheck className="h-12 w-12 mx-auto mb-3 opacity-50" />
                  <p>Select a role to view details</p>
                </div>
              )}
            </AnimatedCard>
          </div>
        </div>
      </div>
    </div>
  );
}