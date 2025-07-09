'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Loader2 } from 'lucide-react';
import DeleteTeamMemberDialog from './DeleteTeamMemberDialog';
import type { Database } from '@/lib/supabase/database.types';

type TeamMember = Database['public']['Tables']['ClickUpUsers']['Row'];

interface TeamMemberCardProps {
  teamMember: TeamMember;
  onTeamMemberDeleted?: () => void;
}

export default function TeamMemberCard({ teamMember, onTeamMemberDeleted }: TeamMemberCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);

  const handleEdit = () => {
    setIsNavigating(true);
    router.push(`/team-members/${teamMember.id}/edit`);
  };

  const handleDeleteSuccess = () => {
    if (onTeamMemberDeleted) {
      onTeamMemberDeleted();
    } else {
      router.refresh();
    }
  };

  return (
    <>
      <div className="p-2 bg-[#f2f2f2] border border-[#ebebeb] rounded-xl">
        <div className="bg-white rounded-lg p-4 relative min-h-[120px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-semibold text-black rounded leading-none mb-3">
              {teamMember.username}
            </h2>
            <p className="text-sm text-gray-600">
              <span>ClickUp User ID:</span> {teamMember.clickup_user_id}
            </p>
          </div>

          <div className="flex items-center justify-start pt-4 border-t border-gray-200 mt-4 gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={handleEdit}
              disabled={isNavigating}
              className="h-8 w-8"
              title="Edit Team Member"
            >
              {isNavigating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setShowDeleteDialog(true)}
              className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
              title="Delete Team Member"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <DeleteTeamMemberDialog
        teamMember={teamMember}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
} 