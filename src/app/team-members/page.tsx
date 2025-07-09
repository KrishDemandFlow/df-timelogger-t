import { createSupabaseServerClient } from '@/lib/supabase/server';
import TeamMemberList from '@/components/team-members/TeamMemberList';
import { redirect } from 'next/navigation';

export default async function TeamMembersPage() {
  const supabase = createSupabaseServerClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch all team members
  const { data: teamMembers, error } = await supabase
    .from('ClickUpUsers')
    .select('*')
    .order('username');

  if (error) {
    console.error('Error fetching team members:', error);
    throw new Error('Failed to fetch team members');
  }

  return (
    <div className="container mx-auto p-6">
      <TeamMemberList initialTeamMembers={teamMembers || []} />
    </div>
  );
} 