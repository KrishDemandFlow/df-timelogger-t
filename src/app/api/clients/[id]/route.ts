import { createServerClient } from '@supabase/ssr';
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

export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json();
  const validation = clientSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse(JSON.stringify({ error: validation.error.format() }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('Clients')
    .update(validation.data)
    .eq('id', parseInt(params.id))
    .select()
    .single();

  if (error) {
    console.error('Error updating client:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update client' }), { status: 500 });
  }

  return NextResponse.json(data);
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  const cookieStore = cookies();
  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: any) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: any) {
          cookieStore.set({ name, value: '', ...options });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new NextResponse(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { error } = await supabase
    .from('Clients')
    .delete()
    .eq('id', parseInt(params.id));

  if (error) {
    console.error('Error deleting client:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete client' }), { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
} 