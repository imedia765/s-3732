import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface GitOperationRequest {
  operation: string;
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
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing');
      throw new Error('Supabase configuration missing');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

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
      console.error('GitHub token not found in secrets');
      throw new Error('GitHub token not configured in Edge Function secrets');
    }

    const { operation = 'push', branch = 'main', commitMessage = 'Force commit: Pushing all files to master' } = await req.json() as GitOperationRequest;

    // Log operation details
    console.log('Operation:', operation);
    console.log('Branch:', branch);
    console.log('Commit message:', commitMessage);

    // GitHub API endpoint
    const repoOwner = 'imedia765';
    const repoName = 's-935078';
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}`;

    console.log('Testing GitHub token...');
    
    // Test GitHub token with a simple API call
    const testResponse = await fetch('https://api.github.com/user', {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!testResponse.ok) {
      const errorText = await testResponse.text();
      console.error('GitHub token test failed:', errorText);
      throw new Error(`GitHub token validation failed: ${errorText}`);
    }

    console.log('GitHub token validated successfully');

    // Get the current commit SHA
    const refResponse = await fetch(`${apiUrl}/git/refs/heads/${branch}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!refResponse.ok) {
      const errorText = await refResponse.text();
      console.error('Failed to get current commit:', errorText);
      throw new Error(`Failed to get current commit: ${errorText}`);
    }

    const refData = await refResponse.json();
    console.log('Current commit SHA:', refData.object.sha);

    // Create a new tree
    const treeResponse = await fetch(`${apiUrl}/git/trees/${refData.object.sha}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!treeResponse.ok) {
      const errorText = await treeResponse.text();
      console.error('Failed to get tree:', errorText);
      throw new Error(`Failed to get tree: ${errorText}`);
    }

    const treeData = await treeResponse.json();
    console.log('Tree data:', treeData);

    // Create a new commit
    const commitResponse = await fetch(`${apiUrl}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: treeData.sha,
        parents: [refData.object.sha]
      })
    });

    if (!commitResponse.ok) {
      const errorText = await commitResponse.text();
      console.error('Failed to create commit:', errorText);
      throw new Error(`Failed to create commit: ${errorText}`);
    }

    const commitData = await commitResponse.json();
    console.log('New commit created:', commitData.sha);

    // Update the reference
    const updateRefResponse = await fetch(`${apiUrl}/git/refs/heads/${branch}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        sha: commitData.sha,
        force: true
      })
    });

    if (!updateRefResponse.ok) {
      const errorText = await updateRefResponse.text();
      console.error('Failed to update reference:', errorText);
      throw new Error(`Failed to update reference: ${errorText}`);
    }

    const updateRefData = await updateRefResponse.json();
    console.log('Reference updated:', updateRefData);

    // Log success in git_operations_logs
    await supabase
      .from('git_operations_logs')
      .insert({
        operation_type: operation,
        status: 'completed',
        created_by: user.id,
        message: `Successfully executed ${operation} operation on ${branch}`
      });

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully executed ${operation} operation on ${branch}`,
        data: updateRefData
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