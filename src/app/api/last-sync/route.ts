import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { Database } from '@/lib/supabase/database.types';

export async function GET() {
  try {
    // Create Supabase client with authentication for reading sync logs
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

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Fetch the most recently created or updated time-log entry.
    const { data, error } = await supabase.rpc('get_latest_sync');

    if (error) {
      console.error('Error fetching last sync timestamp:', error);
      
      // Fallback: try querying sync_logs table directly
      const { data: fallbackData, error: fallbackError } = await supabase
        .from('sync_logs')
        .select('synced_at')
        .is('error_message', null)
        .order('synced_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      if (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
        return new NextResponse(
          JSON.stringify({ error: 'Failed to fetch last sync timestamp', details: error.message }),
          {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      
      const lastSynced = fallbackData?.synced_at ?? null;
      return NextResponse.json({ lastSynced });
    }

    const lastSynced = data ?? null;

    return NextResponse.json({ lastSynced });
  } catch (err) {
    console.error('Unhandled error in last-sync route:', err);
    return new NextResponse(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
} 