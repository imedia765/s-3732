import { Database } from "@/integrations/supabase/types";

export type UserRole = Database['public']['Enums']['app_role'];

export interface RolePermissions {
  canManageUsers: boolean;
  canCollectPayments: boolean;
  canAccessSystem: boolean;
  canViewAudit: boolean;
  canManageCollectors: boolean;
}

export interface RoleState {
  userRole: UserRole | null;
  userRoles: UserRole[] | null;
  isLoading: boolean;
  error: Error | null;
  permissions: RolePermissions;
}