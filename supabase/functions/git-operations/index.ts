import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GitOperationRequest {
  branch?: string;
  commitMessage?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Git operation started');
    
    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      throw new Error('No authorization header');
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Invalid token');
    }

    console.log('User authenticated:', user.id);

    // Get GitHub token from secrets
    const githubToken = Deno.env.get('GITHUB_PAT');
    if (!githubToken) {
      console.error('GitHub token not configured');
      throw new Error('GitHub token not configured in Edge Function secrets');
    }

    // Basic validation - just ensure token is not empty
    if (!githubToken.trim()) {
      console.error('Empty GitHub token');
      throw new Error('GitHub token cannot be empty');
    }

    const { branch = 'main', commitMessage = 'Force commit: Pushing all files to master' } = await req.json() as GitOperationRequest;

    // Log operation start
    const { error: logError } = await supabase
      .from('git_operations_logs')
      .insert({
        operation_type: 'push',
        status: 'started',
        created_by: user.id,
        message: 'Starting Git push operation'
      });

    if (logError) {
      console.error('Error logging operation:', logError);
    }

    // GitHub API endpoint
    const repoOwner = 'imedia765';
    const repoName = 's-935078';
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}/git/refs/heads/${branch}`;

    console.log('Fetching current branch state...');
    
    // Test GitHub token with a simple API call first
    console.log('Testing GitHub token...');
    const testResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    const testResponseText = await testResponse.text();
    console.log('GitHub token test response:', testResponseText);

    if (!testResponse.ok) {
      console.error('GitHub token test failed:', testResponseText);
      throw new Error(`GitHub token validation failed: ${testResponseText}`);
    }

    // Get the latest commit SHA
    console.log('Fetching branch information...');
    const response = await fetch(apiUrl, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    const responseText = await response.text();
    console.log('GitHub API response:', responseText);

    if (!response.ok) {
      console.error('GitHub API error:', responseText);
      throw new Error(`GitHub API error: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('Current branch state:', JSON.stringify(data, null, 2));

    // Update log with success
    await supabase
      .from('git_operations_logs')
      .insert({
        operation_type: 'push',
        status: 'completed',
        created_by: user.id,
        message: `Successfully pushed to ${branch}`
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully pushed to ${branch}`,
        data: data
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error in git-operations:', error);

    // Create Supabase client for error logging
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Log the error
    await supabase
      .from('git_operations_logs')
      .insert({
        operation_type: 'push',
        status: 'failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});