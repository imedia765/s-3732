import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Git operation started');
    
    const githubToken = Deno.env.get('GITHUB_PAT');
    if (!githubToken) {
      console.error('GitHub token not found in secrets');
      throw new Error('GitHub token not configured in Edge Function secrets');
    }

    const { operation = 'push', branch = 'main', commitMessage = 'Force commit: Pushing all files to master' } = await req.json() as GitOperationRequest;

    console.log('Operation:', operation);
    console.log('Branch:', branch);
    console.log('Commit message:', commitMessage);

    const repoOwner = 'imedia765';
    const repoName = 's-935078';
    const apiUrl = `https://api.github.com/repos/${repoOwner}/${repoName}`;

    // Test GitHub token
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

    // Get the default branch reference
    const refResponse = await fetch(`${apiUrl}/git/refs/heads/${branch}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!refResponse.ok) {
      const errorText = await refResponse.text();
      console.error('Failed to get branch reference:', errorText);
      throw new Error(`Failed to get branch reference: ${errorText}`);
    }

    const refData = await refResponse.json();
    console.log('Current commit SHA:', refData.object.sha);

    // Get the commit to get its tree
    const commitResponse = await fetch(`${apiUrl}/git/commits/${refData.object.sha}`, {
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function'
      }
    });

    if (!commitResponse.ok) {
      const errorText = await commitResponse.text();
      console.error('Failed to get commit:', errorText);
      throw new Error(`Failed to get commit: ${errorText}`);
    }

    const commitData = await commitResponse.json();
    console.log('Current tree SHA:', commitData.tree.sha);

    // Create a new commit using the current tree
    const createCommitResponse = await fetch(`${apiUrl}/git/commits`, {
      method: 'POST',
      headers: {
        'Authorization': `token ${githubToken}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'Supabase-Edge-Function',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: commitMessage,
        tree: commitData.tree.sha,
        parents: [refData.object.sha]
      })
    });

    if (!createCommitResponse.ok) {
      const errorText = await createCommitResponse.text();
      console.error('Failed to create commit:', errorText);
      throw new Error(`Failed to create commit: ${errorText}`);
    }

    const newCommitData = await createCommitResponse.json();
    console.log('New commit created:', newCommitData.sha);

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
        sha: newCommitData.sha,
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