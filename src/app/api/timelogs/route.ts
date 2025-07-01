import { createRouteHandlerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { Database } from '@/lib/supabase/database.types';

export async function GET(request: Request) {
  const supabase = createRouteHandlerClient<Database>({ cookies });
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { searchParams } = new URL(request.url);
  const clientId = searchParams.get('client_id');
  const startDate = searchParams.get('start_date');
  const endDate = searchParams.get('end_date');

  let query = supabase
    .from('TimeLogs')
    .select(`
      *,
      Clients (
        id,
        name,
        clickup_list_id
      )
    `)
    .order('start_time', { ascending: false });

  // Apply filters if provided
  if (clientId) {
    query = query.eq('client_id', parseInt(clientId));
  }

  if (startDate) {
    query = query.gte('start_time', startDate);
  }

  if (endDate) {
    query = query.lte('start_time', endDate);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching time logs:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch time logs' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json(data);
} 