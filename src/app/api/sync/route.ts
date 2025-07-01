import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { Database } from '@/lib/supabase/database.types';

export async function POST() {
  console.log('Sync API route called');
  
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('User authenticated:', !!user);

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Create a separate client with service role key for Edge Function invocation
  const supabaseServiceRole = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookies().get(name)?.value;
        },
      },
    }
  );

  try {
    console.log('Invoking Edge Function: sync-clickup-data');
    
    // Call the Edge Function to sync ClickUp data
    const { data, error } = await supabaseServiceRole.functions.invoke('sync-clickup-data');

    console.log('Edge Function response:', { data, error });

    if (error) {
      console.error('Error invoking sync function:', error);
      return new NextResponse(
        JSON.stringify({ 
          error: 'Failed to trigger sync', 
          details: error.message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const response = {
      message: 'Sync triggered successfully',
      result: data,
      timestamp: new Date().toISOString(),
    };

    console.log('Returning response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Sync API error:', error);
    
    // Handle timeout specifically
    if (error instanceof Error && error.message.includes('timeout')) {
      return new NextResponse(
        JSON.stringify({ 
          error: 'Sync operation timed out after 65 seconds',
          details: 'The sync process is taking longer than expected (>65s). Please check the logs or try again later.',
          message: 'Sync may still be running in the background'
        }),
        {
          status: 408, // Request Timeout
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    return new NextResponse(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 