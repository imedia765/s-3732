import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Table, TableBody } from "@/components/ui/table";
import { Loader2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import PaymentTableHeader from './PaymentTableHeader';
import PaymentTableRow from './PaymentTableRow';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface AllPaymentsTableProps {
  showHistory?: boolean;
}

const AllPaymentsTable = ({ showHistory = false }: AllPaymentsTableProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: paymentsData, isLoading, error } = useQuery({
    queryKey: ['payment-requests'],
    queryFn: async () => {
      const { data, error, count } = await supabase
        .from('payment_requests')
        .select(`
          *,
          members!payment_requests_member_id_fkey(
            full_name,
            member_number,
            phone,
            email
          ),
          collectors:members_collectors(
            name,
            phone,
            email
          )
        `, { count: 'exact' })
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching payments:', error);
        throw error;
      }

      // Group payments by collector
      const groupedPayments = data?.reduce((acc: any, payment: any) => {
        const collectorId = payment.collector_id;
        if (!acc[collectorId]) {
          acc[collectorId] = {
            collector: payment.collectors,
            payments: [],
            totalAmount: 0
          };
        }
        acc[collectorId].payments.push(payment);
        if (payment.status === 'pending') {
          acc[collectorId].totalAmount += Number(payment.amount);
        }
        return acc;
      }, {});

      return { groupedPayments, count };
    },
  });

  const handleApproval = async (paymentId: string, approved: boolean) => {
    try {
      const { error } = await supabase
        .from('payment_requests')
        .update({
          status: approved ? 'approved' : 'rejected',
          approved_at: approved ? new Date().toISOString() : null,
          approved_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', paymentId);

      if (error) throw error;

      toast({
        title: approved ? "Payment Approved" : "Payment Rejected",
        description: "The payment request has been processed successfully.",
      });

      queryClient.invalidateQueries({ queryKey: ['payment-requests'] });
      queryClient.invalidateQueries({ queryKey: ['payment-statistics'] });
    } catch (error) {
      console.error('Error processing payment:', error);
      toast({
        title: "Error",
        description: "Failed to process the payment request.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card className="bg-dashboard-card border-dashboard-accent1/20 rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-medium text-white mb-4">Payment History & Approvals</h2>
          <div className="flex items-center gap-2 text-white">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Loading payment history...</span>
          </div>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="bg-dashboard-card border-dashboard-accent1/20 rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-medium text-white mb-4">Payment History & Approvals</h2>
          <div className="flex items-center gap-2 text-red-500">
            <AlertCircle className="h-4 w-4" />
            <span>Error loading payment history: {error.message}</span>
          </div>
        </div>
      </Card>
    );
  }

  const groupedPayments = paymentsData?.groupedPayments || {};
  const collectors = Object.entries(groupedPayments);

  if (!collectors.length) {
    return (
      <Card className="bg-dashboard-card border-dashboard-accent1/20 rounded-lg">
        <div className="p-6">
          <h2 className="text-xl font-medium text-white mb-4">Payment History & Approvals</h2>
          <div className="flex items-center gap-2 text-white">
            <AlertCircle className="h-4 w-4" />
            <span>No payment history found.</span>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-dashboard-card border-dashboard-accent1/20 rounded-lg">
      <div className="p-6">
        <h2 className="text-xl font-medium text-white mb-4">Payment History & Approvals</h2>
        <Accordion type="single" collapsible className="space-y-4">
          {collectors.map(([collectorId, data]: [string, any]) => (
            <AccordionItem
              key={collectorId}
              value={collectorId}
              className="border border-white/10 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-4 py-3 hover:no-underline">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-3">
                    <div>
                      <p className="font-medium text-white">{data.collector.name}</p>
                      <p className="text-sm text-dashboard-warning">
                        Pending Amount: £{data.totalAmount.toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="rounded-md border border-white/10">
                  <Table>
                    <PaymentTableHeader />
                    <TableBody>
                      {data.payments.map((payment: any) => (
                        <PaymentTableRow
                          key={payment.id}
                          payment={payment}
                          onApprove={handleApproval}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </Card>
  );
};

export default AllPaymentsTable;