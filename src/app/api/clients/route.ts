import { createRouteHandlerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { Database } from '@/lib/supabase/database.types';

const clientSchema = z.object({
  name: z.string(),
  clickup_list_id: z.string(),
  billing_cycle_start_day: z.number(),
  weekly_allocated_hours: z.number(),
});

export async function POST(request: Request) {
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

  const body = await request.json();
  const validation = clientSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse(JSON.stringify({ error: validation.error.format() }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase
    .from('Clients')
    .insert(validation.data)
    .select()
    .single();

  if (error) {
    console.error('Error creating client:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create client' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json(data);
}

export async function GET() {
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

  const { data, error } = await supabase.from('Clients').select('*');

  if (error) {
     console.error('Error fetching clients:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch clients' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return NextResponse.json(data);
} 