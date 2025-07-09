import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { Database } from '@/lib/supabase/database.types';

const teamMemberSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50, 'Username must be less than 50 characters'),
  clickup_user_id: z.string().min(1, 'ClickUp User ID is required'),
});

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
    .from('ClickUpUsers')
    .select('*')
    .order('username');

  if (error) {
    console.error('Error fetching team members:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch team members' }), { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: Request) {
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
  const validation = teamMemberSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse(JSON.stringify({ error: validation.error.format() }), { status: 400 });
  }

  // Check if username already exists
  const { data: existingUserByUsername, error: usernameError } = await supabase
    .from('ClickUpUsers')
    .select('id')
    .eq('username', validation.data.username)
    .maybeSingle();

  if (usernameError) {
    console.error('Error checking username:', usernameError);
    return new NextResponse(JSON.stringify({ error: 'Failed to validate username' }), { status: 500 });
  }

  if (existingUserByUsername) {
    return new NextResponse(JSON.stringify({ error: 'Username already exists' }), { status: 400 });
  }

  // Check if ClickUp User ID already exists
  const { data: existingUserByClickUpId, error: clickupIdError } = await supabase
    .from('ClickUpUsers')
    .select('id')
    .eq('clickup_user_id', validation.data.clickup_user_id)
    .maybeSingle();

  if (clickupIdError) {
    console.error('Error checking ClickUp User ID:', clickupIdError);
    return new NextResponse(JSON.stringify({ error: 'Failed to validate ClickUp User ID' }), { status: 500 });
  }

  if (existingUserByClickUpId) {
    return new NextResponse(JSON.stringify({ error: 'ClickUp User ID already exists' }), { status: 400 });
  }

  const { data, error } = await supabase
    .from('ClickUpUsers')
    .insert(validation.data)
    .select()
    .single();

  if (error) {
    console.error('Error creating team member:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to create team member' }), { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
} 