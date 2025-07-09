import { createSupabaseServerClient } from '@/lib/supabase/server';
import { redirect, notFound } from 'next/navigation';
import EditTeamMemberForm from './EditTeamMemberForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

interface EditTeamMemberPageProps {
  params: {
    id: string;
  };
}

export default async function EditTeamMemberPage({ params }: EditTeamMemberPageProps) {
  const supabase = createSupabaseServerClient();

  // Check authentication
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Fetch team member data
  const { data: teamMember, error } = await supabase
    .from('ClickUpUsers')
    .select('*')
    .eq('id', parseInt(params.id))
    .single();

  if (error || !teamMember) {
    notFound();
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <Button variant="outline" size="sm" asChild>
          <Link href="/team-members">
            <ArrowLeft className="h-4 w-4" />
            Back to Team Members
          </Link>
        </Button>
      </div>

      <EditTeamMemberForm initialData={teamMember} />
    </div>
  );
} 