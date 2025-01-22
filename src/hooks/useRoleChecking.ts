import { UserRole } from "@/types/roles";

export const useRoleChecking = (userRoles: UserRole[] | null) => {
  const hasRole = (role: UserRole): boolean => {
    console.log('[RoleChecking] Checking role:', { 
      role, 
      userRoles,
      timestamp: new Date().toISOString()
    });
    if (!userRoles) return false;
    return userRoles.includes(role);
  };

  const hasAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(role => hasRole(role));
  };

  const canAccessTab = (tab: string): boolean => {
    if (!userRoles) return false;

    const result = (() => {
      switch (tab) {
        case 'dashboard':
          return true;
        case 'users':
          return hasRole('admin') || hasRole('collector');
        case 'financials':
          return hasRole('admin') || hasRole('collector');
        case 'system':
          return hasRole('admin');
        default:
          return false;
      }
    })();

    console.log('[RoleChecking] Tab access check:', {
      tab,
      hasAccess: result,
      userRoles,
      timestamp: new Date().toISOString()
    });

    return result;
  };

  return {
    hasRole,
    hasAnyRole,
    canAccessTab
  };
};