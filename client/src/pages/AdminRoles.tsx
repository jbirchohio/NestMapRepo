import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { 
  Shield, 
  Users, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  User,
  Settings,
  Eye,
  Lock
} from "lucide-react";

interface Role {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  userCount: number;
  isSystemRole: boolean;
}

interface Permission {
  id: string;
  name: string;
  description: string;
  category: string;
}

const PERMISSION_CATEGORIES = {
  'trips': 'Trip Management',
  'users': 'User Management', 
  'analytics': 'Analytics & Reporting',
  'admin': 'Administrative',
  'organization': 'Organization Management'
};

const mockRoles: Role[] = [
  {
    id: 'super_admin',
    name: 'Super Administrator',
    description: 'Full system access with all permissions',
    permissions: ['manage_users', 'manage_organizations', 'view_analytics', 'system_settings', 'manage_roles'],
    userCount: 2,
    isSystemRole: true
  },
  {
    id: 'admin', 
    name: 'Administrator',
    description: 'Organization-level administrative access',
    permissions: ['manage_users', 'view_analytics', 'manage_trips', 'organization_settings'],
    userCount: 8,
    isSystemRole: true
  },
  {
    id: 'manager',
    name: 'Manager',
    description: 'Team management and trip oversight',
    permissions: ['view_analytics', 'manage_trips', 'approve_expenses'],
    userCount: 15,
    isSystemRole: false
  },
  {
    id: 'user',
    name: 'User',
    description: 'Standard user access for trip planning',
    permissions: ['create_trips', 'view_trips', 'submit_expenses'],
    userCount: 127,
    isSystemRole: true
  }
];

const mockPermissions: Permission[] = [
  { id: 'manage_users', name: 'Manage Users', description: 'Create, edit, and deactivate user accounts', category: 'users' },
  { id: 'manage_organizations', name: 'Manage Organizations', description: 'Full organization administration', category: 'organization' },
  { id: 'view_analytics', name: 'View Analytics', description: 'Access reporting and analytics dashboards', category: 'analytics' },
  { id: 'system_settings', name: 'System Settings', description: 'Configure system-wide settings', category: 'admin' },
  { id: 'manage_roles', name: 'Manage Roles', description: 'Create and modify user roles', category: 'admin' },
  { id: 'manage_trips', name: 'Manage Trips', description: 'Full trip management capabilities', category: 'trips' },
  { id: 'create_trips', name: 'Create Trips', description: 'Create new travel itineraries', category: 'trips' },
  { id: 'view_trips', name: 'View Trips', description: 'View trip details and itineraries', category: 'trips' },
  { id: 'approve_expenses', name: 'Approve Expenses', description: 'Review and approve expense reports', category: 'organization' },
  { id: 'submit_expenses', name: 'Submit Expenses', description: 'Submit expense reports for approval', category: 'organization' },
  { id: 'organization_settings', name: 'Organization Settings', description: 'Configure organization preferences', category: 'organization' }
];

export default function AdminRoles() {
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [editingRole, setEditingRole] = useState<Partial<Role>>({});
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: roles = mockRoles, isLoading } = useQuery<Role[]>({
    queryKey: ['/api/admin/roles'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/roles');
      return (response as Role[]) || mockRoles;
    }
  });

  const { data: permissions = mockPermissions } = useQuery<Permission[]>({
    queryKey: ['/api/admin/permissions'],
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/permissions');
      return (response as Permission[]) || mockPermissions;
    }
  });

  const createRoleMutation = useMutation({
    mutationFn: async (roleData: Partial<Role>) => {
      return (await apiRequest('POST', '/api/admin/roles', roleData)) as Role;
    },
    onSuccess: () => {
      toast({ title: "Role created successfully" });
      setIsCreating(false);
      setEditingRole({});
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
    }
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ id, ...roleData }: Partial<Role> & { id: string }) => {
      return (await apiRequest('PUT', `/api/admin/roles/${id}`, roleData)) as Role;
    },
    onSuccess: () => {
      toast({ title: "Role updated successfully" });
      setSelectedRole(null);
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
    }
  });

  const deleteRoleMutation = useMutation({
    mutationFn: async (roleId: string) => {
      await apiRequest('DELETE', `/api/admin/roles/${roleId}`);
    },
    onSuccess: () => {
      toast({ title: "Role deleted successfully" });
      queryClient.invalidateQueries({ queryKey: ['/api/admin/roles'] });
    }
  });

  const handlePermissionToggle = (permissionId: string, checked: boolean) => {
    setEditingRole(prev => ({
      ...prev,
      permissions: checked 
        ? [...(prev.permissions || []), permissionId]
        : (prev.permissions || []).filter(p => p !== permissionId)
    }));
  };

  const handleSaveRole = () => {
    if (editingRole.id) {
      updateRoleMutation.mutate(editingRole as Role & { id: string });
    } else {
      createRoleMutation.mutate(editingRole);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-electric-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-electric-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
                Role Management
              </h1>
              <p className="text-slate-600 dark:text-slate-300">
                Configure user roles and permissions for your organization
              </p>
            </div>
            <Button 
                className="bg-electric-600 hover:bg-electric-700"
                onClick={() => {
                  setIsCreating(true);
                  setEditingRole({ permissions: [] });
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Role
              </Button>
              
            <Dialog open={isCreating} onOpenChange={setIsCreating}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <AlertDialogTitle>Create New Role</AlertDialogTitle>
                </DialogHeader>
                <RoleEditor 
                  role={editingRole}
                  permissions={permissions}
                  onRoleChange={setEditingRole}
                  onPermissionToggle={handlePermissionToggle}
                  onSave={handleSaveRole}
                  onCancel={() => {
                    setIsCreating(false);
                    setEditingRole({});
                  }}
                  isLoading={createRoleMutation.isPending}
                />
              </DialogContent>
            </Dialog>
          </div>
        </motion.div>

        {/* Roles Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {roles.map((role, index) => (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="h-full hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-electric-100 dark:bg-electric-900/20 rounded-lg">
                        {role.isSystemRole ? (
                          <Shield className="w-5 h-5 text-electric-600" />
                        ) : (
                          <User className="w-5 h-5 text-electric-600" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{role.name}</CardTitle>
                        {role.isSystemRole && (
                          <Badge variant="secondary" className="mt-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            System Role
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingRole(role);
                          setSelectedRole(role);
                        }}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {!role.isSystemRole && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteRoleMutation.mutate(role.id)}
                          disabled={deleteRoleMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {role.description}
                  </p>
                  
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Users</span>
                      <Badge variant="outline">
                        <Users className="w-3 h-3 mr-1" />
                        {role.userCount}
                      </Badge>
                    </div>
                    
                    <div>
                      <span className="text-sm font-medium mb-2 flex items-center gap-1">
                        <Eye className="w-3 h-3" />
                        Permissions
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {role.permissions.slice(0, 3).map(permissionId => {
                          const permission = permissions.find(p => p.id === permissionId);
                          return (
                            <Badge key={permissionId} variant="secondary" className="text-xs">
                              {permission?.name || permissionId}
                            </Badge>
                          );
                        })}
                        {role.permissions.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{role.permissions.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Edit Role Dialog */}
        <Dialog open={!!selectedRole} onOpenChange={() => setSelectedRole(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <AlertDialogTitle>
                <span className="flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  Edit Role: {selectedRole?.name}
                </span>
              </AlertDialogTitle>
            </DialogHeader>
            {selectedRole && (
              <RoleEditor 
                role={editingRole}
                permissions={permissions}
                onRoleChange={setEditingRole}
                onPermissionToggle={handlePermissionToggle}
                onSave={handleSaveRole}
                onCancel={() => setSelectedRole(null)}
                isLoading={updateRoleMutation.isPending}
                isSystemRole={selectedRole.isSystemRole}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

interface RoleEditorProps {
  role: Partial<Role>;
  permissions: Permission[];
  onRoleChange: (role: Partial<Role>) => void;
  onPermissionToggle: (permissionId: string, checked: boolean) => void;
  onSave: () => void;
  onCancel: () => void;
  isLoading: boolean;
  isSystemRole?: boolean;
}

function RoleEditor({ 
  role, 
  permissions, 
  onRoleChange, 
  onPermissionToggle, 
  onSave, 
  onCancel, 
  isLoading,
  isSystemRole 
}: RoleEditorProps) {
  const permissionsByCategory = permissions.reduce((acc, permission) => {
    const category = permission.category;
    if (!acc[category]) acc[category] = [];
    acc[category].push(permission);
    return acc;
  }, {} as Record<string, Permission[]>);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="roleName">Role Name</Label>
          <Input
            id="roleName"
            value={role.name || ''}
            onChange={(e) => onRoleChange({ ...role, name: e.target.value })}
            disabled={isSystemRole}
            placeholder="Enter role name"
          />
        </div>
        <div>
          <Label htmlFor="roleDescription">Description</Label>
          <Input
            id="roleDescription"
            value={role.description || ''}
            onChange={(e) => onRoleChange({ ...role, description: e.target.value })}
            placeholder="Enter role description"
          />
        </div>
      </div>

      <div>
        <Label className="text-base font-semibold">Permissions</Label>
        <div className="mt-3 space-y-4">
          {Object.entries(permissionsByCategory).map(([category, categoryPermissions]) => (
            <div key={category} className="border rounded-lg p-4">
              <h4 className="font-medium mb-3 text-sm uppercase tracking-wide text-muted-foreground">
                {PERMISSION_CATEGORIES[category as keyof typeof PERMISSION_CATEGORIES] || category}
              </h4>
              <div className="grid grid-cols-1 gap-3">
                {categoryPermissions.map(permission => (
                  <div key={permission.id} className="flex items-start space-x-3">
                    <Checkbox
                      checked={role.permissions?.includes(permission.id) || false}
                      onCheckedChange={(checked) => 
                        onPermissionToggle(permission.id, checked as boolean)
                      }
                    />
                    <div className="flex-1 min-w-0">
                      <Label 
                        className="text-sm font-medium cursor-pointer"
                      >
                        {permission.name}
                      </Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        {permission.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button 
          onClick={onSave}
          disabled={isLoading || !role.name || isSystemRole}
          className="bg-electric-600 hover:bg-electric-700"
        >
          {isLoading && <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2" />}
          <Save className="w-4 h-4 mr-2" />
          Save Role
        </Button>
      </div>
    </div>
  );
}
