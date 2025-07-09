'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertCircle, Loader2, Trash2 } from 'lucide-react';
import type { Database } from '@/lib/supabase/database.types';

type TeamMember = Database['public']['Tables']['ClickUpUsers']['Row'];

interface DeleteTeamMemberDialogProps {
  teamMember: TeamMember;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DeleteTeamMemberDialog({
  teamMember,
  isOpen,
  onClose,
  onSuccess,
}: DeleteTeamMemberDialogProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/team-members/${teamMember.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        onSuccess();
        onClose();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to delete team member');
      }
    } catch (error) {
      setError('Network error occurred');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleClose = () => {
    if (!isDeleting) {
      setError(null);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-4 mb-2">
            
            Delete Team Member
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to delete <strong>{teamMember.username}</strong>? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-yellow-200 bg-yellow-50 p-4">
          <div className="flex items-start gap-3">
            <div className="flex-1">
              
              <div className="text-sm text-yellow-700">
                <p>
                  This will permanently remove the team member from the system.
                </p>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-800">Error</p>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Deleting...
              </>
            ) : (
              <>
                Delete Team Member
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 