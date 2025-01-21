import { Database } from "@/integrations/supabase/types";
import { useRoleStore } from '@/store/roleStore';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export type UserRole = Database['public']['Enums']['app_role'];

interface RoleState {
  userRole: UserRole | null;
  userRoles: UserRole[] | null;
  isLoading: boolean;
  error: Error | null;
  permissions: {
    canManageUsers: boolean;
    canCollectPayments: boolean;
    canAccessSystem: boolean;
    canViewAudit: boolean;
    canManageCollectors: boolean;
  };
}

const ROLE_PRIORITY: Record<UserRole, number> = {
  'admin': 3,
  'collector': 2,
  'member': 1
};

const isValidRole = (role: string): role is UserRole => {
  return ['admin', 'collector', 'member'].includes(role);
};

export const useRoleAccess = () => {
  const { toast } = useToast();
  const {
    userRole,
    userRoles,
    isLoading: roleLoading,
    error,
    permissions,
    setUserRole,
    setUserRoles,
    setIsLoading,
    setError
  } = useRoleStore();

  const { data: fetchedRoles, refetch } = useQuery({
    queryKey: ['userRoles'],
    queryFn: async () => {
      console.log('[RoleAccess] Starting role fetch process...');
      setIsLoading(true);
      
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!sessionData?.session?.user) {
          console.log('[RoleAccess] No authenticated session found');
          setUserRoles(null);
          setUserRole(null);
          return null;
        }

        console.log('[RoleAccess] Fetching roles for user:', {
          userId: sessionData.session.user.id,
          email: sessionData.session.user.email,
          timestamp: new Date().toISOString()
        });

        // First check if user is a collector
        console.log('[RoleAccess] Checking collector status...');
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('member_number')
          .eq('auth_user_id', sessionData.session.user.id)
          .maybeSingle();

        if (memberError && memberError.code !== 'PGRST116') {
          console.error('[RoleAccess] Error checking member status:', memberError);
          throw memberError;
        }

        // Fetch all roles with retry logic
        let retryCount = 0;
        const maxRetries = 3;
        let roleData = null;
        let lastError = null;

        while (retryCount < maxRetries) {
          try {
            const { data, error: rolesError } = await supabase
              .from('user_roles')
              .select('*')
              .eq('user_id', sessionData.session.user.id)
              .order('created_at', { ascending: false });

            if (rolesError) throw rolesError;
            roleData = data;
            break;
          } catch (err) {
            lastError = err;
            retryCount++;
            console.log(`[RoleAccess] Retry ${retryCount} of ${maxRetries} for role fetch`);
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }

        if (!roleData && lastError) {
          console.error('[RoleAccess] All role fetch retries failed:', lastError);
          throw lastError;
        }

        console.log('[RoleAccess] Raw role data from database:', roleData);

        const validRoles = roleData
          ?.map(r => r.role)
          .filter(isValidRole) || ['member'];

        console.log('[RoleAccess] Mapped roles:', validRoles);

        // Get highest priority role
        const primaryRole = validRoles.reduce((highest, current) => {
          return ROLE_PRIORITY[current] > ROLE_PRIORITY[highest] ? current : highest;
        }, 'member' as UserRole);

        console.log('[RoleAccess] Role priority selection:', {
          availableRoles: validRoles,
          selectedRole: primaryRole,
          timestamp: new Date().toISOString()
        });
        
        setUserRoles(validRoles);
        setUserRole(primaryRole);
        return validRoles;
      } catch (error: any) {
        console.error('[RoleAccess] Role fetch error:', error);
        
        toast({
          title: "Error fetching roles",
          description: "There was a problem loading your permissions. Please try again.",
          variant: "destructive",
        });

        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    gcTime: 0,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 5000 // Poll every 5 seconds
  });

  const hasRole = (role: UserRole): boolean => {
    console.log('[RoleAccess] Checking role:', { 
      role, 
      userRole, 
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

    console.log('[RoleAccess] Tab access check:', {
      tab,
      hasAccess: result,
      userRoles,
      timestamp: new Date().toISOString()
    });

    return result;
  };

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