import { useRoleStore } from '@/store/roleStore';
import { useRoleFetching } from './useRoleFetching';
import { useRoleChecking } from './useRoleChecking';
import { getPrimaryRole, mapRolesToPermissions } from '@/utils/roleUtils';
import { UserRole } from '@/types/roles';

export const useRoleAccess = () => {
  const {
    userRole,
    userRoles,
    isLoading: roleLoading,
    error,
    permissions,
    setUserRole,
    setUserRoles,
    setIsLoading,
    setError,
    setPermissions
  } = useRoleStore();

  const { data: fetchedRoles, refetch, isLoading, error: fetchError } = useRoleFetching();
  const { hasRole, hasAnyRole, canAccessTab } = useRoleChecking(userRoles);

  // Update store when roles are fetched
  if (fetchedRoles && !isLoading && !fetchError) {
    setUserRoles(fetchedRoles);
    setUserRole(getPrimaryRole(fetchedRoles));
    setPermissions(mapRolesToPermissions(fetchedRoles));
  }

  if (fetchError && !error) {
    setError(fetchError);
  }

  setIsLoading(isLoading);

  return {
    userRole,
    userRoles,
    roleLoading,
    error,
    permissions,
    hasRole,
    hasAnyRole,
    canAccessTab,
    refetchRoles: refetch
  };
};

export type { UserRole };