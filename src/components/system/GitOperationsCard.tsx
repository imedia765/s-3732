import { useState, useEffect } from 'react';
import { GitBranch, AlertCircle } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { GitOperationProgress } from './git/GitOperationProgress';
import { GitOperationLogs } from './git/GitOperationLogs';

interface GitOperationLog {
  id: string;
  operation_type: string;
  status: string;
  message: string;
  created_at: string;
}

const GitOperationsCard = () => {
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<GitOperationLog[]>([]);
  const [currentOperation, setCurrentOperation] = useState('');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      console.log('Fetching git operation logs...');
      const { data, error } = await supabase
        .from('git_operations_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching logs:', error);
        throw error;
      }
      console.log('Fetched logs:', data);
      setLogs(data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
      toast({
        title: "Error",
        description: "Failed to fetch operation logs",
        variant: "destructive",
      });
    }
  };

  const logOperation = async (status: string, message: string) => {
    try {
      const { error } = await supabase
        .from('git_operations_logs')
        .insert({
          operation_type: 'push',
          status,
          message
        });

      if (error) {
        console.error('Error logging operation:', error);
      }
      
      await fetchLogs();
    } catch (error) {
      console.error('Error logging operation:', error);
    }
  };

  const handlePushToMaster = async () => {
    if (isProcessing) return;
    
    try {
      setIsProcessing(true);
      setProgress(10);
      setCurrentOperation('Initializing git operation...');
      await logOperation('started', 'Starting Git push operation');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No active session');
      }

      setProgress(30);
      setCurrentOperation('Authenticating with GitHub...');

      const { data: recentOps, error: queryError } = await supabase
        .from('git_operations_logs')
        .select('*')
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1);

      if (queryError) {
        console.error('Error checking recent operations:', queryError);
      } else {
        console.log('Recent successful operations:', recentOps);
      }

      setProgress(50);
      setCurrentOperation('Preparing to push changes...');

      const { data, error } = await supabase.functions.invoke('git-operations', {
        body: {
          branch: 'main',
          commitMessage: 'Force commit: Pushing all files to master'
        }
      });

      if (error) {
        console.error('Edge function error:', error);
        await logOperation('failed', `Edge function error: ${error.message}`);
        throw error;
      }

      console.log('Push operation response:', data);
      setProgress(100);
      await logOperation('completed', 'Successfully pushed to main');
      
      toast({
        title: "Success",
        description: "Successfully pushed changes to master",
      });

    } catch (error: any) {
      console.error('Push error:', error);
      await logOperation('failed', error.message || "Unknown error occurred");
      
      toast({
        title: "Push Failed",
        description: error.message || "Failed to push changes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
      setCurrentOperation('');
      setProgress(0);
    }
  };

  return (
    <Card className="bg-dashboard-card border-white/10">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-dashboard-accent1" />
            <CardTitle className="text-xl text-white">Git Operations</CardTitle>
          </div>
        </div>
        <CardDescription className="text-dashboard-muted">
          Manage Git operations and repository synchronization
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-dashboard-card/50 border-dashboard-accent1/20">
          <AlertCircle className="h-4 w-4 text-dashboard-accent1" />
          <AlertTitle className="text-dashboard-accent1">Important</AlertTitle>
          <AlertDescription className="text-dashboard-muted">
            Using stored GitHub token from Supabase secrets. Make sure it's configured in the Edge Functions settings.
          </AlertDescription>
        </Alert>

        {isProcessing && (
          <GitOperationProgress 
            currentOperation={currentOperation}
            progress={progress}
          />
        )}

        <Button
          onClick={handlePushToMaster}
          disabled={isProcessing}
          className="w-full bg-dashboard-accent1 hover:bg-dashboard-accent1/80"
        >
          {isProcessing ? "Processing..." : "Push to Master"}
        </Button>

        <GitOperationLogs logs={logs} />
      </CardContent>
    </Card>
  );
};

export default GitOperationsCard;