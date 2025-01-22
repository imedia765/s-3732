import { useState } from 'react';
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

interface CollectorRolesListProps {
  searchTerm: string;
  onDebugLog?: (logs: string[]) => void;
}

const CollectorRolesList = ({ searchTerm, onDebugLog }: CollectorRolesListProps) => {
  const [selectedRole, setSelectedRole] = useState<UserRole | 'all'>('all');
  const [page, setPage] = useState(0);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: collectors = [], isLoading } = useCollectorsData();

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      console.log('[CollectorRolesList] Handling role change:', {
        userId,
        newRole,
        timestamp: new Date().toISOString()
      });
      
      await queryClient.invalidateQueries({ queryKey: ['users'] });
      
      console.log('[CollectorRolesList] Role change completed, queries invalidated');
    } catch (error) {
      console.error('[CollectorRolesList] Error in role change:', error);
      toast({
        title: "Error",
        description: "Failed to update role",
        variant: "destructive",
      });
    }
  };

  const handleSync = async (userId: string): Promise<void> => {
    try {
      console.log('[CollectorRolesList] Syncing roles for user:', userId);
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate sync
      console.log('[CollectorRolesList] Sync completed');
    } catch (error) {
      console.error('[CollectorRolesList] Sync error:', error);
      throw error;
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5) {
      setPage(prev => prev + 1);
    }
  };

  return (
    <div className="space-y-6">
      <CollectorRolesHeader
        selectedRole={selectedRole}
        onRoleChange={setSelectedRole}
        totalCount={collectors?.length || 0}
        filteredCount={collectors?.length || 0}
      />
      
      <Table>
        <TableBody>
          {collectors.map((collector: CollectorInfo) => (
            <CollectorRolesRow
              key={collector.member_number}
              collector={collector}
              onRoleChange={handleRoleChange}
              onSync={handleSync}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default CollectorRolesList;