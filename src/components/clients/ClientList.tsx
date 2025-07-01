import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import ClientCard from './ClientCard';

async function getClients() {
  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase.from('Clients').select('*');

  if (error) {
    console.error('Error fetching clients:', error);
    // In a real app, you'd want to handle this more gracefully
    return [];
  }
  return data;
}

export default async function ClientList() {
  const clients = await getClients();

  if (clients.length === 0) {
    return <p>No clients found. Add one to get started!</p>;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {clients.map((client) => (
        <ClientCard key={client.id} client={client} />
      ))}
    </div>
  );
} 