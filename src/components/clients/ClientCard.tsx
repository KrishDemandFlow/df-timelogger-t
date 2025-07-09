'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Edit, Trash2, Eye, Loader2 } from 'lucide-react';
import DeleteClientDialog from './DeleteClientDialog';
import type { Database } from '@/lib/supabase/database.types';

type Client = Database['public']['Tables']['Clients']['Row'];

interface ClientCardProps {
  client: Client;
  onClientDeleted?: () => void;
}

export default function ClientCard({ client, onClientDeleted }: ClientCardProps) {
  const router = useRouter();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isNavigating, setIsNavigating] = useState<'view' | 'edit' | null>(null);

  const handleEdit = () => {
    setIsNavigating('edit');
    router.push(`/clients/${client.id}/edit`);
  };

  const handleViewDetails = () => {
    setIsNavigating('view');
    router.push(`/clients/${client.id}`);
  };

  const handleDeleteSuccess = () => {
    if (onClientDeleted) {
      onClientDeleted();
    } else {
      router.refresh();
    }
  };

  return (
    <>
      <div className="p-2 bg-[#f2f2f2] border border-[#ebebeb] rounded-xl flex flex-col gap-2">
        <div className="bg-white rounded-lg px-4 py-3">
          <h2 className="text-lg font-semibold text-black p-1 rounded leading-none">
            {client.name}
          </h2>
        </div>

        <div className="bg-white rounded-lg p-4 text-sm text-gray-700 space-y-1">
          <p>
            <span className="font-medium">ClickUp List ID:</span> {client.clickup_list_id}
          </p>
          <p>
            <span className="font-medium">Billing Cycle Starts:</span> Day {client.billing_cycle_start_day}
          </p>
          <p>
            <span className="font-medium">Weekly Hours:</span> {client.weekly_allocated_hours ?? '—'}
          </p>
        </div>

        <div className="flex flex-col gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            disabled={isNavigating === 'view'}
            className="w-full flex items-center gap-1"
          >
            {isNavigating === 'view' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
            View Details
          </Button>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleEdit}
              disabled={isNavigating === 'edit'}
              className="flex-1 flex items-center gap-1"
            >
              {isNavigating === 'edit' ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Edit className="h-4 w-4" />
              )}
              Edit
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowDeleteDialog(true)}
              className="flex-1 flex items-center gap-1 hover:bg-red-50 hover:text-red-600 hover:border-red-200"
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </Button>
          </div>
        </div>
      </div>

      <DeleteClientDialog
        client={client}
        isOpen={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
        onSuccess={handleDeleteSuccess}
      />
    </>
  );
} 