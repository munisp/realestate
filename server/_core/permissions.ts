/**
 * Role-based permissions system
 * Defines granular permissions for different user roles
 */

export type Role = 'user' | 'moderator' | 'support' | 'admin' | 'super_admin';

export type Permission =
  // Property permissions
  | 'property.create'
  | 'property.edit.own'
  | 'property.edit.any'
  | 'property.delete.own'
  | 'property.delete.any'
  | 'property.approve'
  | 'property.reject'
  | 'property.feature'
  
  // User permissions
  | 'user.view'
  | 'user.edit.own'
  | 'user.edit.any'
  | 'user.suspend'
  | 'user.delete'
  | 'user.assign_role'
  
  // Report permissions
  | 'report.create'
  | 'report.view'
  | 'report.resolve'
  | 'report.delete'
  
  // Transaction permissions
  | 'transaction.view.own'
  | 'transaction.view.any'
  | 'transaction.create'
  | 'transaction.cancel'
  
  // Escrow permissions
  | 'escrow.view.own'
  | 'escrow.view.any'
  | 'escrow.manage'
  | 'escrow.release_funds'
  | 'escrow.resolve_dispute'
  
  // Analytics permissions
  | 'analytics.view'
  | 'analytics.export'
  
  // Audit permissions
  | 'audit.view'
  | 'audit.export'
  
  // System permissions
  | 'system.settings'
  | 'system.notifications';

/**
 * Default permission sets for each role
 */
const rolePermissions: Record<Role, Permission[]> = {
  user: [
    'property.create',
    'property.edit.own',
    'property.delete.own',
    'user.edit.own',
    'report.create',
    'transaction.view.own',
    'transaction.create',
    'escrow.view.own',
  ],
  
  moderator: [
    'property.create',
    'property.edit.own',
    'property.edit.any',
    'property.delete.own',
    'property.approve',
    'property.reject',
    'user.view',
    'user.edit.own',
    'report.create',
    'report.view',
    'report.resolve',
    'transaction.view.own',
    'transaction.create',
    'escrow.view.own',
  ],
  
  support: [
    'property.create',
    'property.edit.own',
    'property.delete.own',
    'user.view',
    'user.edit.own',
    'user.edit.any',
    'report.create',
    'report.view',
    'report.resolve',
    'transaction.view.own',
    'transaction.view.any',
    'transaction.create',
    'escrow.view.own',
    'escrow.view.any',
  ],
  
  admin: [
    'property.create',
    'property.edit.own',
    'property.edit.any',
    'property.delete.own',
    'property.delete.any',
    'property.approve',
    'property.reject',
    'property.feature',
    'user.view',
    'user.edit.own',
    'user.edit.any',
    'user.suspend',
    'user.assign_role',
    'report.create',
    'report.view',
    'report.resolve',
    'report.delete',
    'transaction.view.own',
    'transaction.view.any',
    'transaction.create',
    'transaction.cancel',
    'escrow.view.own',
    'escrow.view.any',
    'escrow.manage',
    'escrow.release_funds',
    'escrow.resolve_dispute',
    'analytics.view',
    'analytics.export',
    'audit.view',
    'audit.export',
  ],
  
  super_admin: [
    'property.create',
    'property.edit.own',
    'property.edit.any',
    'property.delete.own',
    'property.delete.any',
    'property.approve',
    'property.reject',
    'property.feature',
    'user.view',
    'user.edit.own',
    'user.edit.any',
    'user.suspend',
    'user.delete',
    'user.assign_role',
    'report.create',
    'report.view',
    'report.resolve',
    'report.delete',
    'transaction.view.own',
    'transaction.view.any',
    'transaction.create',
    'transaction.cancel',
    'escrow.view.own',
    'escrow.view.any',
    'escrow.manage',
    'escrow.release_funds',
    'escrow.resolve_dispute',
    'analytics.view',
    'analytics.export',
    'audit.view',
    'audit.export',
    'system.settings',
    'system.notifications',
  ],
};

/**
 * Check if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  const permissions = rolePermissions[role];
  return permissions.includes(permission);
}

/**
 * Check if a role has any of the specified permissions
 */
export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(permission => hasPermission(role, permission));
}

/**
 * Check if a role has all of the specified permissions
 */
export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(permission => hasPermission(role, permission));
}

/**
 * Get all permissions for a role
 */
export function getRolePermissions(role: Role): Permission[] {
  return rolePermissions[role];
}

/**
 * Get role hierarchy level (higher number = more permissions)
 */
export function getRoleLevel(role: Role): number {
  const levels: Record<Role, number> = {
    user: 1,
    moderator: 2,
    support: 3,
    admin: 4,
    super_admin: 5,
  };
  return levels[role];
}

/**
 * Check if one role is higher than another
 */
export function isRoleHigher(role1: Role, role2: Role): boolean {
  return getRoleLevel(role1) > getRoleLevel(role2);
}

/**
 * Check if a user can assign a specific role
 * (Users can only assign roles lower than their own)
 */
export function canAssignRole(userRole: Role, targetRole: Role): boolean {
  return isRoleHigher(userRole, targetRole);
}

/**
 * Get human-readable role name
 */
export function getRoleName(role: Role): string {
  const names: Record<Role, string> = {
    user: 'User',
    moderator: 'Moderator',
    support: 'Support',
    admin: 'Administrator',
    super_admin: 'Super Administrator',
  };
  return names[role];
}

/**
 * Get role description
 */
export function getRoleDescription(role: Role): string {
  const descriptions: Record<Role, string> = {
    user: 'Standard user with basic property and transaction access',
    moderator: 'Can approve/reject properties and resolve reports',
    support: 'Can assist users and view transaction details',
    admin: 'Full platform management including users, analytics, and escrow',
    super_admin: 'Complete system access including settings and configurations',
  };
  return descriptions[role];
}

/**
 * Permission categories for UI grouping
 */
export const permissionCategories = {
  'Property Management': [
    'property.create',
    'property.edit.own',
    'property.edit.any',
    'property.delete.own',
    'property.delete.any',
    'property.approve',
    'property.reject',
    'property.feature',
  ],
  'User Management': [
    'user.view',
    'user.edit.own',
    'user.edit.any',
    'user.suspend',
    'user.delete',
    'user.assign_role',
  ],
  'Reports & Moderation': [
    'report.create',
    'report.view',
    'report.resolve',
    'report.delete',
  ],
  'Transactions': [
    'transaction.view.own',
    'transaction.view.any',
    'transaction.create',
    'transaction.cancel',
  ],
  'Escrow Management': [
    'escrow.view.own',
    'escrow.view.any',
    'escrow.manage',
    'escrow.release_funds',
    'escrow.resolve_dispute',
  ],
  'Analytics & Reporting': [
    'analytics.view',
    'analytics.export',
    'audit.view',
    'audit.export',
  ],
  'System Administration': [
    'system.settings',
    'system.notifications',
  ],
} as const;

/**
 * Get permission display name
 */
export function getPermissionName(permission: Permission): string {
  const names: Record<Permission, string> = {
    'property.create': 'Create Properties',
    'property.edit.own': 'Edit Own Properties',
    'property.edit.any': 'Edit Any Property',
    'property.delete.own': 'Delete Own Properties',
    'property.delete.any': 'Delete Any Property',
    'property.approve': 'Approve Properties',
    'property.reject': 'Reject Properties',
    'property.feature': 'Feature Properties',
    'user.view': 'View Users',
    'user.edit.own': 'Edit Own Profile',
    'user.edit.any': 'Edit Any User',
    'user.suspend': 'Suspend Users',
    'user.delete': 'Delete Users',
    'user.assign_role': 'Assign Roles',
    'report.create': 'Create Reports',
    'report.view': 'View Reports',
    'report.resolve': 'Resolve Reports',
    'report.delete': 'Delete Reports',
    'transaction.view.own': 'View Own Transactions',
    'transaction.view.any': 'View Any Transaction',
    'transaction.create': 'Create Transactions',
    'transaction.cancel': 'Cancel Transactions',
    'escrow.view.own': 'View Own Escrow',
    'escrow.view.any': 'View Any Escrow',
    'escrow.manage': 'Manage Escrow',
    'escrow.release_funds': 'Release Escrow Funds',
    'escrow.resolve_dispute': 'Resolve Escrow Disputes',
    'analytics.view': 'View Analytics',
    'analytics.export': 'Export Analytics',
    'audit.view': 'View Audit Logs',
    'audit.export': 'Export Audit Logs',
    'system.settings': 'Manage System Settings',
    'system.notifications': 'Manage Notifications',
  };
  return names[permission];
}
