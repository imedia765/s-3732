import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { UserRole } from "@/types/roles";
import { isValidRole, getPrimaryRole } from "@/utils/roleUtils";

export const useRoleFetching = () => {
  const { toast } = useToast();

  return useQuery({
    queryKey: ['userRoles'],
    queryFn: async () => {
      console.log('[RoleFetching] Starting role fetch process...');
      
      try {
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;
        if (!sessionData?.session?.user) {
          console.log('[RoleFetching] No authenticated session found');
          return null;
        }

        console.log('[RoleFetching] Fetching roles for user:', {
          userId: sessionData.session.user.id,
          timestamp: new Date().toISOString()
        });

        let retryCount = 0;
        const maxRetries = 3;
        let roleData = null;
        let lastError = null;

        while (retryCount < maxRetries) {
          try {
            const { data, error: rolesError } = await supabase
              .from('user_roles')
              .select('*')
              .eq('user_id', sessionData.session.user.id);

            if (rolesError) throw rolesError;
            roleData = data;
            break;
          } catch (err) {
            lastError = err;
            retryCount++;
            console.log(`[RoleFetching] Retry ${retryCount} of ${maxRetries}`);
            if (retryCount < maxRetries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * retryCount));
            }
          }
        }

        if (!roleData && lastError) {
          console.error('[RoleFetching] All role fetch retries failed:', lastError);
          throw lastError;
        }

        const validRoles = (roleData
          ?.map(r => r.role)
          .filter(isValidRole) || ['member']) as UserRole[];

        return validRoles;
      } catch (error: any) {
        console.error('[RoleFetching] Role fetch error:', error);
        
        toast({
          title: "Error fetching roles",
          description: "There was a problem loading your permissions. Please try again.",
          variant: "destructive",
        });

        throw error;
      }
    },
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000)
  });
};