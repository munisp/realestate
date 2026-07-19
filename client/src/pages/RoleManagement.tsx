// @ts-nocheck
import { useState } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Shield, Users, CheckCircle, XCircle } from 'lucide-react';

type Role = 'user' | 'moderator' | 'support' | 'admin' | 'super_admin';

interface RoleInfo {
  name: Role;
  displayName: string;
  description: string;
  level: number;
  userCount: number;
  color: string;
}

const roles: RoleInfo[] = [
  {
    name: 'user',
    displayName: 'User',
    description: 'Standard user with basic property and transaction access',
    level: 1,
    userCount: 1245,
    color: 'bg-gray-500',
  },
  {
    name: 'moderator',
    displayName: 'Moderator',
    description: 'Can approve/reject properties and resolve reports',
    level: 2,
    userCount: 12,
    color: 'bg-blue-500',
  },
  {
    name: 'support',
    displayName: 'Support',
    description: 'Can assist users and view transaction details',
    level: 3,
    userCount: 8,
    color: 'bg-green-500',
  },
  {
    name: 'admin',
    displayName: 'Administrator',
    description: 'Full platform management including users, analytics, and escrow',
    level: 4,
    userCount: 3,
    color: 'bg-purple-500',
  },
  {
    name: 'super_admin',
    displayName: 'Super Administrator',
    description: 'Complete system access including settings and configurations',
    level: 5,
    userCount: 1,
    color: 'bg-red-500',
  },
];

const permissionCategories = {
  'Property Management': [
    { id: 'property.create', name: 'Create Properties' },
    { id: 'property.edit.own', name: 'Edit Own Properties' },
    { id: 'property.edit.any', name: 'Edit Any Property' },
    { id: 'property.approve', name: 'Approve Properties' },
    { id: 'property.reject', name: 'Reject Properties' },
  ],
  'User Management': [
    { id: 'user.view', name: 'View Users' },
    { id: 'user.edit.any', name: 'Edit Any User' },
    { id: 'user.suspend', name: 'Suspend Users' },
    { id: 'user.assign_role', name: 'Assign Roles' },
  ],
  'Reports & Moderation': [
    { id: 'report.view', name: 'View Reports' },
    { id: 'report.resolve', name: 'Resolve Reports' },
  ],
  'Escrow Management': [
    { id: 'escrow.view.any', name: 'View Any Escrow' },
    { id: 'escrow.manage', name: 'Manage Escrow' },
    { id: 'escrow.release_funds', name: 'Release Funds' },
  ],
  'Analytics & Reporting': [
    { id: 'analytics.view', name: 'View Analytics' },
    { id: 'audit.view', name: 'View Audit Logs' },
  ],
};

// Mock permission data - replace with actual API
const rolePermissions: Record<Role, string[]> = {
  user: ['property.create', 'property.edit.own'],
  moderator: ['property.create', 'property.edit.own', 'property.edit.any', 'property.approve', 'property.reject', 'report.view', 'report.resolve'],
  support: ['property.create', 'property.edit.own', 'user.view', 'user.edit.any', 'report.view', 'report.resolve', 'escrow.view.any'],
  admin: ['property.create', 'property.edit.own', 'property.edit.any', 'property.approve', 'property.reject', 'user.view', 'user.edit.any', 'user.suspend', 'user.assign_role', 'report.view', 'report.resolve', 'escrow.view.any', 'escrow.manage', 'escrow.release_funds', 'analytics.view', 'audit.view'],
  super_admin: Object.values(permissionCategories).flatMap(cat => cat.map(p => p.id)),
};

export default function RoleManagement() {
  const { user } = useAuth();
  const [selectedRole, setSelectedRole] = useState<RoleInfo | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const viewRoleDetails = (role: RoleInfo) => {
    setSelectedRole(role);
    setDetailsOpen(true);
  };

  const hasPermission = (rolePermissions: string[], permissionId: string) => {
    return rolePermissions.includes(permissionId);
  };

  if (user?.role !== 'admin' && user?.role !== 'super_admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>You don't have permission to access this page.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Shield className="h-8 w-8" />
            Role & Permission Management
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage user roles and their associated permissions
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Roles
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{roles.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Users
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {roles.reduce((sum, role) => sum + role.userCount, 0)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Permission Categories
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {Object.keys(permissionCategories).length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Roles Table */}
        <Card>
          <CardHeader>
            <CardTitle>System Roles</CardTitle>
            <CardDescription>Overview of all user roles and their hierarchy</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead>Level</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Users</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roles.map((role) => (
                  <TableRow key={role.name}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${role.color}`} />
                        <span className="font-medium">{role.displayName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">Level {role.level}</Badge>
                    </TableCell>
                    <TableCell className="max-w-md">
                      <p className="text-sm text-muted-foreground truncate">
                        {role.description}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{role.userCount}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => viewRoleDetails(role)}
                      >
                        View Permissions
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Role Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${selectedRole?.color}`} />
                {selectedRole?.displayName} Permissions
              </DialogTitle>
              <DialogDescription>
                {selectedRole?.description}
              </DialogDescription>
            </DialogHeader>
            {selectedRole && (
              <div className="space-y-6">
                {/* Role Info */}
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <Label className="text-xs text-muted-foreground">Role Level</Label>
                    <p className="font-medium">Level {selectedRole.level}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Total Users</Label>
                    <p className="font-medium">{selectedRole.userCount}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Permissions</Label>
                    <p className="font-medium">
                      {rolePermissions[selectedRole.name]?.length || 0}
                    </p>
                  </div>
                </div>

                {/* Permissions by Category */}
                {Object.entries(permissionCategories).map(([category, permissions]) => (
                  <div key={category}>
                    <h3 className="font-semibold mb-3">{category}</h3>
                    <div className="space-y-2">
                      {permissions.map((permission) => {
                        const hasAccess = hasPermission(
                          rolePermissions[selectedRole.name] || [],
                          permission.id
                        );
                        return (
                          <div
                            key={permission.id}
                            className="flex items-center justify-between p-3 bg-muted rounded-md"
                          >
                            <div className="flex items-center gap-3">
                              {hasAccess ? (
                                <CheckCircle className="h-5 w-5 text-green-600" />
                              ) : (
                                <XCircle className="h-5 w-5 text-gray-400" />
                              )}
                              <span className="text-sm">{permission.name}</span>
                            </div>
                            <Checkbox checked={hasAccess} disabled />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
