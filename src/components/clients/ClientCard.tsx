import type { Database } from '@/lib/supabase/database.types';

type Client = Database['public']['Tables']['Clients']['Row'];

interface ClientCardProps {
  client: Client;
}

export default function ClientCard({ client }: ClientCardProps) {
  return (
    <div className="p-2 bg-[#f2f2f2] border border-[#ebebeb] rounded-xl flex flex-col gap-2">
      <div className="bg-white rounded-lg px-4 py-3">
        <h2 className="text-lg font-semibold text-black bg-[#f3f3f3] p-1 rounded leading-none">{client.name}</h2>
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
       {/* TODO: Add edit/delete buttons */}
    </div>
  );
} 