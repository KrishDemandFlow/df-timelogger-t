'use client';

import { useRouter } from 'next/navigation';
import TeamMemberForm from '@/components/team-members/TeamMemberForm';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function NewTeamMemberPage() {
  const router = useRouter();

  const handleSuccess = () => {
    router.push('/team-members');
  };

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

      <TeamMemberForm onSuccess={handleSuccess} />
    </div>
  );
} 