import { UserRole, RolePermissions } from "@/types/roles";

export const ROLE_PRIORITY: Record<UserRole, number> = {
  'admin': 3,
  'collector': 2,
  'member': 1
};

export const isValidRole = (role: string): role is UserRole => {
  return ['admin', 'collector', 'member'].includes(role);
};

export const getPrimaryRole = (roles: UserRole[]): UserRole => {
  return roles.reduce((highest, current) => {
    return ROLE_PRIORITY[current] > ROLE_PRIORITY[highest] ? current : highest;
  }, 'member' as UserRole);
};

export const mapRolesToPermissions = (roles: UserRole[] | null): RolePermissions => {
  const permissions = {
    canManageUsers: false,
    canCollectPayments: false,
    canAccessSystem: false,
    canViewAudit: false,
    canManageCollectors: false,
  };

  if (!roles) return permissions;

  if (roles.includes('admin')) {
    permissions.canManageUsers = true;
    permissions.canCollectPayments = true;
    permissions.canAccessSystem = true;
    permissions.canViewAudit = true;
    permissions.canManageCollectors = true;
  } else if (roles.includes('collector')) {
    permissions.canCollectPayments = true;
    permissions.canManageUsers = true;
  }

  return permissions;
};