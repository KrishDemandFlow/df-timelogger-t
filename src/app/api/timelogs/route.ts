import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import type { Database } from '@/lib/supabase/database.types';

export async function GET() {
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

  const { data, error } = await supabase
    .from('TimeLogs')
    .select(`
      *,
      Clients(name, id)
    `)
    .order('start_time', { ascending: false });

  if (error) {
    console.error('Error fetching time logs:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch time logs' }), { status: 500 });
  }

  return NextResponse.json(data);
} 