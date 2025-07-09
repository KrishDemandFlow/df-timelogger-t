'use client';

import { useRouter } from 'next/navigation';
import TeamMemberForm from '@/components/team-members/TeamMemberForm';
import type { Database } from '@/lib/supabase/database.types';

type TeamMember = Database['public']['Tables']['ClickUpUsers']['Row'];

interface EditTeamMemberFormProps {
  initialData: TeamMember;
}

export default function EditTeamMemberForm({ initialData }: EditTeamMemberFormProps) {
  const router = useRouter();

  const handleSuccess = () => {
    // Use window.location.href to force a full page reload and refresh data
    window.location.href = '/team-members';
  };

  return <TeamMemberForm initialData={initialData} onSuccess={handleSuccess} />;
} 