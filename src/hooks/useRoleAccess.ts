import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from 'react-router-dom';

export type UserRole = 'member' | 'collector' | 'admin' | null;

const ROLE_STALE_TIME = 1000 * 60; // 1 minute
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000;

export const useRoleAccess = () => {
  const { toast } = useToast();
  const navigate = useNavigate();

  // First check if we have a valid session
  const { data: sessionData, error: sessionError } = useQuery({
    queryKey: ['session'],
    queryFn: async () => {
      try {
        console.log('Checking session status...');
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (session) {
          console.log('Found session for user:', session.user.id);
          // Verify session is still valid
          const { error: userError } = await supabase.auth.getUser();
          if (userError) throw userError;
        }
        
        return session;
      } catch (error: any) {
        console.error('Session error:', error);
        await supabase.auth.signOut();
        localStorage.clear();
        throw error;
      }
    },
    retry: MAX_RETRIES,
    retryDelay: RETRY_DELAY,
  });

  // If session check fails, redirect to login
  useEffect(() => {
    if (sessionError) {
      console.error('Session error:', sessionError);
      toast({
        title: "Session expired",
        description: "Please sign in again",
        variant: "destructive",
      });
      navigate('/login');
    }
  }, [sessionError, navigate, toast]);

  const { data: userRole, isLoading: roleLoading, error: roleError } = useQuery({
    queryKey: ['userRole', sessionData?.user?.id],
    queryFn: async () => {
      if (!sessionData?.user) {
        console.log('No session found in role check');
        return null;
      }

      console.log('Fetching roles for user:', sessionData.user.id);
      
      try {
        // Get all roles for the user
        console.log('Querying user_roles table...');
        const { data: roleData, error: roleError } = await supabase
          .from('user_roles')
          .select('role')
          .eq('user_id', sessionData.user.id);

        if (roleError) {
          console.error('Error fetching roles:', roleError);
          throw roleError;
        }

        console.log('Raw role data from database:', roleData);

        if (roleData && roleData.length > 0) {
          console.log('Found roles in database:', roleData);
          const roles = roleData.map(r => r.role);
          console.log('Mapped roles:', roles);
          
          // Return highest priority role
          if (roles.includes('admin')) {
            console.log('User has admin role, returning admin');
            return 'admin' as UserRole;
          }
          if (roles.includes('collector')) {
            console.log('User has collector role, returning collector');
            return 'collector' as UserRole;
          }
          if (roles.includes('member')) {
            console.log('User has member role, returning member');
            return 'member' as UserRole;
          }
        }

        // Fallback to checking collector status
        console.log('No roles found in user_roles, checking collector status...');
        const { data: collectorData, error: collectorError } = await supabase
          .from('members_collectors')
          .select('name')
          .eq('member_number', sessionData.user.user_metadata.member_number)
          .maybeSingle();

        if (collectorError) {
          console.error('Error checking collector status:', collectorError);
          throw collectorError;
        }

        if (collectorData) {
          console.log('User is a collector');
          return 'collector' as UserRole;
        }

        // Final fallback - check members table
        console.log('Checking member status...');
        const { data: memberData, error: memberError } = await supabase
          .from('members')
          .select('id')
          .eq('auth_user_id', sessionData.user.id)
          .maybeSingle();

        if (memberError) {
          console.error('Error checking member status:', memberError);
          throw memberError;
        }

        if (memberData?.id) {
          console.log('User is a regular member');
          return 'member' as UserRole;
        }

        console.log('No role found, defaulting to member');
        return 'member' as UserRole;
      } catch (error) {
        console.error('Error in role check:', error);
        throw error;
      }
    },
    enabled: !!sessionData?.user?.id,
    staleTime: ROLE_STALE_TIME,
    retry: MAX_RETRIES,
    retryDelay: RETRY_DELAY,
    refetchOnWindowFocus: true,
    refetchOnMount: true,
  });

  const hasRole = (role: UserRole): boolean => {
    return userRole === role;
  };

  const canAccessTab = (tab: string): boolean => {
    console.log('Checking access for tab:', tab, 'User role:', userRole);
    
    if (!userRole) return false;

    switch (userRole) {
      case 'admin':
        return ['dashboard', 'users', 'collectors', 'audit', 'system', 'financials'].includes(tab);
      case 'collector':
        return ['dashboard', 'users'].includes(tab);
      case 'member':
        return tab === 'dashboard';
      default:
        return false;
    }
  };

  return {
    userRole,
    roleLoading: roleLoading || !sessionData,
    error: roleError,
    canAccessTab,
    hasRole
  };
};