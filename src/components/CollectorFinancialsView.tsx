import React from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import CollectorPaymentSummary from './CollectorPaymentSummary';
import CollectorMemberPayments from './members/CollectorMemberPayments';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CollectorFinancialsView = () => {
  const { data: collectorInfo } = useQuery({
    queryKey: ['collector-info'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;

      const { data: collectorData } = await supabase
        .from('members_collectors')
        .select('id, name, phone, prefix, number, email, active, created_at, updated_at')
        .eq('member_number', user.user_metadata.member_number)
        .single();

      return collectorData;
    },
  });

  if (!collectorInfo) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-medium mb-2 text-white">Financial Overview</h1>
        <p className="text-dashboard-muted">Track and manage your financial activities</p>
      </header>

      <Tabs defaultValue="summary" className="w-full">
        <TabsList className="w-full bg-dashboard-card border-b border-dashboard-cardBorder">
          <TabsTrigger 
            value="summary" 
            className="flex-1 data-[state=active]:bg-dashboard-accent1 data-[state=active]:text-white"
          >
            Summary
          </TabsTrigger>
          <TabsTrigger 
            value="payments"
            className="flex-1 data-[state=active]:bg-dashboard-accent1 data-[state=active]:text-white"
          >
            Payments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-6">
          <CollectorPaymentSummary collectorName={collectorInfo.name} />
        </TabsContent>

        <TabsContent value="payments" className="mt-6">
          <CollectorMemberPayments collectorName={collectorInfo.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CollectorFinancialsView;