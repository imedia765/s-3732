import { useQueryClient } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, TableBody } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useRoleAccess } from '@/hooks/useRoleAccess';
import { useEnhancedRoleAccess } from '@/hooks/useEnhancedRoleAccess';
import { useRoleSync } from '@/hooks/useRoleSync';
import { useCollectorsData } from '@/hooks/useCollectorsData';
import { CollectorRolesHeader } from './collectors/roles/CollectorRolesHeader';
import { CollectorRolesRow } from './collectors/roles/CollectorRolesRow';
import { UserRole, CollectorInfo } from "@/types/collector-roles";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database['public']['Enums']['app_role'];

export const CollectorRolesList = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { roleLoading, error: roleError, permissions } = useRoleAccess();
  const { isLoading: enhancedLoading } = useEnhancedRoleAccess();
  const { syncRoles } = useRoleSync();
  const { data: collectors = [], isLoading, error } = useCollectorsData();

  const handleRoleChange = async (userId: string, role: UserRole, action: 'add' | 'remove') => {
    try {
      console.log('[CollectorRolesList] Starting role change:', { 
        userId, 
        role, 
        action,
        timestamp: new Date().toISOString() 
      });
      
      if (action === 'add') {
        console.log('[CollectorRolesList] Adding role:', { userId, role });
        const { error: insertError } = await supabase
          .from('user_roles')
          .insert([{ 
            user_id: userId, 
            role 
          }]);
        if (insertError) {
          console.error('[CollectorRolesList] Insert error:', insertError);
          throw insertError;
        }
      } else {
        console.log('[CollectorRolesList] Removing role:', { userId, role });
        const { error: deleteError } = await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId)
          .eq('role', role);
        if (deleteError) {
          console.error('[CollectorRolesList] Delete error:', deleteError);
          throw deleteError;
        }
      }
      
      console.log('[CollectorRolesList] Role change successful, invalidating queries');
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['collectors-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['userRoles'] }),
        queryClient.invalidateQueries({ queryKey: ['roleSyncStatus'] })
      ]);
      
      toast({
        title: "Role updated",
        description: `Successfully ${action}ed ${role} role`,
      });

      console.log('[CollectorRolesList] Role change completed successfully');
    } catch (error) {
      console.error('[CollectorRolesList] Role update error:', error);
      toast({
        title: "Error updating role",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      });
    }
  };

  const handleSync = async (userId: string) => {
    try {
      console.log('[CollectorRolesList] Starting sync for user:', {
        userId,
        timestamp: new Date().toISOString()
      });
      
      await syncRoles([userId]);
      
      console.log('[CollectorRolesList] Sync completed, invalidating queries');
      
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['collectors-roles'] }),
        queryClient.invalidateQueries({ queryKey: ['userRoles'] }),
        queryClient.invalidateQueries({ queryKey: ['roleSyncStatus'] }),
        queryClient.invalidateQueries({ queryKey: ['collectors'] })
      ]);
      
      toast({
        title: "Sync completed",
        description: "Role synchronization process has completed",
      });
      
      console.log('[CollectorRolesList] Sync completed successfully for user:', userId);
    } catch (error) {
      console.error('[CollectorRolesList] Sync error:', error);
      toast({
        title: "Sync failed",
        description: error instanceof Error ? error.message : "An error occurred during sync",
        variant: "destructive",
      });
    }
  };

  if (error || roleError) {
    const errorMessage = error?.message || roleError?.message || "Error loading collectors";
    console.error('[CollectorRolesList] Error:', errorMessage);
    return (
      <div className="flex items-center justify-center p-4 text-dashboard-error">
        <AlertCircle className="w-4 h-4 mr-2" />
        <span>{errorMessage}</span>
      </div>
    );
  }

  if (isLoading || roleLoading || enhancedLoading) {
    return (
      <div className="flex justify-center items-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-dashboard-accent1" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-dashboard-dark to-dashboard-card rounded-lg">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold bg-gradient-to-r from-dashboard-accent1 to-dashboard-accent2 bg-clip-text text-transparent">
          Active Collectors and Roles
        </h2>
        <Badge 
          variant="outline" 
          className="bg-dashboard-accent1/10 text-dashboard-accent1 border-dashboard-accent1"
        >
          {collectors?.length || 0} Collectors
        </Badge>
      </div>

      <Card className="overflow-hidden bg-dashboard-card border-dashboard-cardBorder hover:border-dashboard-cardBorderHover transition-all duration-300">
        <div className="overflow-x-auto">
          <Table>
            <CollectorRolesHeader />
            <TableBody>
              {collectors.map((collector: CollectorInfo) => (
                <CollectorRolesRow
                  key={collector.member_number}
                  collector={collector}
                  onRoleChange={handleRoleChange}
                  onSync={handleSync}
                  permissions={permissions}
                />
              ))}
            </TableBody>
          </Table>
        </div>
      </Card>
    </div>
  );
};

export default CollectorRolesList;
