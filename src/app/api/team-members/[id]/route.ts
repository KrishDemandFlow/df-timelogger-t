import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { z } from 'zod';

import type { Database } from '@/lib/supabase/database.types';

const teamMemberSchema = z.object({
  username: z.string().min(2, 'Username must be at least 2 characters').max(50, 'Username must be less than 50 characters'),
  clickup_user_id: z.string().min(1, 'ClickUp User ID is required'),
});

export async function GET(request: Request, { params }: { params: { id: string } }) {
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
    .eq('id', parseInt(params.id))
    .single();

  if (error) {
    console.error('Error fetching team member:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch team member' }), { status: 500 });
  }

  return NextResponse.json(data);
}

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
  const validation = teamMemberSchema.safeParse(body);

  if (!validation.success) {
    return new NextResponse(JSON.stringify({ error: validation.error.format() }), { status: 400 });
  }

  const teamMemberId = parseInt(params.id);

  // Check if username already exists (excluding current user)
  const { data: existingUserByUsername, error: usernameError } = await supabase
    .from('ClickUpUsers')
    .select('id')
    .eq('username', validation.data.username)
    .neq('id', teamMemberId)
    .maybeSingle();

  if (usernameError) {
    console.error('Error checking username:', usernameError);
    return new NextResponse(JSON.stringify({ error: 'Failed to validate username' }), { status: 500 });
  }

  if (existingUserByUsername) {
    return new NextResponse(JSON.stringify({ error: 'Username already exists' }), { status: 400 });
  }

  // Check if ClickUp User ID already exists (excluding current user)
  const { data: existingUserByClickUpId, error: clickupIdError } = await supabase
    .from('ClickUpUsers')
    .select('id')
    .eq('clickup_user_id', validation.data.clickup_user_id)
    .neq('id', teamMemberId)
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
    .update(validation.data)
    .eq('id', teamMemberId)
    .select()
    .single();

  if (error) {
    console.error('Error updating team member:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to update team member' }), { status: 500 });
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

  const teamMemberId = parseInt(params.id);

  // Check if team member has recent time entries (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: teamMember, error: teamMemberError } = await supabase
    .from('ClickUpUsers')
    .select('clickup_user_id')
    .eq('id', teamMemberId)
    .single();

  if (teamMemberError) {
    console.error('Error fetching team member:', teamMemberError);
    return new NextResponse(JSON.stringify({ error: 'Failed to fetch team member' }), { status: 500 });
  }

  const { data: recentLogs, error: logsError } = await supabase
    .from('TimeLogs')
    .select('id')
    .eq('clickup_user_id', teamMember.clickup_user_id)
    .gte('start_time', thirtyDaysAgo.toISOString())
    .limit(1);

  if (logsError) {
    console.error('Error checking time logs:', logsError);
    return new NextResponse(JSON.stringify({ error: 'Failed to check team member dependencies' }), { status: 500 });
  }

  if (recentLogs && recentLogs.length > 0) {
    return new NextResponse(
      JSON.stringify({ error: 'Cannot delete team member with time entries from the last 30 days' }), 
      { status: 400 }
    );
  }

  const { error } = await supabase
    .from('ClickUpUsers')
    .delete()
    .eq('id', teamMemberId);

  if (error) {
    console.error('Error deleting team member:', error);
    return new NextResponse(JSON.stringify({ error: 'Failed to delete team member' }), { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
} 